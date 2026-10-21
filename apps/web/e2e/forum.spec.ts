import AxeBuilder from "@axe-core/playwright";
import { randomBytes } from "node:crypto";
import { expect, test, type Page } from "@playwright/test";
import { adminPage, continueAs, freshLogin, newPage } from "./support";

// Tests share one server and database and may be retried: every poster is a fresh
// account and every title is unique to its attempt. The admin is shared (their
// posts skip review) and only ever touches what their own test made.

const unique = (text: string) => `${text} ${randomBytes(3).toString("hex")}`;

/** Signs in from wherever the page sent us to /sign-in, as `user`. */
async function signIn(page: Page, user: string) {
  await page.getByRole("link", { name: "Sign in with GitHub" }).click();
  await continueAs(page, user);
}

async function startTopic(
  page: Page,
  forum: string,
  title: string,
  body: string,
) {
  await page.goto(`/forum/new/?in=${forum}`);
  await page.getByLabel("Title").fill(title);
  await page.getByLabel("Your post").fill(body);
  await page.getByRole("button", { name: "Post topic" }).click();
  await expect(
    page.getByRole("heading", { level: 1, name: title }),
  ).toBeVisible();
}

const post = (page: Page, text: string) =>
  page.getByRole("article").filter({ hasText: text });

test("a newcomer's topic waits for approval, then everyone sees it", async ({
  page,
  browser,
  baseURL,
}) => {
  const title = unique("Hello from a newcomer");
  await page.goto("/forum/new/?in=general");
  await signIn(page, freshLogin("forum-newcomer"));
  await expect(page).toHaveURL("/forum/new/?in=general");
  await expect(
    page.getByText("A moderator will look at your topic"),
  ).toBeVisible();
  await page.getByLabel("Title").fill(title);
  await page.getByLabel("Your post").fill("I just **joined**.");
  // Preview first: the text comes back rendered, the form keeps it.
  await page.getByRole("button", { name: "Preview" }).click();
  await expect(page.locator(".forum-body strong")).toHaveText("joined");
  await page.getByRole("button", { name: "Post topic" }).click();
  await expect(
    page.getByRole("heading", { level: 1, name: title }),
  ).toBeVisible();
  await expect(page.getByText("Awaiting approval").first()).toBeVisible();
  const topicUrl = page.url();

  // A visitor sees neither the topic nor its page.
  const visitor = await newPage(browser, baseURL);
  await visitor.goto("/forum/general/");
  await expect(visitor.getByRole("link", { name: title })).toHaveCount(0);
  expect((await visitor.goto(topicUrl))?.status()).toBe(404);

  // The admin approves it from the queue.
  const admin = await adminPage(browser, baseURL);
  // Old links to the admin's queue lead to the moderators' page.
  await admin.goto("/admin/forum/?tab=waiting");
  await expect(admin).toHaveURL("/forum/moderate/");
  const queued = admin.getByTestId("forum-queue").getByRole("listitem").filter({
    hasText: title,
  });
  await queued.getByRole("button", { name: "Approve" }).click();
  await expect(admin.getByTestId("forum-queue").getByText(title)).toHaveCount(
    0,
  );

  await visitor.goto("/forum/general/");
  await expect(visitor.getByRole("link", { name: title })).toBeVisible();
  await visitor.goto(topicUrl);
  await expect(
    visitor.getByRole("heading", { level: 1, name: title }),
  ).toBeVisible();
});

test("members quote, edit and delete their replies", async ({
  page,
  browser,
  baseURL,
}) => {
  const admin = await adminPage(browser, baseURL);
  const title = unique("Quoting test");
  await startTopic(admin, "help", title, "The original point.");
  const topicUrl = admin.url().split("#")[0] ?? "";

  await page.goto(topicUrl);
  await page.getByRole("link", { name: "Sign in to reply" }).click();
  await signIn(page, freshLogin("forum-replier"));
  await expect(page).toHaveURL(`${topicUrl}#reply`);

  await post(page, "The original point.")
    .getByRole("link", { name: "Quote" })
    .click();
  const reply = page.getByLabel("Your reply");
  await expect(reply).toHaveValue(
    /^> \*\*\[@site-owner wrote\]\(\/forum\/post\/\d+\/\):\*\*\n> The original point\./,
  );
  await reply.press("End");
  await reply.pressSequentially("I agree.");
  await page.getByRole("button", { name: "Post reply" }).click();

  // Their reply waits (a newcomer), but they see it, quote and all.
  const mine = post(page, "I agree.");
  await expect(mine.getByText("Awaiting approval")).toBeVisible();
  await expect(mine.locator("blockquote")).toContainText("The original point.");

  await mine.getByRole("link", { name: "Edit" }).click();
  await page.getByLabel("Your post").fill("I agree, mostly.");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(
    post(page, "I agree, mostly.").getByText(/^Edited/),
  ).toBeVisible();

  const edited = post(page, "I agree, mostly.");
  await edited.getByText("Delete", { exact: true }).click();
  await edited.getByRole("button", { name: "Yes, delete this post" }).click();
  await expect(page.getByText("I agree, mostly.")).toHaveCount(0);

  const { violations } = await new AxeBuilder({ page }).analyze();
  expect(violations.map((v) => v.id)).toEqual([]);
});

