import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { githubEmail } from "./fake-github";
import {
  adminPage,
  codeSentTo,
  continueAs,
  freshLogin,
  newPage,
} from "./support";

// Email sign-in, and accounts from before it. Codes are read from /admin/mail/ as the
// admin. Every code asked for here counts against one limit for 127.0.0.1
// (SIGN_IN_LIMITS.perVisitorHourly), so keep email sign-ins in this file few.

test.describe.configure({ timeout: 150_000 });

const AXE_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

async function noViolations(page: Page) {
  const { violations } = await new AxeBuilder({ page })
    .withTags(AXE_TAGS)
    .analyze();
  expect(violations.map((v) => `${page.url()} ${v.id}: ${v.help}`)).toEqual([]);
}

/** Types an address on /sign-in and the code that arrives for it. */
async function emailCode(page: Page, admin: Page, address: string) {
  await page.getByLabel("Email address").fill(address);
  await page.getByRole("button", { name: "Continue with email" }).click();
  await expect(page).toHaveURL("/sign-in/code");
  await expect(page.getByText(`code we sent to ${address}`)).toBeVisible();
  const code = await codeSentTo(admin, address);
  await page.getByLabel("Code", { exact: true }).fill(code);
  await page.getByRole("button", { name: "Continue" }).click();
}

/** A new account by email: address, code, username. Ends on /account/. */
async function signUp(
  page: Page,
  admin: Page,
  address: string,
  username: string,
) {
  await page.goto("/sign-in");
  await emailCode(page, admin, address);
  await expect(page).toHaveURL("/sign-up");
  await page.getByLabel("Username", { exact: true }).fill(username);
  await page.getByLabel(/I agree to the terms/).check();
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL("/account/?welcome=1");
}

test("a new address makes an account with a code, and signs back in with one", async ({
  page,
  browser,
  baseURL,
}) => {
  const name = freshLogin("mailbox");
  const address = `${name}@example.com`;
  const admin = await adminPage(browser, baseURL);

  await page.goto("/sign-in");
  await noViolations(page);
  await page.getByLabel("Email address").fill(address);
  await page.getByRole("button", { name: "Continue with email" }).click();
  await expect(page).toHaveURL("/sign-in/code");
  await noViolations(page);
  // A wrong code is refused, and the page says so.
  await page.getByLabel("Code", { exact: true }).fill("000000");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("alert")).toContainText("isn’t the code");
  const code = await codeSentTo(admin, address);
  await page.getByLabel("Code", { exact: true }).fill(code);
  await page.getByRole("button", { name: "Continue" }).click();

  // New address: choose a username (one is suggested), agree, done.
  await expect(page).toHaveURL("/sign-up");
  await expect(page.getByText(`${address} is confirmed`)).toBeVisible();
  await expect(page.getByLabel("Username", { exact: true })).toHaveValue(name);
  await noViolations(page);
  await page.getByLabel("Username", { exact: true }).fill("Admin");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(
    page.getByLabel("Username", { exact: true }),
  ).toHaveAccessibleDescription(/reserved/);
  await page.getByLabel("Username", { exact: true }).fill(name);
  await page.getByLabel(/I agree to the terms/).check();
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL("/account/?welcome=1");
  await expect(page.getByRole("status")).toContainText("Welcome");
  await expect(page.getByText(`(@${name})`)).toBeVisible();

  // Signing out and back in: the same address, a new code, the same account.
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(page).toHaveURL("/sign-in?signed-out=1");
  await expect(async () => {
    // Codes to one address are a minute apart.
    await page.goto("/sign-in?next=/account/security/");
    await page.getByLabel("Email address").fill(address);
    await page.getByRole("button", { name: "Continue with email" }).click();
    await expect(page).toHaveURL("/sign-in/code", { timeout: 1000 });
  }).toPass({ timeout: 75_000, intervals: [5000] });
  const again = await codeSentTo(admin, address);
  await page.getByLabel("Code", { exact: true }).fill(again);
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page).toHaveURL("/account/security/");
  await expect(page.locator("[data-email]")).toHaveText(address);
  await noViolations(page);
  await admin.context().close();
});

