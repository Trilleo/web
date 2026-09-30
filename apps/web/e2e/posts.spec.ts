import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Browser, type Page } from "@playwright/test";
import { adminPage, continueAs, freshLogin, newPage } from "./support";

// The admin's post editor. Tests share one database and may be retried, so every
// post gets a unique slug; nothing here uses words the writing spec searches for.

const unique = (base: string) => freshLogin(base);

interface NewPost {
  title: string;
  body?: string;
  description?: string;
  tags?: string;
  comments?: "Open" | "Closed" | "Off";
  /** A datetime-local value, e.g. "2099-01-01T09:00". */
  publishAt?: string;
}

/**
 * Waits for the editor island to hydrate: typing before that is lost when React
 * takes over the (controlled) fields.
 */
async function editorReady(page: Page) {
  await expect(page.locator("astro-island[ssr]")).toHaveCount(0);
}

/** Fills the editor for a new post; returns the slug it got. */
async function fillNewPost(admin: Page, post: NewPost): Promise<string> {
  await admin.goto("/admin/posts/new/");
  await editorReady(admin);
  await admin.getByLabel("Title").fill(post.title);
  await admin
    .getByLabel("Description")
    .fill(post.description ?? "A post written by the e2e tests.");
  if (post.tags) await admin.getByLabel("Tags").fill(post.tags);
  await admin
    .getByRole("textbox", { name: "Markdown" })
    .fill(post.body ?? "## First part\n\nSome words for the tests.");
  if (post.comments) {
    await admin
      .getByRole("radio", { name: post.comments })
      .check({ force: true });
  }
  if (post.publishAt) await admin.getByLabel("Publish at").fill(post.publishAt);
  return admin.getByLabel("Address").inputValue();
}

async function publishNewPost(admin: Page, post: NewPost): Promise<string> {
  const slug = await fillNewPost(admin, post);
  await admin.getByRole("button", { name: /^(Publish now|Schedule)$/ }).click();
  await expect(admin.getByText(/^(Published|Scheduled)\.$/)).toBeVisible();
  await editorReady(admin);
  return slug;
}

async function signedOut(browser: Browser, baseURL: string | undefined) {
  return newPage(browser, baseURL);
}

test("the admin writes, previews and publishes a post; readers find it", async ({
  browser,
  baseURL,
}) => {
  const admin = await adminPage(browser, baseURL);
  const title = unique("Editor test");
  await fillNewPost(admin, {
    title,
    tags: "E2E",
    body: "## Opening\n\nA *first* paragraph.[^n]\n\n[^n]: A note in the margin.\n",
  });

  // The slug follows the title; the preview is the server's rendering.
  await expect(admin.getByLabel("Address")).toHaveValue(
    title.toLowerCase().replace(/ /g, "-"),
  );
  const preview = admin.getByRole("region", { name: "Preview" });
  await expect(preview.getByRole("heading", { name: "Opening" })).toBeVisible();
  await expect(preview.locator("em")).toHaveText("first");

  await admin.getByRole("button", { name: "Publish now" }).click();
  await expect(admin.getByText("Published.", { exact: true })).toBeVisible();

  const reader = await signedOut(browser, baseURL);
  const slug = title.toLowerCase().replace(/ /g, "-");
  await reader.goto(`/writing/${slug}/`);
  await expect(
    reader.getByRole("heading", { level: 1, name: title }),
  ).toBeVisible();
  await expect(reader.locator(".prose section[data-footnotes]")).toContainText(
    "A note in the margin.",
  );
  await expect(reader.getByRole("link", { name: "Edit post" })).toHaveCount(0);

  await reader.goto("/writing/tags/e2e/");
  await expect(
    reader.getByRole("link", { name: new RegExp(title) }),
  ).toBeVisible();

  // The admin gets a way back to the editor from the post.
  await admin.goto(`/writing/${slug}/`);
  await admin.getByRole("link", { name: "Edit post" }).click();
  await expect(admin.getByLabel("Title")).toHaveValue(title);
});

test("a new slug keeps the old address as a redirect", async ({
  browser,
  baseURL,
}) => {
  const admin = await adminPage(browser, baseURL);
  const slug = await publishNewPost(admin, { title: unique("Rename test") });

  await admin.getByLabel("Address").fill(`${slug}-moved`);
  await admin.getByRole("button", { name: "Update" }).click();
  await expect(admin.getByText("Saved.", { exact: true })).toBeVisible();

  const reader = await signedOut(browser, baseURL);
  await reader.goto(`/writing/${slug}/`);
  await expect(reader).toHaveURL(`/writing/${slug}-moved/`);
});

