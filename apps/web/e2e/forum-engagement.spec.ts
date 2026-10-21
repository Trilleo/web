import AxeBuilder from "@axe-core/playwright";
import { randomBytes } from "node:crypto";
import { expect, test, type Page } from "@playwright/test";
import { adminPage, continueAs, freshLogin, newPage } from "./support";

// Each test makes its own forum (nothing waits for approval there), so fresh
// accounts post at once and other specs' forums keep their layouts.

const unique = (text: string) => `${text} ${randomBytes(3).toString("hex")}`;

async function signIn(page: Page, user: string, next = "/forum/") {
  await page.goto(`/sign-in?next=${encodeURIComponent(next)}`);
  await page.getByRole("link", { name: "Sign in with GitHub" }).click();
  await continueAs(page, user);
}

/** The admin makes a forum in Community with a layout; returns its address. */
async function makeForum(
  admin: Page,
  layout: string,
): Promise<{ slug: string; name: string }> {
  const name = unique(`${layout} forum`);
  await admin.goto("/admin/forum/");
  await admin.getByRole("link", { name: "Add a forum in Community" }).click();
  await admin.getByLabel("Name").fill(name);
  await admin.getByLabel(layout, { exact: true }).check();
  await admin.getByLabel("Nothing waits").check();
  await admin.getByRole("button", { name: "Create forum" }).click();
  await expect(admin.getByRole("status")).toHaveText("Created.");
  const href =
    (await admin.getByRole("link", { name: "View it" }).getAttribute("href")) ??
    "";
  return { slug: href.split("/").filter(Boolean).at(-1) ?? "", name };
}

async function startTopic(
  page: Page,
  forum: string,
  title: string,
  body: string,
  button = "Post topic",
) {
  await page.goto(`/forum/new/?in=${forum}`);
  await page.getByLabel("Title").fill(title);
  await page.getByLabel("Your post").fill(body);
  await page.getByRole("button", { name: button }).click();
  await expect(
    page.getByRole("heading", { level: 1, name: title }),
  ).toBeVisible();
  return page.url().split("#")[0] ?? "";
}

const post = (page: Page, text: string) =>
  page.getByRole("article").filter({ hasText: text });

test("questions get answers, votes and an accepted answer", async ({
  browser,
  baseURL,
}) => {
  const admin = await adminPage(browser, baseURL);
  const forum = await makeForum(admin, "Questions & answers");

  const asker = await newPage(browser, baseURL);
  await signIn(asker, freshLogin("forum-asker"));
  const title = unique("How do comparators work");
  const topicUrl = await startTopic(
    asker,
    forum.slug,
    title,
    "I'm stuck.",
    "Ask question",
  );

  const helper = await newPage(browser, baseURL);
  await signIn(helper, freshLogin("forum-helper"), topicUrl);
  await helper.goto(topicUrl);
  await helper.getByLabel("Your answer").fill("They compare signal strengths.");
  await helper.getByRole("button", { name: "Post answer" }).click();
  await expect(post(helper, "They compare signal strengths.")).toBeVisible();

  await asker.goto(topicUrl);
  const answer = post(asker, "They compare signal strengths.");
  await answer.getByRole("button", { name: "Vote up" }).click();
  await expect(
    post(asker, "They compare signal strengths.").getByLabel("Score 1"),
  ).toBeVisible();
  await post(asker, "They compare signal strengths.")
    .getByRole("button", { name: "Accept this answer" })
    .click();
  await expect(
    post(asker, "They compare signal strengths.").getByText("Accepted answer"),
  ).toBeVisible();
  // Accepting marks the topic solved.
  await expect(
    asker.getByRole("button", { name: "Mark not solved" }),
  ).toBeVisible();

  // The helper hears about it, and earns the badge.
  await helper.goto("/account/notifications/");
  await expect(helper.getByTestId("notifications")).toContainText(
    "accepted your answer",
  );
  {
    const { violations } = await new AxeBuilder({ page: helper }).analyze();
    expect(violations.map((v) => v.id)).toEqual([]);
  }
  await helper.goto("/account/");
  await helper.getByRole("link", { name: "Your forum page" }).click();
  await expect(helper.getByText("Accepted answers")).toBeVisible();
  await expect(
    helper
      .getByRole("listitem")
      .filter({ hasText: "Helpful" })
      .getByText("(not yet earned)"),
  ).toHaveCount(0);
  {
    const { violations } = await new AxeBuilder({ page: helper }).analyze();
    expect(violations.map((v) => v.id)).toEqual([]);
  }
});