test("an account from before email sign-in adds an address before anything else", async ({
  page,
  browser,
  baseURL,
}) => {
  // The fake GitHub gives "legacy-" logins no address, as the migration leaves them.
  const me = freshLogin("legacy-user");
  await page.goto("/sign-in?next=/account/");
  await page.getByRole("link", { name: "Sign in with GitHub" }).click();
  await continueAs(page, me);
  await expect(page).toHaveURL("/account/email/?setup=1&next=%2Faccount%2F");
  await expect(page.getByRole("status")).toContainText(
    "One more step: add your email address.",
  );
  await noViolations(page);
  // Any other page sends them back here.
  await page.goto("/writing/");
  await expect(page).toHaveURL("/account/email/?setup=1&next=%2Fwriting%2F");

  const address = `${me}@example.com`;
  const admin = await adminPage(browser, baseURL);
  await page.getByLabel("Email address").fill(address);
  await page.getByRole("button", { name: "Send code" }).click();
  const code = await codeSentTo(admin, address);
  await page.getByLabel(/^Code sent to/).fill(code);
  await page.getByRole("button", { name: "Confirm" }).click();
  await expect(page).toHaveURL("/writing/");

  // The admin's dashboard counts accounts by whether they've moved over.
  await admin.goto("/admin");
  await expect(admin.locator("[data-account-migration]")).toContainText(
    "accounts have an email address",
  );
  await admin.context().close();
});

test("GitHub is linked and unlinked from the security page", async ({
  page,
  browser,
  baseURL,
}) => {
  const name = freshLogin("linker");
  const github = freshLogin("linked-gh");
  const admin = await adminPage(browser, baseURL);
  await signUp(page, admin, `${name}@example.com`, name);
  await admin.context().close();

  await page.goto("/account/security/");
  await page.getByRole("button", { name: "Link GitHub" }).click();
  await continueAs(page, github);
  await expect(page).toHaveURL("/account/security/?done=linked");
  await expect(page.locator('[data-linked="github"]')).toContainText(
    `@${github}`,
  );

  // Signing in with that GitHub account now opens this account.
  const other = await newPage(browser, baseURL);
  await other.goto("/sign-in?next=/account/");
  await other.getByRole("link", { name: "Sign in with GitHub" }).click();
  await continueAs(other, github);
  await expect(other).toHaveURL("/account/");
  await expect(other.getByText(`(@${name})`)).toBeVisible();
  await other.context().close();

  await page.getByRole("button", { name: "Unlink GitHub" }).click();
  await expect(page.getByRole("status")).toContainText("GitHub is unlinked");
  await expect(page.getByRole("button", { name: "Link GitHub" })).toBeVisible();
});

test("GitHub can't take over an account by its address", async ({
  page,
  browser,
  baseURL,
}) => {
  const github = freshLogin("lookalike");
  // Someone already has the address that GitHub account has.
  const address = githubEmail(github) ?? "";
  const admin = await adminPage(browser, baseURL);
  await signUp(page, admin, address, freshLogin("owner"));
  await admin.context().close();

  const stranger = await newPage(browser, baseURL);
  await stranger.goto("/sign-in");
  await stranger.getByRole("link", { name: "Sign in with GitHub" }).click();
  await continueAs(stranger, github);
  await expect(stranger).toHaveURL(/\/sign-in\?error=email-taken/);
  await expect(stranger.getByRole("alert")).toContainText(
    "already uses that GitHub account’s email address",
  );
  await stranger.context().close();
});

test("a new username keeps the old profile link working", async ({ page }) => {
  const me = freshLogin("renamer");
  await page.goto("/sign-in?next=/account/profile/");
  await page.getByRole("link", { name: "Sign in with GitHub" }).click();
  await continueAs(page, me);
  await expect(page).toHaveURL("/account/profile/");

  await page.getByLabel("Username", { exact: true }).fill(`${me}-new`);
  await page.getByRole("button", { name: "Save profile" }).click();
  await expect(page).toHaveURL("/account/profile/?saved=1");
  await expect(page.getByLabel("Username", { exact: true })).toHaveValue(
    `${me}-new`,
  );
  // Changed once: the field waits out the cooldown.
  await expect(page.getByLabel("Username", { exact: true })).toHaveAttribute(
    "readonly",
    "",
  );

  await page.goto(`/people/${me}/`);
  await expect(page).toHaveURL(`/people/${me}-new/`);
});