test("drafts save themselves and stay private", async ({
  browser,
  baseURL,
}) => {
  const admin = await adminPage(browser, baseURL);
  const slug = await fillNewPost(admin, { title: unique("Autosave test") });
  // The first autosave creates the post and moves the editor to its address.
  await expect(admin).toHaveURL(/\/admin\/posts\/\d+\/$/);
  await expect(admin.getByText(/^Saved /)).toBeVisible();

  const reader = await signedOut(browser, baseURL);
  const response = await reader.goto(`/writing/${slug}/`);
  expect(response?.status()).toBe(404);

  await admin.goto("/admin/posts/");
  await expect(
    admin.getByRole("listitem").filter({ hasText: `/writing/${slug}/` }),
  ).toContainText("Draft");
});

test("a scheduled post waits, and a share link shows it early", async ({
  browser,
  baseURL,
}) => {
  const admin = await adminPage(browser, baseURL);
  const title = unique("Scheduled test");
  const slug = await fillNewPost(admin, {
    title,
    publishAt: "2099-01-01T09:00",
  });
  await admin.getByRole("button", { name: "Schedule" }).click();
  await expect(admin.getByText("Scheduled.", { exact: true })).toBeVisible();
  await expect(admin.getByText(/^Scheduled for /)).toBeVisible();

  const reader = await signedOut(browser, baseURL);
  expect((await reader.goto(`/writing/${slug}/`))?.status()).toBe(404);

  await admin.getByRole("button", { name: "Create share link" }).click();
  await expect(admin.getByText("Share link created.")).toBeVisible();
  const link = await admin.getByLabel("Share link").inputValue();
  expect(link).toMatch(/\/writing\/preview\/[\w-]{32}\/$/);

  const response = await reader.goto(link);
  expect(response?.headers()["x-robots-tag"]).toBe("noindex");
  await expect(
    reader.getByRole("heading", { level: 1, name: title }),
  ).toBeVisible();
  await expect(reader.getByRole("note")).toContainText("isn’t published yet");
  await expect(reader.locator("#comments")).toHaveCount(0);

  await admin.getByRole("button", { name: "Revoke link" }).click();
  await expect(admin.getByText(/Share link revoked/)).toBeVisible();
  expect((await reader.goto(link))?.status()).toBe(404);
});

test("comments can be closed or turned off per post", async ({
  browser,
  baseURL,
}) => {
  const admin = await adminPage(browser, baseURL);
  const closed = await publishNewPost(admin, {
    title: unique("Closed test"),
    comments: "Closed",
  });
  const off = await publishNewPost(admin, {
    title: unique("Off test"),
    comments: "Off",
  });

  const reader = await newPage(browser, baseURL);
  await reader.goto(`/writing/${closed}/`);
  await expect(reader.locator("#comments")).toContainText(
    "Comments are closed on this post.",
  );
  await expect(
    reader.getByRole("link", { name: "Sign in to comment" }),
  ).toHaveCount(0);

  await reader.goto(`/writing/${off}/`);
  await expect(reader.locator("#comments")).toHaveCount(0);

  // Posting anyway is refused.
  const response = await admin.request.post("/comments", {
    form: { post: closed, body: "Sneaking in." },
    headers: { Origin: new URL(baseURL ?? "").origin },
  });
  expect(response.status()).toBe(403);
});

