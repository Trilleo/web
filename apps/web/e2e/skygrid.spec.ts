import { expect, test, type Page } from "@playwright/test";
import { continueAs, freshLogin, newPage } from "./support";

// Each test has its own browser, so each starts a new island (saved in localStorage).
const GAME = "/games/skygrid/";

const log = (page: Page) => page.getByRole("list", { name: "What happened" });
const world = (page: Page) => page.getByRole("application");

/**
 * Waits until the game is playable: running, focused (as a click would), and laid
 * out for good (the
 * grid is sized to fit once the fonts are in; clicks before that miss).
 */
async function ready(page: Page, greeting = /You wake up|Welcome back/) {
  await expect(log(page)).toContainText(greeting);
  await world(page).focus();
  await page.evaluate(async () => {
    await document.fonts.ready;
    await new Promise((done) =>
      requestAnimationFrame(() => requestAnimationFrame(done)),
    );
  });
}

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
  await ready(page, /You wake up on a small island/);
  // The map takes the keyboard as soon as the game starts.
  await page.reload();
  await expect(log(page)).toContainText(/You wake up|Welcome back/);
  await expect(world(page)).toBeFocused();
  await ready(page);

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
  await ready(page, /Welcome back\./);
  await page.getByRole("tab", { name: "Bag" }).click();
  await expect(page.getByRole("tabpanel")).toContainText("Oak Log");
  await page.getByRole("tab", { name: "Skills" }).click();
  await expect(page.getByRole("tabpanel")).toContainText("6 / 25 XP");
});

test("clicking the portal walks there and travels to the Hub", async ({
  page,
}) => {
  await page.goto(GAME);
  await ready(page, /You wake up/);
  const portal = page.getByTestId("world").locator("span", { hasText: /^>$/ });
  await portal.click();
  await expect(log(page)).toContainText("You arrive at The Hub.", {
    timeout: 5000,
  });
  await expect(world(page)).toHaveAccessibleName(/^The Hub\./);
});

const saveNote = (page: Page) =>
  page.getByText(/^(Saved to your account|Saving…)$/);

/** Chops the oak two steps down and three left of a new island's start. */
async function chopFirstTree(page: Page) {
  await ready(page);
  await walk(page, [
    "ArrowDown",
    "ArrowDown",
    "ArrowLeft",
    "ArrowLeft",
    "ArrowLeft",
  ]);
  await expect(log(page)).toContainText("+1 Oak Log", { timeout: 8000 });
}

async function skills(page: Page) {
  await page.getByRole("tab", { name: "Skills" }).click();
  return page.getByRole("tabpanel");
}

test("signing in moves the island into the account, and it follows you", async ({
  page,
  browser,
  baseURL,
}) => {
  const me = freshLogin("islander");
  await page.goto(GAME);
  await chopFirstTree(page);

  // The game's own "Sign in" goes straight to GitHub and back.
  await page.locator('a[href^="/auth/github"]').click();
  await continueAs(page, me);
  await expect(page).toHaveURL(GAME);
  await page.getByRole("button", { name: "Move it to my account" }).click();
  await expect(page.getByText("Saved to your account")).toBeVisible();
  await expect(await skills(page)).toContainText("6 / 25 XP");

  // Played on in the account: the tree grew back on the way in.
  await ready(page);
  await page.keyboard.press("ArrowLeft");
  await expect(log(page)).toContainText("+1 Oak Log", { timeout: 8000 });
  await expect(page.getByText("Saved to your account")).toBeVisible({
    timeout: 10_000,
  });

  // Another browser, same account: the same island, as the server replayed it.
  const laptop = await newPage(browser, baseURL);
  await laptop.goto(`/auth/github?next=${encodeURIComponent(GAME)}`);
  await continueAs(laptop, me);
  await expect(laptop).toHaveURL(GAME);
  await expect(saveNote(laptop)).toBeVisible();
  await expect(await skills(laptop)).toContainText("12 / 25 XP");
  await laptop.context().close();
});

test("a new account without a browser island starts a new one", async ({
  page,
}) => {
  await page.goto(`/auth/github?next=${encodeURIComponent(GAME)}`);
  await continueAs(page, freshLogin("newcomer"));
  await expect(page.getByText("Saved to your account")).toBeVisible();
  await expect(log(page)).toContainText("You wake up");
});

test("the game's API is only for signed-in players on this site", async ({
  request,
}) => {
  const response = await request.post("/api/games/skygrid/sync", {
    data: { version: 1, actions: [] },
  });
  expect(response.status()).toBe(401);
  expect(response.headers()["cache-control"]).toBe("no-store");
});
