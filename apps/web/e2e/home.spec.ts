import { expect, test } from "@playwright/test";

test("home renders every section with self-hosted fonts and no errors", async ({
  page,
  baseURL,
}) => {
  const errors: string[] = [];
  const externalRequests: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });
  page.on("pageerror", (err) => {
    errors.push(err.message);
  });
  page.on("request", (request) => {
    if (baseURL && !request.url().startsWith(baseURL))
      externalRequests.push(request.url());
  });

  await page.goto("/");

  await expect(page).toHaveTitle("Trilleo Network");
  await expect(
    page.getByRole("heading", { level: 1, name: "Hey It’s Trilleo." }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { level: 2, name: "Writing" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { level: 2, name: "Tools" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { level: 2, name: /Built by hand/ }),
  ).toBeVisible();
  await expect(page.locator("#writing ol > li")).toHaveCount(4);
  await expect(page.locator("#tools ul > li")).toHaveCount(1);
  await expect(
    page.locator("#tools").getByRole("link", { name: /Notes/ }),
  ).toHaveAttribute("href", "/tools/notes/");

  await page.evaluate(() => document.fonts.ready);
  const brandFontLoaded = await page.evaluate(() =>
    document.fonts.check('800 64px "Schibsted Grotesk Variable"'),
  );
  expect(brandFontLoaded).toBe(true);

  expect(externalRequests).toEqual([]);
  expect(errors).toEqual([]);
});

test("skip link moves focus to the main content", async ({ page }) => {
  await page.goto("/");
  await page.keyboard.press("Tab");
  const skip = page.getByRole("link", { name: "Skip to content" });
  await expect(skip).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("main")).toBeFocused();
});
