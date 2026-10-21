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
  await admin.goto("/admin/forum/?tab=waiting");
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