test("threaded replies nest under what they answer", async ({
  browser,
  baseURL,
}) => {
  const admin = await adminPage(browser, baseURL);
  const forum = await makeForum(admin, "Threaded");
  const topicUrl = await startTopic(
    admin,
    forum.slug,
    unique("Threads"),
    "Start here.",
  );
  await admin.getByLabel("Your reply").fill("A top-level reply.");
  await admin.getByRole("button", { name: "Post reply" }).click();
  await post(admin, "A top-level reply.")
    .getByRole("link", { name: "Reply", exact: true })
    .click();
  await expect(admin.getByText("Replying to @site-owner")).toBeVisible();
  await admin.getByLabel("Your reply").fill("A nested answer.");
  await admin.getByRole("button", { name: "Post reply" }).click();
  await admin.goto(topicUrl);
  await expect(post(admin, "A nested answer.")).toHaveAttribute(
    "data-depth",
    "2",
  );
  await expect(post(admin, "A top-level reply.")).toHaveAttribute(
    "data-depth",
    "1",
  );
});

test("reactions update in place and reach the author", async ({
  browser,
  baseURL,
}) => {
  const admin = await adminPage(browser, baseURL);
  const forum = await makeForum(admin, "Classic");
  const author = await newPage(browser, baseURL);
  const authorLogin = freshLogin("forum-reacted");
  await signIn(author, authorLogin);
  const topicUrl = await startTopic(
    author,
    forum.slug,
    unique("React to this"),
    "Something nice.",
  );

  const fan = await newPage(browser, baseURL);
  await signIn(fan, freshLogin("forum-fan"), topicUrl);
  await fan.goto(topicUrl);
  await fan.waitForLoadState("load");
  const liked = post(fan, "Something nice.");
  await liked.getByText("React", { exact: true }).click();
  await liked.getByRole("button", { name: "Celebrate" }).click();
  const pill = liked.getByRole("button", { name: /^Celebrate: 1/ });
  await expect(pill).toBeVisible();
  await expect(pill).toHaveAttribute("aria-pressed", "true");
  // Taking it back.
  await pill.click();
  await expect(
    liked.getByRole("button", { name: /^Celebrate: 0/ }),
  ).toBeHidden();
  await liked.getByText("React", { exact: true }).click();
  await liked.getByRole("button", { name: "Love" }).click();
  await expect(liked.getByRole("button", { name: /^Love: 1/ })).toBeVisible();

  await author.goto("/account/notifications/");
  await expect(author.getByTestId("notifications")).toContainText(
    "reacted to your post",
  );
  // The account menu counts what's unread.
  await author.locator("summary", { hasText: "Account menu for" }).click();
  await expect(
    author.getByRole("link", { name: /^Notifications \(\d+\)$/ }),
  ).toBeVisible();
  await author.getByRole("button", { name: "Mark all read" }).click();
  await expect(author.getByText("0 unread")).toBeVisible();
});

