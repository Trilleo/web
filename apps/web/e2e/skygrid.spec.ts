import { expect, test, type Page } from "@playwright/test";
import {
  BAZAAR_ITEMS,
  ISLAND_MAPS,
  itemName,
  newGame,
} from "@trilleo/game-skygrid/core";
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

test("walking into a zombie fights it, and holding the key keeps swinging", async ({
  page,
}) => {
  // A save that starts right above a zombie in the Hub's graveyard, sword in hand.
  const hub = ISLAND_MAPS.hub;
  const y = hub.tiles.findIndex((row) => row.includes("z"));
  const x = hub.tiles[y]?.indexOf("z") ?? -1;
  const save = {
    ...newGame(1, Date.now() - 60_000),
    now: Date.now() - 30_000,
    pos: { island: "hub", x, y: y - 1 },
    equipment: { weapon: "wooden_sword" },
  };
  await page.goto("/about/");
  await page.evaluate(
    ([key, value]) => {
      localStorage.setItem(key, value);
    },
    ["trilleo:game:skygrid", JSON.stringify(save)] as const,
  );
  await page.goto(GAME);
  await ready(page, /Welcome back/);

  await page.keyboard.down("ArrowDown");
  await expect(log(page)).toContainText("You defeated a Zombie.", {
    timeout: 10_000,
  });
  await page.keyboard.up("ArrowDown");
  await expect(log(page)).toContainText("Rotten Flesh");
  await page.getByRole("tab", { name: "Skills" }).click();
  await expect(page.getByRole("tabpanel")).toContainText("8 / 25 XP");
});

/** Signs a new account in with a browser island made from `save`, moved into it. */
async function islander(
  page: Page,
  login: string,
  save: Record<string, unknown>,
) {
  await page.goto("/about/");
  await page.evaluate(
    ([key, value]) => {
      localStorage.setItem(key, value);
    },
    ["trilleo:game:skygrid", JSON.stringify(save)] as const,
  );
  await page.goto(`/auth/github?next=${encodeURIComponent(GAME)}`);
  await continueAs(page, login);
  await page.getByRole("button", { name: "Move it to my account" }).click();
  await expect(page.getByText("Saved to your account")).toBeVisible();
}

function atStall(extra: Record<string, unknown>) {
  const hub = ISLAND_MAPS.hub;
  const y = hub.tiles.findIndex((row) => row.includes("¤"));
  const x = hub.tiles[y]?.indexOf("¤") ?? -1;
  return {
    ...newGame(1, Date.now() - 60_000),
    now: Date.now() - 30_000,
    pos: { island: "hub", x, y: y + 1 },
    ...extra,
  };
}

async function openProduct(page: Page, name: string) {
  await page.getByRole("tab", { name: "Bazaar" }).click();
  await page.getByRole("searchbox", { name: "Search products" }).fill(name);
  await page.getByRole("button", { name, exact: true }).click();
}

async function tradeForm(
  page: Page,
  title: string,
  amount: string,
  price?: string,
) {
  const form = page.locator("form", {
    has: page.getByRole("heading", { name: title }),
  });
  await form.getByLabel("Amount").fill(amount);
  if (price) await form.getByLabel("Price each").fill(price);
  await form.getByRole("button", { name: "Go" }).click();
}

test("two players trade on the Bazaar", async ({ page, browser, baseURL }) => {
  // Each attempt trades something different: e2e tests share one database.
  const items = BAZAAR_ITEMS.filter((item) => !item.startsWith("enchanted_"));
  const item = items[Math.floor(Math.random() * items.length)] ?? "wheat";
  const name = itemName(item);

  await islander(
    page,
    freshLogin("seller"),
    atStall({ inventory: { [item]: 20 } }),
  );
  await openProduct(page, name);
  await tradeForm(page, "Place a sell offer", "10", "1");
  await expect(log(page)).toContainText(
    `Sell offer placed: 10 ${name} at 1 coins each.`,
  );

  const buyerPage = await newPage(browser, baseURL);
  await islander(buyerPage, freshLogin("buyer"), atStall({ coins: 500 }));
  await openProduct(buyerPage, name);
  await tradeForm(buyerPage, "Buy now", "4");
  await expect(log(buyerPage)).toContainText(`Bought 4 ${name} for 4 coins.`);
  await buyerPage.context().close();

  await page.reload();
  await page.getByRole("tab", { name: "Bazaar" }).click();
  await expect(page.getByText(/4 to claim/)).toBeVisible();
  await page.getByRole("button", { name: "Claim all" }).click();
  await expect(log(page)).toContainText("Claimed 1 order (3 coins).");
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
