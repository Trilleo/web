import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { FAKE_USERS, type FakeUser } from "./fake-github";

/** From /admin, through the sign-in page and (fake) GitHub, as one of its users. */
async function signInAs(page: Page, user: FakeUser) {
  await page.goto("/admin");
  await expect(page).toHaveURL("/sign-in?next=%2Fadmin");
  await page.getByRole("link", { name: "Sign in with GitHub" }).click();
  await page
    .getByRole("link", { name: `Continue as ${FAKE_USERS[user].login}` })
    .click();
}

async function cookieNames(page: Page) {
  return (await page.context().cookies()).map((cookie) => cookie.name);
}

test("the site owner signs in with GitHub and lands back on /admin", async ({
  page,
}) => {
  await signInAs(page, "admin");

  await expect(page).toHaveURL("/admin");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Admin.");
  await expect(page.getByText("@site-owner")).toBeVisible();

  const cookies = await page.context().cookies();
  expect(
    cookies.find((cookie) => cookie.name === "trilleo_session"),
  ).toMatchObject({
    httpOnly: true,
    sameSite: "Lax",
    path: "/",
  });
  // The one-time sign-in cookie is gone once used.
  expect(cookies.map((cookie) => cookie.name)).not.toContain("trilleo_oauth");

  await page.goto("/sign-in");
  await expect(
    page.getByText("You’re signed in as @site-owner."),
  ).toBeVisible();
});

test("admin pages are never cached or indexed", async ({ page }) => {
  await signInAs(page, "admin");
  const response = await page.request.get("/admin");
  expect(response.status()).toBe(200);
  expect(response.headers()["cache-control"]).toBe("private, no-store");
  expect(response.headers()["x-robots-tag"]).toBe("noindex");
});

test("signing out ends the session", async ({ page }) => {
  await signInAs(page, "admin");
  await page.getByRole("button", { name: "Sign out", exact: true }).click();

  await expect(page).toHaveURL("/sign-in?signed-out=1");
  await expect(page.getByRole("status")).toHaveText("You’ve signed out.");
  expect(await cookieNames(page)).not.toContain("trilleo_session");
  await page.goto("/admin");
  await expect(page).toHaveURL("/sign-in?next=%2Fadmin");
});

test("signing out everywhere ends the other browsers' sessions too", async ({
  browser,
  baseURL,
}) => {
  const laptop = await (await browser.newContext({ baseURL })).newPage();
  const phone = await (await browser.newContext({ baseURL })).newPage();
  await signInAs(laptop, "admin");
  await signInAs(phone, "admin");

  await laptop.getByRole("button", { name: "Sign out everywhere" }).click();
  await expect(laptop).toHaveURL("/sign-in?signed-out=1");
  await phone.goto("/admin");
  await expect(phone).toHaveURL("/sign-in?next=%2Fadmin");

  await laptop.context().close();
  await phone.context().close();
});

test("other GitHub accounts can't sign in", async ({ page }) => {
  await signInAs(page, "visitor");

  await expect(page).toHaveURL("/sign-in?error=not-allowed&next=%2Fadmin");
  await expect(page.getByRole("alert")).toContainText("only the site owner");
  expect(await cookieNames(page)).not.toContain("trilleo_session");
});

test("cancelling on GitHub says so", async ({ page }) => {
  await page.goto("/sign-in");
  await page.getByRole("link", { name: "Sign in with GitHub" }).click();
  await page.getByRole("link", { name: "Cancel" }).click();

  await expect(page).toHaveURL("/sign-in?error=denied&next=%2Fadmin");
  await expect(page.getByRole("alert")).toContainText("cancelled");
});

test("a callback this browser didn't start is refused", async ({ page }) => {
  // Start a real sign-in, then arrive at the callback with someone else's state.
  await page.goto("/auth/github?next=/admin");
  await expect(
    page.getByRole("heading", { name: "Sign in (fake GitHub)" }),
  ).toBeVisible();
  await page.goto("/auth/github/callback?code=stolen&state=forged");

  await expect(page).toHaveURL("/sign-in?error=state&next=%2Fadmin");
  await expect(page.getByRole("alert")).toContainText("Please try again");
  expect(await cookieNames(page)).not.toContain("trilleo_session");
});

test("signing in never sends visitors to another site", async ({ page }) => {
  await page.goto("/sign-in?next=https://evil.example/");
  await page.getByRole("link", { name: "Sign in with GitHub" }).click();
  await page.getByRole("link", { name: "Continue as site-owner" }).click();
  await expect(page).toHaveURL("/admin");
});

test("sign-out only accepts posts from this site", async ({ page }) => {
  const response = await page.request.post("/auth/logout", {
    headers: { Origin: "https://evil.example" },
    form: { everywhere: "1" },
  });
  expect(response.status()).toBe(403);
});

test("the admin page has no accessibility violations", async ({ page }) => {
  await signInAs(page, "admin");
  await expect(page).toHaveURL("/admin");
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
});
