import { expect, test, type Page } from "@playwright/test";

const STORAGE_KEY = "trilleo-theme";
const LIGHT_PAPER = "rgb(242, 242, 238)";
const DARK_PAPER = "rgb(15, 15, 14)";

declare global {
  interface Window {
    themeWhenBodyAppeared?: string | undefined;
  }
}

const html = (page: Page) => page.locator("html");
const toggle = (page: Page) => page.getByRole("button", { name: "Dark mode" });
const paper = (page: Page) =>
  page.evaluate(() => getComputedStyle(document.body).backgroundColor);
const stored = (page: Page) =>
  page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY);

test.describe("light system setting", () => {
  test.use({ colorScheme: "light" });

  test("starts light, toggles to dark, and remembers it", async ({ page }) => {
    await page.goto("/");
    await expect(html(page)).toHaveAttribute("data-theme", "light");
    await expect(toggle(page)).toHaveAttribute("aria-pressed", "false");
    expect(await paper(page)).toBe(LIGHT_PAPER);

    await toggle(page).click();
    await expect(html(page)).toHaveAttribute("data-theme", "dark");
    await expect(toggle(page)).toHaveAttribute("aria-pressed", "true");
    expect(await paper(page)).toBe(DARK_PAPER);
    expect(await stored(page)).toBe("dark");

    await page.reload();
    await expect(html(page)).toHaveAttribute("data-theme", "dark");
    await expect(toggle(page)).toHaveAttribute("aria-pressed", "true");
  });

  test("flipping back to match the system forgets the override", async ({
    page,
  }) => {
    await page.goto("/");
    await toggle(page).click();
    await toggle(page).click();
    await expect(html(page)).toHaveAttribute("data-theme", "light");
    expect(await stored(page)).toBeNull();
  });
});

test.describe("dark system setting", () => {
  test.use({ colorScheme: "dark" });

  test("starts dark with nothing stored", async ({ page }) => {
    await page.goto("/");
    await expect(html(page)).toHaveAttribute("data-theme", "dark");
    await expect(toggle(page)).toHaveAttribute("aria-pressed", "true");
    expect(await paper(page)).toBe(DARK_PAPER);
    expect(await stored(page)).toBeNull();
  });

  test("follows the system when it changes and nothing is stored", async ({
    page,
  }) => {
    await page.goto("/");
    await page.emulateMedia({ colorScheme: "light" });
    await expect(html(page)).toHaveAttribute("data-theme", "light");
    await expect(toggle(page)).toHaveAttribute("aria-pressed", "false");
  });
});

test("applies a stored theme before the page body renders", async ({
  page,
}) => {
  await page.addInitScript((key) => {
    localStorage.setItem(key, "dark");
    // Record the theme the moment <body> is parsed, before any bundled script runs.
    // (Init scripts run before <html> exists, so watch the whole document.)
    new MutationObserver((_records, observer) => {
      // (document.body is typed non-null, but it is null until the parser reaches it.)
      if (document.querySelector("body")) {
        window.themeWhenBodyAppeared = document.documentElement.dataset.theme;
        observer.disconnect();
      }
    }).observe(document, { childList: true, subtree: true });
  }, STORAGE_KEY);

  await page.goto("/");
  expect(await page.evaluate(() => window.themeWhenBodyAppeared)).toBe("dark");
});
