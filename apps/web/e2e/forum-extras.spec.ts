import AxeBuilder from "@axe-core/playwright";
import { randomBytes } from "node:crypto";
import { expect, test, type Page } from "@playwright/test";
import {
  adminPage,
  continueAs,
  freshLogin,
  hydrated,
  newPage,
} from "./support";

// Polls, attachments and private messages. Fresh accounts per attempt; the admin
// is shared and only touches what each test made.

const unique = (text: string) => `${text} ${randomBytes(3).toString("hex")}`;

// A 1×1 PNG.
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
  "base64",
);

async function signIn(page: Page, user: string, next = "/forum/") {
  await page.goto(`/sign-in?next=${encodeURIComponent(next)}`);
  await page.getByRole("link", { name: "Sign in with GitHub" }).click();
  await continueAs(page, user);
}

const post = (page: Page, text: string) =>
  page.getByRole("article").filter({ hasText: text });

test("a topic's poll takes votes and shows the results", async ({
  browser,
  baseURL,
}) => {
  const admin = await adminPage(browser, baseURL);
  const title = unique("Poll time");
  await admin.goto("/forum/new/?in=general");
  await admin.getByLabel("Title").fill(title);
  await admin.getByLabel("Your post").fill("Tell me.");
  await admin.getByText("Add a poll (optional)").click();
  await admin.getByLabel("Question").fill("Which is best?");
  await admin.getByLabel("Options, one per line").fill("Stone\nDirt\nGlass");
  await admin.getByRole("button", { name: "Post topic" }).click();
  await expect(
    admin.getByRole("heading", { level: 2, name: "Which is best?" }),
  ).toBeVisible();
  const topicUrl = admin.url().split("#")[0] ?? "";

  const voter = await newPage(browser, baseURL);
  await signIn(voter, freshLogin("forum-voter"), topicUrl);
  await voter.goto(topicUrl);
  await expect(voter.getByText("Results show once you’ve voted")).toBeVisible();
  await voter.getByLabel("Dirt").check();
  await voter.getByRole("button", { name: "Vote", exact: true }).click();
  const results = voter.getByRole("list", { name: "Results" });
  await expect(results).toContainText("Dirt");
  await expect(
    results.getByRole("listitem").filter({ hasText: "Dirt" }),
  ).toContainText("100% · 1");
  {
    const { violations } = await new AxeBuilder({ page: voter }).analyze();
    expect(violations.map((v) => v.id)).toEqual([]);
  }

  // Moderators see who voted; the asker can close it.
  await admin.goto(topicUrl);
  await expect(admin.getByRole("list", { name: "Results" })).toContainText(
    "@forum-voter",
  );
  await admin.getByRole("button", { name: "Close the poll" }).click();
  await expect(admin.getByText(/^Poll · closed/)).toBeVisible();
});

test("pictures attach to posts and open in the lightbox", async ({
  browser,
  baseURL,
}) => {
  const admin = await adminPage(browser, baseURL);
  const title = unique("With a picture");
  await admin.goto("/forum/new/?in=general");
  await admin.locator("[data-forum-attachments]").scrollIntoViewIfNeeded();
  await hydrated(admin);
  await admin
    .locator('[data-forum-attachments] input[type="file"]')
    .setInputFiles({
      name: "lamp.png",
      mimeType: "image/png",
      buffer: PNG,
    });
  await expect(admin.getByRole("list", { name: "Uploads" })).toContainText(
    "Uploaded",
  );
  await admin.getByLabel("Title").fill(title);
  await admin.getByLabel("Your post").fill("Here it is.");
  await admin.getByRole("button", { name: "Post topic" }).click();
  await expect(
    admin.getByRole("heading", { level: 1, name: title }),
  ).toBeVisible();

  const visitor = await newPage(browser, baseURL);
  await visitor.goto(admin.url().split("#")[0] ?? "");
  const picture = post(visitor, "Here it is.").getByRole("img", {
    name: "lamp.png",
  });
  await expect(picture).toBeVisible();
  await picture.click();
  const lightbox = visitor.getByRole("dialog", { name: "Picture" });
  await expect(lightbox).toBeVisible();
  await expect(lightbox).toContainText("lamp.png");
  await visitor.keyboard.press("Escape");
  await expect(lightbox).toBeHidden();
});

test("members message each other, block, and report", async ({
  browser,
  baseURL,
}) => {
  const admin = await adminPage(browser, baseURL);

  // A newcomer can't send until one of their posts is approved.
  const member = await newPage(browser, baseURL);
  const memberLogin = freshLogin("forum-messenger");
  await signIn(member, memberLogin);
  await member.goto("/account/messages/new/");
  await expect(
    member.getByText("You can send messages once one of your posts"),
  ).toBeVisible();
  const title = unique("Getting trusted");
  await member.goto("/forum/new/?in=general");
  await member.getByLabel("Title").fill(title);
  await member.getByLabel("Your post").fill("Hello all.");
  await member.getByRole("button", { name: "Post topic" }).click();
  await admin.goto("/forum/moderate/");
  await admin
    .getByTestId("forum-queue")
    .getByRole("listitem")
    .filter({ hasText: title })
    .getByRole("button", { name: "Approve" })
    .click();

  // Now they can write to the admin.
  await member.goto("/account/messages/new/?to=site-owner");
  await member.getByLabel("Subject").fill("A question");
  await member
    .getByLabel("Message", { exact: true })
    .fill("Can I help with the wiki?");
  await member.getByRole("button", { name: "Send" }).click();
  await expect(
    member.getByRole("heading", { level: 1, name: "A question" }),
  ).toBeVisible();
  const conversationUrl = member.url().split("#")[0] ?? "";

  await admin.goto("/account/messages/");
  await admin
    .getByRole("link", { name: /^A question/ })
    .first()
    .click();
  await expect(admin.getByTestId("messages")).toContainText(
    "Can I help with the wiki?",
  );
  await admin.getByLabel("Your message").fill("Yes please!");
  await admin.getByRole("button", { name: "Send" }).click();
  {
    const { violations } = await new AxeBuilder({ page: admin }).analyze();
    expect(violations.map((v) => v.id)).toEqual([]);
  }

  // The member sees it, reports it (for the test's sake), and the admin decides.
  await member.goto("/account/messages/");
  await expect(member.getByTestId("conversations")).toContainText("A question");
  await member.goto(conversationUrl);
  const reply = member
    .getByTestId("messages")
    .getByRole("listitem")
    .filter({ hasText: "Yes please!" });
  await reply.getByText("Report", { exact: true }).click();
  await reply.getByLabel("Something else").check();
  await reply.getByRole("button", { name: "Send report" }).click();
  await expect(
    member.getByText("Thanks: the admin will look at it."),
  ).toBeVisible();

  await admin.goto("/forum/moderate/?tab=reports");
  const card = admin
    .getByTestId("report-queue")
    .getByRole("listitem")
    .filter({ hasText: "Yes please!" })
    .first();
  await expect(card).toContainText("Private message");
  await card.getByRole("button", { name: "Dismiss" }).click();

  // Blocking from the member page; unblocking from settings.
  await member.goto("/forum/members/site-owner/");
  await member.getByRole("button", { name: "Block", exact: true }).click();
  await member.goto("/account/forum/");
  await expect(member.getByTestId("blocked")).toContainText("@site-owner");
  await member.getByRole("button", { name: "Unblock @site-owner" }).click();
  await expect(member.getByText("Nobody. Block someone")).toBeVisible();
});
