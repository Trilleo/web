import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { adminPage, continueAs, freshLogin, newPage } from "./support";

// Tests share one server and database, run in parallel, and may be retried on the
// same server. So each commenter is a fresh account, and every comment's text is
// unique to its test attempt; only the admin is shared (their comments skip review).

const postPath = (slug: string) => `/writing/${slug}/`;

let loads = 0;

/**
 * A post, freshly loaded, once its comments (a server island) are in. The query
 * string makes every visit a real navigation: going to the same URL and #hash
 * again would only scroll, leaving the comments as they were.
 */
async function openComments(page: Page, slug: string) {
  loads += 1;
  await page.goto(`${postPath(slug)}?load=${String(loads)}#comments`);
  await expect(
    page.locator("#comments").getByText("Loading comments…"),
  ).toHaveCount(0);
}

/** Signs in from a post's "Sign in to comment", ending back at its comments. */
async function signInToComment(page: Page, slug: string, user: string) {
  await openComments(page, slug);
  await page.getByRole("link", { name: "Sign in to comment" }).click();
  await continueAs(page, user);
  await expect(page).toHaveURL(`${postPath(slug)}#comments`);
  await expect(page.getByLabel("Your comment")).toBeVisible();
}

async function postComment(page: Page, text: string) {
  await page.getByLabel("Your comment").fill(text);
  await page.getByRole("button", { name: "Post comment" }).click();
}

const commentWith = (page: Page, text: string) =>
  page.getByRole("article").filter({ hasText: text });

/** The thread (a top-level comment and its replies) containing some text. */
const threadWith = (page: Page, text: string) =>
  page.locator("#comments li").filter({ hasText: text }).first();

/** An entry in one of /admin's lists ("Review", "Recent comments", "Blocked accounts"). */
const adminEntry = (admin: Page, list: RegExp, text: string) =>
  admin
    .getByRole("list", { name: list })
    .getByRole("listitem")
    .filter({ hasText: text });

