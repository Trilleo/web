import { randomBytes } from "node:crypto";
import { expect, type Browser, type Page } from "@playwright/test";
import { FAKE_USERS, type FakeUser } from "./fake-github";

/** A login for this test attempt only (e.g. "newcomer-3fa9c1"); see fakeUserId. */
export function freshLogin(base: string): string {
  return `${base}-${randomBytes(3).toString("hex")}`;
}

/** On the fake GitHub's sign-in page: carry on as a FAKE_USERS key or any other login. */
export async function continueAs(page: Page, user: string) {
  if (Object.hasOwn(FAKE_USERS, user)) {
    const { login } = FAKE_USERS[user as FakeUser];
    await page.getByRole("link", { name: `Continue as ${login}` }).click();
    return;
  }
  // No button for this one: follow a button's link with the account swapped.
  const href = await page
    .getByRole("link", { name: /^Continue as/ })
    .first()
    .getAttribute("href");
  if (!href) throw new Error("No sign-in buttons on the fake GitHub page");
  const url = new URL(href, page.url());
  url.searchParams.set("user", user);
  await page.goto(url.href);
}

/** Another browser with its own cookies (e.g. the admin next to a commenter). */
export async function newPage(browser: Browser, baseURL: string | undefined) {
  const context = await browser.newContext({ baseURL });
  return context.newPage();
}

/** The site owner, signed in and on /admin. */
export async function adminPage(browser: Browser, baseURL: string | undefined) {
  const page = await newPage(browser, baseURL);
  await page.goto("/admin");
  await page.getByRole("link", { name: "Sign in with GitHub" }).click();
  await continueAs(page, "admin");
  await expect(page).toHaveURL("/admin");
  return page;
}

/**
 * Waits for the page's islands to hydrate: clicks, typing and file uploads before
 * that are lost when React takes over.
 */
export async function hydrated(page: Page) {
  await expect(page.locator("astro-island[ssr]")).toHaveCount(0);
}

/** The newest captured message to `address` (of a kind), opened on /admin/mail/. */
export async function openMail(
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

/** The 6-digit code in the newest code email to `address`, read as the admin. */
export async function codeSentTo(admin: Page, address: string) {
  const text = await openMail(admin, address, "email-code");
  const code = /\b(\d{6})\b/.exec(text)?.[1] ?? "";
  expect(code).toMatch(/^\d{6}$/);
  return code;
}
