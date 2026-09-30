import { expect, test, type Page } from "@playwright/test";

// Each test has its own browser, so each starts a new island (saved in localStorage).
const GAME = "/games/skygrid/";

const log = (page: Page) => page.getByRole("list", { name: "What happened" });
const world = (page: Page) => page.getByRole("application");

/** Steps apart, as a player would (the engine refuses steps under 100 ms). */
async function walk(page: Page, keys: string[]) {
  for (const key of keys) {
    await page.keyboard.press(key);
    await page.waitForTimeout(160);
  }
}

test("a new player chops a tree, and the island is still there after a reload", async ({
  page,
}) => {
  await page.goto(GAME);
  await expect(log(page)).toContainText("You wake up on a small island");
  await expect(world(page)).toBeFocused();

  // From the start: down to the lower row, then left until you walk into the oak.
  await walk(page, [
    "ArrowDown",
    "ArrowDown",
    "ArrowLeft",
    "ArrowLeft",
    "ArrowLeft",
  ]);
  // Bare hands take a few seconds.
  await expect(log(page)).toContainText("+1 Oak Log", { timeout: 8000 });

  await page.reload();
  await expect(log(page)).toContainText("Welcome back.");
  await page.getByRole("tab", { name: "Bag" }).click();
  await expect(page.getByRole("tabpanel")).toContainText("Oak Log");
  await page.getByRole("tab", { name: "Skills" }).click();
  await expect(page.getByRole("tabpanel")).toContainText("6 / 25 XP");
});

test("clicking the portal walks there and travels to the Hub", async ({
  page,
}) => {
  await page.goto(GAME);
  await expect(log(page)).toContainText("You wake up");
  const portal = page.getByTestId("world").locator("span", { hasText: /^>$/ });
  await portal.click();
  await expect(log(page)).toContainText("You arrive at The Hub.", {
    timeout: 5000,
  });
  await expect(world(page)).toHaveAccessibleName(/^The Hub\./);
});