test("a newcomer's first comment waits for approval; then they're trusted", async ({
  page,
  browser,
  baseURL,
}) => {
  const slug = "why-i-moved-off-wordpress";
  const me = freshLogin("newcomer");
  const first = `First comment from ${me}`;
  await signInToComment(page, slug, me);
  // The new-comment form's hint (reply forms have one too).
  await expect(page.locator("#comment-hint-new")).toContainText(
    "Your first comment appears once it’s approved.",
  );

  await postComment(page, first);
  await expect(page).toHaveURL(/#comment-\d+$/);
  await expect(
    commentWith(page, first).getByText("Awaiting approval"),
  ).toBeVisible();

  const stranger = await newPage(browser, baseURL);
  await openComments(stranger, slug);
  await expect(stranger.getByText(first)).toHaveCount(0);

  const admin = await adminPage(browser, baseURL);
  const queued = adminEntry(admin, /^Review/, first);
  await expect(queued.getByText("New commenter")).toBeVisible();
  await queued.getByRole("button", { name: "Approve" }).click();
  await expect(admin).toHaveURL("/admin#moderation");

  await openComments(stranger, slug);
  await expect(commentWith(stranger, first)).toBeVisible();
  await expect(
    commentWith(stranger, first).getByText("Awaiting approval"),
  ).toHaveCount(0);

  // Approved once, so the next comment is published straight away.
  const second = `Second comment from ${me}, published at once`;
  await openComments(page, slug);
  await postComment(page, second);
  await expect(commentWith(page, second)).toBeVisible();
  await expect(
    commentWith(page, second).getByText("Awaiting approval"),
  ).toHaveCount(0);

  await stranger.context().close();
  await admin.context().close();
});

test("formatting works, typed HTML stays text, and replies join the thread", async ({
  page,
}) => {
  const slug = "self-hosting-on-a-small-server";
  const tag = freshLogin("formatting");
  await signInToComment(page, slug, "admin");
  await postComment(
    page,
    `Check ${tag}: **bold**, \`code\` and <script>window.hacked = 1</script> https://example.com/x`,
  );

  const top = commentWith(page, `Check ${tag}`);
  await expect(top.locator("strong")).toHaveText("bold");
  await expect(top.locator("code")).toHaveText("code");
  await expect(
    top.getByText("<script>window.hacked = 1</script>"),
  ).toBeVisible();
  expect(await page.evaluate(() => "hacked" in window)).toBe(false);
  await expect(
    top.getByRole("link", { name: "https://example.com/x" }),
  ).toHaveAttribute("rel", "nofollow ugc noopener noreferrer");

  const thread = threadWith(page, `Check ${tag}`);
  await thread.getByText("Reply", { exact: true }).click();
  await thread.getByLabel("Your reply").fill(`Reply to ${tag}`);
  await thread.getByRole("button", { name: "Post reply" }).click();

  await expect(
    threadWith(page, `Check ${tag}`)
      .getByRole("list", { name: "Replies" })
      .getByText(`Reply to ${tag}`),
  ).toBeVisible();
});

test("deleting a comment with replies leaves a note; without, it's gone", async ({
  page,
}) => {
  const slug = "a-home-for-small-tools";
  const tag = freshLogin("deleting");
  await signInToComment(page, slug, "admin");
  await postComment(page, `Thread ${tag}`);
  const thread = threadWith(page, `Thread ${tag}`);
  await thread.getByText("Reply", { exact: true }).click();
  await thread.getByLabel("Your reply").fill(`Surviving reply ${tag}`);
  await thread.getByRole("button", { name: "Post reply" }).click();

  const top = commentWith(page, `Thread ${tag}`);
  await top.getByText("Delete", { exact: true }).click();
  await top.getByRole("button", { name: "Yes, delete this comment" }).click();

  const left = threadWith(page, `Surviving reply ${tag}`);
  await expect(left.getByText("This comment has been removed.")).toBeVisible();
  await expect(page.getByText(`Thread ${tag}`)).toHaveCount(0);

  const reply = commentWith(page, `Surviving reply ${tag}`);
  await reply.getByText("Delete", { exact: true }).click();
  await reply.getByRole("button", { name: "Yes, delete this comment" }).click();
  await expect(page.getByText(`Surviving reply ${tag}`)).toHaveCount(0);
});

test("people see and delete their comments on /account", async ({ page }) => {
  const me = freshLogin("deleter");
  await signInToComment(page, "a-home-for-small-tools", me);
  await postComment(page, `Deleted from the account page by ${me}`);

  await page.goto("/account");
  const listed = page
    .locator("#comments li")
    .filter({ hasText: `Deleted from the account page by ${me}` });
  await expect(listed.getByText("Awaiting approval")).toBeVisible();
  await listed.getByText("Delete", { exact: true }).click();
  await listed
    .getByRole("button", { name: "Yes, delete this comment" })
    .click();

  await expect(page).toHaveURL("/account#comments");
  await expect(page.getByText("You haven’t commented yet.")).toBeVisible();
});

test("blocking an account hides its comments and keeps it out", async ({
  page,
  browser,
  baseURL,
}) => {
  const slug = "a-home-for-small-tools";
  const me = freshLogin("spammer");
  const spam = `Cheap watches from ${me}`;
  await signInToComment(page, slug, me);
  await postComment(page, spam);

  const admin = await adminPage(browser, baseURL);
  await adminEntry(admin, /^Review/, spam)
    .getByRole("button", { name: `Block @${me}` })
    .click();
  await expect(adminEntry(admin, /^Blocked accounts/, `@${me}`)).toBeVisible();

  // Signed out on the spot, and can't sign back in.
  await openComments(page, slug);
  await expect(page.getByText(spam)).toHaveCount(0);
  await page.getByRole("link", { name: "Sign in to comment" }).click();
  await continueAs(page, me);
  await expect(page.getByRole("alert")).toHaveText(
    "That GitHub account can’t sign in here.",
  );

  await adminEntry(admin, /^Blocked accounts/, `@${me}`)
    .getByRole("button", { name: "Unblock" })
    .click();
  await expect(adminEntry(admin, /^Blocked accounts/, `@${me}`)).toHaveCount(0);
  await signInToComment(page, slug, me);

  await admin.context().close();
});

test("refused comments explain why and keep the text", async ({ page }) => {
  const slug = "rebuilding-this-site";
  const me = freshLogin("chatty");
  await signInToComment(page, slug, me);
  for (const n of [1, 2, 3]) {
    await openComments(page, slug);
    await postComment(page, `Comment ${String(n)} from ${me}`);
  }
  await openComments(page, slug);
  await postComment(page, `One too many from ${me}`);

  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Not posted.",
  );
  await expect(page.getByRole("alert")).toContainText(
    "3 comments waiting for review",
  );
  await expect(page.getByLabel("Your comment")).toHaveValue(
    `One too many from ${me}`,
  );
  await page.getByRole("link", { name: /^Back to “/ }).click();
  await expect(page).toHaveURL(`${postPath(slug)}#comments`);
});

test("deleting your account removes it and your comments", async ({
  page,
  browser,
  baseURL,
}) => {
  const me = freshLogin("leaver");
  const text = `Written by ${me}, about to leave`;
  await signInToComment(page, "rebuilding-this-site", me);
  await postComment(page, text);

  await page.goto("/account");
  await expect(page.getByText(text)).toBeVisible();
  await page
    .getByLabel("I understand: delete my account and comments.")
    .check();
  await page.getByRole("button", { name: "Delete my account" }).click();

  await expect(page).toHaveURL("/sign-in?account-deleted=1");
  await expect(page.getByRole("status")).toHaveText(
    "Your account and comments have been deleted.",
  );
  const admin = await adminPage(browser, baseURL);
  await expect(admin.getByText(text)).toHaveCount(0);
  await admin.context().close();
});

test("comments are never cached, since they depend on who's looking", async ({
  page,
}) => {
  const island = page.waitForResponse((response) =>
    response.url().includes("/_server-islands/"),
  );
  await page.goto(postPath("rebuilding-this-site"));
  const response = await island;
  expect(response.status()).toBe(200);
  expect(response.headers()["cache-control"]).toBe("private, no-store");
});

test("the comment form and account page have no accessibility violations", async ({
  page,
}) => {
  const scan = async () => {
    await page.evaluate(() => document.fonts.ready);
    const { violations } = await new AxeBuilder({ page })
      .withTags([
        "wcag2a",
        "wcag2aa",
        "wcag21a",
        "wcag21aa",
        "wcag22aa",
        "best-practice",
      ])
      .analyze();
    expect(violations.map((violation) => violation.id)).toEqual([]);
  };

  await signInToComment(
    page,
    "self-hosting-on-a-small-server",
    freshLogin("reader"),
  );
  await scan();
  await page.goto("/account");
  await scan();
});