test("moderators lock and pin topics", async ({ browser, baseURL }) => {
  const admin = await adminPage(browser, baseURL);
  const title = unique("Locked topic");
  await startTopic(admin, "general", title, "No more replies, please.");
  const topicUrl = admin.url().split("#")[0] ?? "";

  const moderate = admin.getByRole("group", { name: "Moderate this topic" });
  await moderate.getByRole("button", { name: "Lock" }).click();
  await expect(moderate.getByRole("button", { name: "Unlock" })).toBeVisible();
  await moderate.getByLabel("Pin").selectOption("pin-global");
  await moderate.getByRole("button", { name: "Set" }).click();
  await expect(admin.getByText("Announcement", { exact: true })).toBeVisible();

  const visitor = await newPage(browser, baseURL);
  await visitor.goto("/forum/");
  await expect(
    visitor
      .getByRole("region", { name: "Announcements" })
      .getByRole("link", { name: title }),
  ).toBeVisible();
  // Signed in, a member can't reply to a locked topic.
  await visitor.goto(topicUrl);
  await visitor.getByRole("link", { name: "Sign in to reply" }).click();
  await signIn(visitor, freshLogin("forum-locked"));
  await expect(
    visitor.getByText("This topic is locked: no new replies."),
  ).toBeVisible();

  // Unpinned again, so other tests' index stays tidy.
  await admin.goto(topicUrl);
  await moderate.getByLabel("Pin").selectOption("pin-none");
  await moderate.getByRole("button", { name: "Set" }).click();
  await expect(admin.getByText("Announcement", { exact: true })).toHaveCount(0);
});

test("the admin builds the forum's tree", async ({ browser, baseURL }) => {
  const admin = await adminPage(browser, baseURL);
  const name = unique("Off topic");
  await admin.goto("/admin/forum/");
  await admin.getByRole("link", { name: "Add a forum in Community" }).click();
  await admin.getByLabel("Name").fill(name);
  await admin.getByLabel("Description").fill("Anything goes.");
  await admin.getByRole("button", { name: "Create forum" }).click();
  await expect(admin.getByRole("status")).toHaveText("Created.");

  await admin.goto("/admin/forum/");
  await admin.getByRole("button", { name: `Move ${name} up` }).click();
  await expect(admin.getByRole("status")).toHaveText("Moved.");

  await admin.goto("/forum/");
  const community = admin.getByRole("region", { name: "Community" });
  await expect(community.getByRole("link", { name })).toBeVisible();
  await community.getByRole("link", { name }).click();
  await expect(admin.getByRole("heading", { level: 1, name })).toBeVisible();
  await expect(
    admin.getByText("No topics yet. Start the first one."),
  ).toBeVisible();

  await admin.getByRole("link", { name: "Edit forum" }).click();
  await admin.getByLabel(`Yes, delete ${name}.`).check();
  await admin.getByRole("button", { name: "Delete" }).click();
  await expect(admin.getByRole("status")).toHaveText("Deleted.");
  await admin.goto("/forum/");
  await expect(admin.getByRole("link", { name })).toHaveCount(0);
});

test("search finds topics by their posts", async ({
  page,
  browser,
  baseURL,
}) => {
  const admin = await adminPage(browser, baseURL);
  const word = `zebra${randomBytes(3).toString("hex")}`;
  const title = unique("Searchable");
  await startTopic(admin, "help", title, `This mentions ${word} once.`);

  await page.goto("/forum/");
  await page.getByLabel("Search the forum").fill(word);
  await page.getByRole("button", { name: "Search" }).click();
  await expect(page).toHaveURL(`/forum/search/?q=${word}`);
  const results = page.getByTestId("search-results");
  await expect(results.getByRole("link", { name: title })).toBeVisible();
  await expect(results).toContainText(word);
});

/** The admin opens a forum's admin page from the tree. */
async function openForumAdmin(admin: Page, name: string) {
  await admin.goto("/admin/forum/");
  await admin
    .getByTestId("admin-forum-tree")
    .getByRole("link", { name, exact: true })
    .click();
  await expect(admin.getByRole("heading", { level: 1, name })).toBeVisible();
}

