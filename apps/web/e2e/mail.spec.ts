import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { adminPage, continueAs, freshLogin } from "./support";

// The e2e server captures mail (MAIL_CAPTURE=1): nothing is sent, and the admin
// reads every message at /admin/mail/. Each test uses fresh accounts and addresses;
// the shared admin never adds an address of their own.

// Several pages, two browsers and accessibility scans per test.
test.describe.configure({ timeout: 60_000 });

const AXE_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

async function noViolations(page: Page) {
  const { violations } = await new AxeBuilder({ page })
    .withTags(AXE_TAGS)
    // The email preview is a sandboxed frame (no scripts): axe can't run in it.
    .exclude("iframe[sandbox]")
    .analyze();
  expect(violations.map((v) => `${page.url()} ${v.id}: ${v.help}`)).toEqual([]);
}

async function signIn(page: Page, login: string, next: string) {
  await page.goto(`/sign-in?next=${encodeURIComponent(next)}`);
  await page.getByRole("link", { name: "Sign in with GitHub" }).click();
  await continueAs(page, login);
  await expect(page).toHaveURL(next);
}

/** The newest captured message to `address` (of a kind), opened on /admin/mail/. */
async function openMail(
  admin: Page,
  address: string,
  kind: string,
  subject?: RegExp,
) {
  await expect(async () => {
    await admin.goto(
      `/admin/mail/?to=${encodeURIComponent(address)}&kind=${kind}`,
    );
    const link = admin
      .locator("[data-mail-list]")
      .getByRole("link", subject ? { name: subject } : {})
      .first();
    await expect(link).toBeVisible({ timeout: 1000 });
    await link.click();
    await expect(admin.locator("[data-mail-text]")).toBeVisible({
      timeout: 1000,
    });
  }).toPass({ timeout: 15_000 });
  return (await admin.locator("[data-mail-text]").textContent()) ?? "";
}

/** Adds and proves an address for the signed-in `page`, reading the code as the admin. */
async function addAddress(page: Page, admin: Page, address: string) {
  await page.goto("/account/email/");
  await page.getByLabel("Email address").fill(address);
  await page.getByRole("button", { name: "Send code" }).click();
  await expect(page.getByRole("status")).toContainText("Code sent");

  const text = await openMail(admin, address, "email-code");
  const code = /\b(\d{6})\b/.exec(text)?.[1] ?? "";
  expect(code).toMatch(/^\d{6}$/);

  await page.getByLabel(/^Code sent to/).fill(code);
  await page.getByRole("button", { name: "Confirm" }).click();
  await expect(page.getByRole("status")).toContainText("Address confirmed");
  await expect(page.locator("[data-email]")).toHaveText(address);
}

test("an address is proved with a code, switched and removed", async ({
  page,
  browser,
  baseURL,
}) => {
  const login = freshLogin("mailer");
  const address = `${login}@example.com`;
  await signIn(page, login, "/account/email/");
  await noViolations(page);

  // A wrong code is refused.
  await page.getByLabel("Email address").fill(address);
  await page.getByRole("button", { name: "Send code" }).click();
  await page.getByLabel(/^Code sent to/).fill("000000");
  await page.getByRole("button", { name: "Confirm" }).click();
  await expect(page.getByRole("alert")).toBeVisible();
  // Asking again at once: wait a minute.
  await page.getByRole("button", { name: "Send a new code" }).click();
  await expect(page.getByRole("alert")).toContainText("Wait a minute");

  const admin = await adminPage(browser, baseURL);
  const text = await openMail(admin, address, "email-code");
  await noViolations(admin);
  const code = /\b(\d{6})\b/.exec(text)?.[1] ?? "";
  await page.goto("/account/email/");
  await page.getByLabel(/^Code sent to/).fill(code);
  await page.getByRole("button", { name: "Confirm" }).click();
  await expect(page.getByRole("status")).toContainText("Address confirmed");

  // Switches save.
  const replies = page.getByLabel("Replies to your comments");
  await expect(replies).toBeChecked();
  await replies.uncheck();
  await page.getByRole("button", { name: "Save notifications" }).click();
  await expect(page.getByRole("status")).toHaveText("Saved.");
  await expect(page.getByLabel("Replies to your comments")).not.toBeChecked();
  // Admin alerts are only offered to admins.
  await expect(page.getByLabel("Admin alerts")).toHaveCount(0);
  await noViolations(page);

  // The export has the address and what was sent.
  const exported = await page.request.get("/account/export.json");
  const data = (await exported.json()) as {
    email: { address: string; sent: { kind: string }[] };
  };
  expect(data.email.address).toBe(address);
  expect(data.email.sent.map((m) => m.kind)).toContain("email-code");

  // Removing it.
  await page.getByRole("button", { name: "Remove my address" }).click();
  await expect(page.getByRole("status")).toContainText("Address removed");
  await expect(page.locator("[data-email]")).toHaveCount(0);
  await admin.context().close();
});