test("the admin pins a comment to the top, and can unpin it", async ({
  browser,
  baseURL,
}) => {
  const admin = await adminPage(browser, baseURL);
  const slug = await publishNewPost(admin, { title: unique("Pin test") });
  const first = unique("first comment");
  const second = unique("second comment");

  for (const text of [first, second]) {
    await admin.goto(`/writing/${slug}/#comments`);
    await admin.getByLabel("Your comment").fill(text);
    await admin.getByRole("button", { name: "Post comment" }).click();
    await expect(
      admin.getByRole("article").filter({ hasText: text }),
    ).toBeVisible();
  }

  await admin
    .getByRole("article")
    .filter({ hasText: second })
    .getByRole("button", { name: "Pin to top" })
    .click();

  // Signed out, the pinned one comes first, marked.
  const reader = await newPage(browser, baseURL);
  await reader.goto(`/writing/${slug}/#comments`);
  const articles = reader.locator("#comments article");
  await expect(articles.first()).toContainText(second);
  await expect(articles.first()).toContainText("Pinned");
  await expect(reader.getByRole("button", { name: "Pin to top" })).toHaveCount(
    0,
  );
  for (const page of [reader, admin]) {
    const { violations } = await new AxeBuilder({ page })
      .include("#comments")
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "best-practice"])
      .analyze();
    expect(violations.map((v) => v.id)).toEqual([]);
  }

  await expect(
    admin.getByRole("article").filter({ hasText: second }).getByText("Pinned"),
  ).toBeVisible();
  await admin
    .getByRole("article")
    .filter({ hasText: second })
    .getByRole("button", { name: "Unpin" })
    .click();
  await expect(admin.locator("#comments article").first()).toContainText(first);
});

test("images dropped into the editor are uploaded and served", async ({
  browser,
  baseURL,
}) => {
  const admin = await adminPage(browser, baseURL);
  await fillNewPost(admin, { title: unique("Image test"), body: "" });

  // A 1×1 PNG.
  const png = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+ip1sAAAAASUVORK5CYII=",
    "base64",
  );
  await admin.locator('input[type="file"]').setInputFiles({
    name: "pixel.png",
    mimeType: "image/png",
    buffer: png,
  });
  await expect(admin.getByText("Image added.")).toBeVisible();
  const markdown = await admin
    .getByRole("textbox", { name: "Markdown" })
    .inputValue();
  const url = /\((\/media\/[0-9a-f]{64}\.png)\)/.exec(markdown)?.[1];
  expect(url).toBeDefined();

  const image = await admin.request.get(url ?? "");
  expect(image.headers()["content-type"]).toBe("image/png");
  expect(image.headers()["cache-control"]).toContain("immutable");
  await expect(
    admin
      .getByRole("region", { name: "Preview" })
      .locator(`img[src="${url ?? ""}"]`),
  ).toBeVisible();
});

test("unpublishing and deleting", async ({ browser, baseURL }) => {
  const admin = await adminPage(browser, baseURL);
  const slug = await publishNewPost(admin, { title: unique("Delete test") });
  const reader = await signedOut(browser, baseURL);
  expect((await reader.goto(`/writing/${slug}/`))?.status()).toBe(200);

  await admin.getByRole("button", { name: "Unpublish" }).click();
  await expect(admin.getByText(/Unpublished/)).toBeVisible();
  expect((await reader.goto(`/writing/${slug}/`))?.status()).toBe(404);

  await admin.getByText("Delete this post").click();
  await admin.getByRole("button", { name: "Yes, delete it" }).click();
  await expect(admin).toHaveURL("/admin/posts/?done=deleted");
  await expect(admin.getByText(`/writing/${slug}/`)).toHaveCount(0);
});

test("only the admin can use the editor", async ({ browser, baseURL }) => {
  const visitor = await newPage(browser, baseURL);
  await visitor.goto("/admin/posts/");
  await visitor.getByRole("link", { name: "Sign in with GitHub" }).click();
  await continueAs(visitor, freshLogin("nosy"));
  await expect(
    visitor.getByText("Only the site owner can see this page."),
  ).toBeVisible();

  const upload = await visitor.request.post("/admin/media/", {
    multipart: {
      file: { name: "x.png", mimeType: "image/png", buffer: Buffer.from("x") },
    },
    headers: { Origin: new URL(baseURL ?? "").origin },
  });
  expect(upload.status()).toBe(403);
});

test("the admin's post pages have no accessibility violations", async ({
  browser,
  baseURL,
}) => {
  const admin = await adminPage(browser, baseURL);
  for (const path of [
    "/admin/",
    "/admin/posts/",
    "/admin/posts/new/",
    "/admin/posts/2/",
  ]) {
    await admin.goto(path);
    await admin.evaluate(() => document.fonts.ready);
    const { violations } = await new AxeBuilder({ page: admin })
      .withTags([
        "wcag2a",
        "wcag2aa",
        "wcag21a",
        "wcag21aa",
        "wcag22aa",
        "best-practice",
      ])
      .analyze();
    expect(
      violations.map((v) => `${path}: ${v.id} (${v.impact ?? "?"})`),
    ).toEqual([]);
  }
});