test("an assigned moderator moderates their forum, bans, and reads reports", async ({
  page,
  browser,
  baseURL,
}) => {
  const admin = await adminPage(browser, baseURL);
  const moderatorLogin = freshLogin("forum-mod");
  // Sign the moderator in once, so their account exists.
  await page.goto("/forum/");
  await page.getByRole("link", { name: "Sign in to post" }).click();
  await signIn(page, moderatorLogin);

  await openForumAdmin(admin, "Help & feedback");
  await admin.getByLabel("Assign someone").fill(moderatorLogin);
  await admin.getByRole("button", { name: "Assign" }).click();
  await expect(admin.getByTestId("forum-moderators")).toContainText(
    `@${moderatorLogin}`,
  );

  // A newcomer posts in Help; another member reports it.
  const author = await newPage(browser, baseURL);
  const title = unique("Spammy topic");
  await author.goto("/forum/new/?in=help");
  await signIn(author, freshLogin("forum-spammer"));
  await author.getByLabel("Title").fill(title);
  await author.getByLabel("Your post").fill("Buy my things.");
  await author.getByRole("button", { name: "Post topic" }).click();
  const topicUrl = author.url().split("#")[0] ?? "";

  // The moderator's menu leads to the queue, which has it.
  await page.goto("/forum/");
  await page.locator("summary", { hasText: "Account menu for" }).click();
  await page.getByRole("link", { name: "Forum moderation" }).click();
  await expect(page).toHaveURL("/forum/moderate/");
  const queued = page
    .getByTestId("forum-queue")
    .getByRole("listitem")
    .filter({ hasText: title });
  await queued.getByRole("button", { name: "Approve" }).click();
  await expect(page.getByTestId("forum-queue").getByText(title)).toHaveCount(0);
  {
    const { violations } = await new AxeBuilder({ page }).analyze();
    expect(violations.map((v) => v.id)).toEqual([]);
  }

  const reporter = await newPage(browser, baseURL);
  await reporter.goto(topicUrl);
  await reporter.getByRole("link", { name: "Sign in to reply" }).click();
  await signIn(reporter, freshLogin("forum-reporter"));
  await reporter.goto(topicUrl);
  const reported = post(reporter, "Buy my things.");
  await reported.getByText("Report", { exact: true }).click();
  await reported.getByLabel("Spam or advertising").check();
  await reported.getByLabel("Anything to add?").fill("Selling things");
  await reported.getByRole("button", { name: "Send report" }).click();
  await expect(
    reporter.getByText("Thanks: a moderator will look at your report."),
  ).toBeVisible();

  await page.goto("/forum/moderate/?tab=reports");
  const card = page
    .getByTestId("report-queue")
    .getByRole("listitem")
    .filter({ hasText: title })
    .first();
  await expect(card).toContainText("Selling things");
  await card.getByRole("button", { name: "Hide the post" }).click();
  await expect(page.getByTestId("report-queue")).toHaveCount(0);

  // On the topic: the moderator's tools, and a ban for the author.
  await page.goto(topicUrl);
  const tools = page.getByRole("group", { name: "Moderate this topic" });
  await expect(tools).toBeVisible();
  const spam = post(page, "Buy my things.");
  await expect(spam.getByText("Hidden", { exact: true })).toBeVisible();
  await spam.getByText(/^Ban @/).click();
  await spam.getByLabel("How long").selectOption("7d");
  await spam.getByLabel("Why (they’ll see this)").fill("Advertising");
  await spam.getByRole("button", { name: "Ban", exact: true }).click();
  await expect(
    page.getByText("Banned. They can still read the forum."),
  ).toBeVisible();

  await author.goto("/forum/new/?in=general");
  await expect(
    author.getByText(/You’re banned from posting in the forum until/),
  ).toContainText("Advertising");
  await expect(author.getByLabel("Title")).toHaveCount(0);

  // Elsewhere they're an ordinary member: no tools in General.
  await page.goto("/forum/general/");
  const other = page.getByTestId("topic-list").getByRole("link").first();
  if ((await other.count()) > 0) {
    await other.click();
    await expect(
      page.getByRole("group", { name: "Moderate this topic" }),
    ).toHaveCount(0);
  }

  // The admin sees the ban and the log, and lifts it.
  await admin.goto("/admin/forum/?tab=log");
  await expect(admin.getByTestId("forum-log")).toContainText(
    `@${moderatorLogin}`,
  );
  await admin.goto("/admin/forum/?tab=bans");
  const row = admin.getByTestId("forum-bans").getByRole("listitem").filter({
    hasText: "Advertising",
  });
  await row.getByRole("button", { name: /^Lift / }).click();
  await expect(admin.getByRole("status")).toHaveText("Ban lifted.");
});