test("watchers hear about replies, and see what's unread", async ({
  browser,
  baseURL,
}) => {
  const admin = await adminPage(browser, baseURL);
  const forum = await makeForum(admin, "Classic");
  const watcher = await newPage(browser, baseURL);
  await signIn(watcher, freshLogin("forum-watcher"), `/forum/${forum.slug}/`);
  await watcher.goto(`/forum/${forum.slug}/`);
  await watcher.getByRole("button", { name: "Watch", exact: true }).click();
  await expect(
    watcher.getByRole("button", { name: "Stop watching" }),
  ).toBeVisible();

  const title = unique("Fresh news");
  const topicUrl = await startTopic(
    admin,
    forum.slug,
    title,
    "Read all about it.",
  );
  await watcher.goto("/account/notifications/");
  await expect(watcher.getByTestId("notifications")).toContainText(title);

  await watcher.goto("/forum/unread/");
  await expect(watcher.getByRole("link", { name: title })).toBeVisible();
  {
    const { violations } = await new AxeBuilder({ page: watcher }).analyze();
    expect(violations.map((v) => v.id)).toEqual([]);
  }
  await watcher.goto(topicUrl);
  await watcher.goto("/forum/unread/");
  await expect(watcher.getByRole("link", { name: title })).toHaveCount(0);

  await watcher.goto("/account/forum/");
  await watcher.getByLabel("A weekly digest").check();
  await watcher.getByLabel("Shown under your posts").fill("Watching closely.");
  await watcher.getByRole("button", { name: "Save", exact: true }).click();
  await expect(watcher.getByRole("status")).toHaveText("Saved.");
  await expect(watcher.getByTestId("watches")).toContainText(forum.name);
  {
    const { violations } = await new AxeBuilder({ page: watcher }).analyze();
    expect(violations.map((v) => v.id)).toEqual([]);
  }
});

test("drafts survive a reload, and topics carry tags", async ({
  browser,
  baseURL,
}) => {
  const admin = await adminPage(browser, baseURL);
  const forum = await makeForum(admin, "Classic");
  await admin.goto(`/forum/new/?in=${forum.slug}`);
  await admin.waitForLoadState("load");
  const title = unique("Drafted");
  await admin.getByLabel("Title").fill(title);
  await admin.getByLabel("Your post").fill("Half **written**.");
  await expect(admin.getByText("Draft saved")).toBeVisible();
  // The live preview follows the text.
  await expect(
    admin.getByRole("region", { name: "Live preview" }).locator("strong"),
  ).toHaveText("written");

  await admin.reload();
  await admin.getByRole("button", { name: "Continue your draft" }).click();
  await expect(admin.getByLabel("Title")).toHaveValue(title);
  await expect(admin.getByLabel("Your post")).toHaveValue("Half **written**.");
  const tag = `tag${randomBytes(3).toString("hex")}`;
  await admin.getByLabel("Tags (optional)").fill(`${tag}, help`);
  await admin.getByRole("button", { name: "Post topic" }).click();
  await admin.getByRole("link", { name: `#${tag}` }).click();
  await expect(
    admin.getByRole("heading", { level: 1, name: `#${tag}` }),
  ).toBeVisible();
  await expect(admin.getByRole("link", { name: title })).toBeVisible();

  // The draft went with posting.
  await admin.goto(`/forum/new/?in=${forum.slug}`);
  await admin.waitForLoadState("load");
  await expect(
    admin.getByRole("button", { name: "Continue your draft" }),
  ).toHaveCount(0);
});

test("feeds and the sitemap list public topics", async ({
  request,
  browser,
  baseURL,
}) => {
  const admin = await adminPage(browser, baseURL);
  const title = unique("Feedable");
  const topicUrl = await startTopic(admin, "general", title, "For readers.");
  const feed = await request.get("/forum/rss.xml");
  expect(feed.headers()["content-type"]).toContain("xml");
  expect(await feed.text()).toContain(title);
  expect(
    await (await request.get(`${new URL(topicUrl).pathname}rss.xml`)).text(),
  ).toContain("For readers.");
  expect(await (await request.get("/sitemap-forum.xml")).text()).toContain(
    new URL(topicUrl).pathname,
  );
  expect(await (await request.get("/robots.txt")).text()).toContain(
    "sitemap-forum.xml",
  );
  expect(await (await request.get("/llms.txt")).text()).toContain("## Forum");

  // Structured data and a share card on the topic.
  await admin.goto(topicUrl);
  const jsonLd = await admin
    .locator('script[type="application/ld+json"]')
    .allTextContents();
  expect(jsonLd.join("")).toContain("DiscussionForumPosting");
  const image = await admin
    .locator('meta[property="og:image"]')
    .getAttribute("content");
  expect(image).toMatch(/\/og\/forum\/\d+\.png\?v=/);
  const png = await request.get(
    new URL(image ?? "").pathname + new URL(image ?? "").search,
  );
  expect(png.headers()["content-type"]).toBe("image/png");
});