test("approval and replies are emailed, and the unsubscribe link works in one click", async ({
  page,
  browser,
  baseURL,
  request,
}) => {
  const login = freshLogin("listener");
  const address = `${login}@example.com`;
  const slug = "self-hosting-on-a-small-server";
  const admin = await adminPage(browser, baseURL);
  await signIn(page, login, "/account/email/");
  await addAddress(page, admin, address);

  // A newcomer's comment waits; approving it says so.
  const text = `Mail test comment ${login}`;
  await page.goto(`/writing/${slug}/#comments`);
  await expect(page.getByLabel("Your comment")).toBeVisible();
  await page.getByLabel("Your comment").fill(text);
  await page.getByRole("button", { name: "Post comment" }).click();
  await expect(page).toHaveURL(/#comment-\d+$/);

  await admin.goto("/admin");
  await admin
    .getByRole("list", { name: /^Review/ })
    .getByRole("listitem")
    .filter({ hasText: text })
    .getByRole("button", { name: "Approve" })
    .click();
  await expect(admin).toHaveURL("/admin#moderation");
  const live = await openMail(admin, address, "comment-review", /is live/);
  expect(live).toContain(text);

  // The admin replies; the commenter hears about it.
  await admin.goto(`/writing/${slug}/?mail=${login}#comments`);
  const thread = admin
    .locator("#comments li")
    .filter({ hasText: text })
    .first();
  await thread.getByText("Reply", { exact: true }).click();
  await thread.getByLabel("Your reply").fill(`Answer for ${login}`);
  await thread.getByRole("button", { name: "Post reply" }).click();
  const reply = await openMail(admin, address, "comment-reply");
  expect(reply).toContain(`> Answer for ${login}`);

  const headers = (await admin.locator("pre").first().textContent()) ?? "";
  expect(headers).toContain(
    "List-Unsubscribe-Post: List-Unsubscribe=One-Click",
  );
  const unsubscribe = /List-Unsubscribe: <([^>]+)>/.exec(headers)?.[1] ?? "";
  const path = new URL(unsubscribe).pathname + new URL(unsubscribe).search;
  expect(path).toMatch(/^\/mail\/unsubscribe\/[\w-]+\/\?topic=replies$/);

  // Opening the link only asks.
  await page.goto(path);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Unsubscribe.",
  );
  await noViolations(page);
  // A mail provider's one-click POST: no Origin, form-encoded, from elsewhere.
  const oneClick = await request.post(path, {
    form: { "List-Unsubscribe": "One-Click" },
  });
  expect(oneClick.status()).toBe(200);
  await page.goto("/account/email/");
  await expect(page.getByLabel("Replies to your comments")).not.toBeChecked();
  await expect(page.getByLabel("Uploads and Minecraft projects")).toBeChecked();

  // The button on the page works too (for "all", say).
  await page.goto(path.replace("topic=replies", "topic=all"));
  await page.getByRole("button", { name: "Unsubscribe" }).click();
  await expect(page.getByRole("status")).toContainText(
    "no more emails for all notifications",
  );

  // The exception is only that path: other cross-site posts are still refused.
  const forged = await request.post("/account/email/", {
    form: { intent: "remove" },
  });
  expect(forged.status()).toBe(403);
  await admin.context().close();
});

test("the admin answers a contact message by email", async ({
  page,
  browser,
  baseURL,
}) => {
  const login = freshLogin("asker");
  const address = `${login}@example.com`;
  await signIn(page, login, "/contact/");
  const text = `Question by email ${login}`;
  await page.getByLabel("Your name").fill("Asker");
  await page.getByLabel("Email (optional)").fill(address);
  await page.getByLabel("Message").fill(text);
  await page.getByRole("button", { name: "Send message" }).click();
  await expect(page.getByRole("status")).toBeVisible();

  const admin = await adminPage(browser, baseURL);
  await admin.goto("/admin/messages/");
  const message = admin.getByRole("listitem").filter({ hasText: text });
  await message.getByText("Reply by email").click();
  await message.getByLabel(`To ${address}`).fill(`Thanks, ${login}!`);
  await message.getByRole("button", { name: "Send reply" }).click();
  await expect(admin.getByRole("status")).toHaveText(
    "Reply queued. It shows under the message.",
  );
  await expect(
    admin
      .getByRole("listitem")
      .filter({ hasText: text })
      .locator("[data-contact-reply]"),
  ).toBeVisible();

  const sent = await openMail(admin, address, "contact-reply");
  expect(sent).toContain(`Thanks, ${login}!`);
  expect(sent).toContain(`> ${text}`);

  // The message also became an admin alert.
  await admin.goto("/admin/mail/");
  await expect(
    admin.getByText("Message from Asker: A question or hello").first(),
  ).toBeVisible();
  await admin.context().close();
});

test("the admin can send a test email", async ({ browser, baseURL }) => {
  const admin = await adminPage(browser, baseURL);
  await admin.goto("/admin/mail/");
  await expect(admin.locator("[data-transport]")).toContainText("Capture");
  const to = `${freshLogin("test")}@example.com`;
  await admin.getByLabel("Send a test to").fill(to);
  await admin.getByRole("button", { name: "Send test" }).click();
  await expect(admin.getByRole("status")).toContainText("Test email queued");
  const text = await openMail(admin, to, "test");
  expect(text.replace(/\s+/g, " ")).toContain(`can send email to ${to}`);
  await expect(admin.locator("iframe[sandbox='']")).toBeVisible();
  await admin.context().close();
});
