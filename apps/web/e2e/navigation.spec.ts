import { expect, test } from "@playwright/test";

test.describe("phone", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("menu opens, closes with Escape, and returns focus to its button", async ({
    page,
  }) => {
    await page.goto("/");
    const button = page.getByRole("button", { name: "Menu" });
    const menu = page.locator("#site-menu");

    await expect(menu).toBeHidden();
    await button.click();
    await expect(button).toHaveAttribute("aria-expanded", "true");
    await expect(menu.getByRole("link", { name: /Writing/ })).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(menu).toBeHidden();
    await expect(button).toHaveAttribute("aria-expanded", "false");
    await expect(button).toBeFocused();
  });

  test("the menu's About link opens the about page", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Menu" }).click();
    await page
      .locator("#site-menu")
      .getByRole("link", { name: /About/ })
      .click();

    await expect(page).toHaveURL("/about/");
    await expect(
      page.getByRole("heading", { level: 1, name: "About." }),
    ).toBeVisible();
    await expect(
      page
        .getByRole("navigation", { name: "Around the site" })
        .getByRole("link"),
    ).toHaveText([/^Writing/, /^Tools/, /^Games/, /^GitHub/]);
  });
});

test.describe("iPad", () => {
  test.use({ viewport: { width: 834, height: 1194 } });

  test("shows the numbered nav instead of the menu button", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page.getByRole("button", { name: "Menu" })).toBeHidden();
    const nav = page.getByRole("navigation", { name: "Main" });
    await expect(nav.getByRole("link")).toHaveText([
      "01Writing",
      "02Tools",
      "03Games",
      "04About",
    ]);
  });
});

test("unknown pages get the styled 404 with a way home", async ({ page }) => {
  const response = await page.goto("/does-not-exist");
  expect(response?.status()).toBe(404);
  await expect(
    page.getByRole("heading", { level: 1, name: "404." }),
  ).toBeVisible();

  await page.getByRole("link", { name: "Back to home" }).click();
  await expect(page).toHaveURL(/\/$/);
});
