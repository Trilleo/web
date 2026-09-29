import { expect, type Browser, type Page } from "@playwright/test";
import { FAKE_USERS, type FakeUser } from "./fake-github";

/** A login for this test attempt only (e.g. "newcomer-k3x9q1"); see fakeUserId. */
export function freshLogin(base: string): string {
  return `${base}-${Math.random().toString(36).slice(2, 8)}`;
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