test("moderators split posts off and see what was edited", async ({
  browser,
  baseURL,
}) => {
  const admin = await adminPage(browser, baseURL);
  const title = unique("Splitting");
  await startTopic(admin, "general", title, "First point.");
  const topicUrl = admin.url().split("#")[0] ?? "";
  for (const text of ["A tangent.", "More tangent."]) {
    await admin.getByLabel("Your reply").fill(text);
    await admin.getByRole("button", { name: "Post reply" }).click();
    await expect(post(admin, text)).toBeVisible();
  }

  // Edit the first post, then read its history.
  await admin.goto(topicUrl);
  await post(admin, "First point.").getByRole("link", { name: "Edit" }).click();
  await admin.getByLabel("Your post").fill("First point, sharpened.");
  await admin.getByRole("button", { name: "Save changes" }).click();
  await post(admin, "First point, sharpened.")
    .getByRole("link", { name: /History/ })
    .click();
  await expect(
    admin.getByRole("heading", { level: 1, name: "Edit history" }),
  ).toBeVisible();
  await expect(admin.getByTestId("post-history")).toContainText(
    "Version 2 (now)",
  );
  await expect(admin.getByTestId("post-history")).toContainText("First point.");

  await admin.goto(topicUrl);
  await post(admin, "A tangent.").getByLabel("Split").check();
  await post(admin, "More tangent.").getByLabel("Split").check();
  const splitTitle = unique("The tangent");
  await admin.getByLabel("Split ticked posts into").fill(splitTitle);
  await admin.getByRole("button", { name: "Split", exact: true }).click();
  await expect(
    admin.getByRole("heading", { level: 1, name: splitTitle }),
  ).toBeVisible();
  await expect(post(admin, "A tangent.")).toBeVisible();
  await expect(post(admin, "More tangent.")).toBeVisible();

  await admin.goto(topicUrl);
  await expect(admin.getByText("A tangent.")).toHaveCount(0);
});

test("the admin makes a forum members-only and gives a group a title", async ({
  page,
  browser,
  baseURL,
}) => {
  const admin = await adminPage(browser, baseURL);
  const name = unique("Members lounge");
  await admin.goto("/admin/forum/");
  await admin.getByRole("link", { name: "Add a forum in Community" }).click();
  await admin.getByLabel("Name").fill(name);
  await admin.getByRole("button", { name: "Create forum" }).click();
  await expect(admin.getByRole("status")).toHaveText("Created.");
  await admin
    .getByLabel("Guests: See the forum and its topics")
    .selectOption("deny");
  await admin.getByRole("button", { name: "Save permissions" }).click();
  await expect(admin.getByRole("status")).toHaveText("Permissions saved.");
  const forumUrl = await admin
    .getByRole("link", { name: "View it" })
    .getAttribute("href");
  {
    const { violations } = await new AxeBuilder({ page: admin }).analyze();
    expect(violations.map((v) => v.id)).toEqual([]);
  }

  // Visitors don't see it; members do.
  expect((await page.goto(forumUrl ?? ""))?.status()).toBe(404);
  await page.goto("/forum/");
  await expect(page.getByRole("link", { name })).toHaveCount(0);

  // A group with a title, and someone in it.
  const member = freshLogin("forum-helper");
  const helper = await newPage(browser, baseURL);
  await helper.goto(`/sign-in?next=${encodeURIComponent(forumUrl ?? "")}`);
  await signIn(helper, member);
  await expect(helper.getByRole("heading", { level: 1, name })).toBeVisible();

  const group = unique("Helpers");
  await admin.goto("/admin/forum/groups/");
  await admin.getByRole("link", { name: "New group" }).click();
  await admin.getByLabel("Name").fill(group);
  await admin
    .getByLabel("Key")
    .fill(`helpers-${randomBytes(2).toString("hex")}`);
  await admin.getByLabel("Title").fill("Helper");
  await admin.getByRole("button", { name: "Create group" }).click();
  await expect(admin.getByRole("status")).toHaveText("Created.");
  await admin.getByLabel("Add someone").fill(member);
  await admin.getByRole("button", { name: "Add", exact: true }).click();
  await expect(admin.getByTestId("group-members")).toContainText(`@${member}`);
  {
    const { violations } = await new AxeBuilder({ page: admin }).analyze();
    expect(violations.map((v) => v.id)).toEqual([]);
  }

  await startTopic(
    helper,
    "general",
    unique("Helper here"),
    "Hello from a helper.",
  );
  await expect(
    post(helper, "Hello from a helper.").getByText("Helper", { exact: true }),
  ).toBeVisible();
});
