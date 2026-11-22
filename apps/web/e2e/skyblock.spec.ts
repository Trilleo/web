import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { adminPage, continueAs, freshLogin, hydrated, toasts } from "./support";
import type { Page } from "@playwright/test";

// The shard data is the copy committed with the site (SKYBLOCK_SYNC=off).

/** Picks a shard through a shard picker: open it by its label, search, press Enter. */
async function chooseShard(page: Page, label: string, search: string) {
  await page.getByRole("button", { name: new RegExp(`^${label}`) }).click();
  const box = page
    .getByTestId("shard-picker")
    .getByRole("combobox", { name: "Search shards" });
  await box.fill(search);
  await box.press("Enter");
  await expect(page.getByTestId("shard-picker")).toBeHidden();
}

test("the SkyBlock tool lists its utilities", async ({ page }) => {
  await page.goto("/tools/skyblock/");
  await expect(
    page.getByRole("heading", { level: 1, name: "Hypixel SkyBlock" }),
  ).toBeVisible();
  const utilities = page.getByTestId("skyblock-utilities");
  for (const name of ["Collection", "Hunting planner", "Fusion lines", "Guide"])
    await expect(utilities.getByRole("link", { name })).toBeVisible();
  await utilities.getByRole("link", { name: "Shards" }).click();
  await expect(page).toHaveURL("/tools/skyblock/shards/");
});

test("shards can be searched and filtered, and the search stays in the address", async ({
  page,
}) => {
  await page.goto("/tools/skyblock/shards/");
  await hydrated(page);
  await expect(page.getByTestId("shard-count")).toHaveText(/^\d{3} shards$/);
  const list = page.getByTestId("shard-list");
  // Hypixel's order of shard IDs: Grove is C1.
  await expect(list.getByRole("link").first()).toHaveText("Grove");
  await expect(list.getByTestId("shard-id").first()).toHaveText("ID C1");
  await page.getByLabel("Name, attribute or effect").fill("L6");
  await expect(list.getByRole("link").first()).toHaveText("Tiamat");
  await page.getByLabel("Name, attribute or effect").fill("tiamat");
  await expect(list.getByRole("link").first()).toHaveText("Tiamat");
  await expect(page).toHaveURL(/\?q=tiamat$/);
  await page.getByLabel("Name, attribute or effect").fill("");
  await page.getByLabel("Rarity").selectOption("legendary");
  await page.getByLabel("Family").selectOption("Croco");
  await expect(list.getByRole("link", { name: "Tiamat" })).toBeVisible();
  await expect(page.getByTestId("shard-count")).toHaveText(
    /^\d+ of \d{3} shards$/,
  );
  await list.getByRole("link", { name: "Tiamat" }).click();
  await expect(page).toHaveURL("/tools/skyblock/shards/tiamat/");
});

test("a search in the address is where the list starts", async ({ page }) => {
  await page.goto("/tools/skyblock/shards/?q=pure%20reptile");
  await hydrated(page);
  await expect(
    page.getByTestId("shard-list").getByRole("link").first(),
  ).toHaveText("Crocodile");
});

test("a shard's page shows its attribute, levels and fusions", async ({
  page,
}) => {
  await page.goto("/tools/skyblock/shards/tiamat/");
  await expect(
    page.getByRole("heading", { level: 1, name: "Tiamat" }),
  ).toBeVisible();
  await expect(page.getByTestId("shard-icon")).toHaveAttribute(
    "src",
    "/tools/skyblock/shard-icons/tiamat.webp",
  );
  await expect(page.getByTestId("shard-facts")).toContainText("Legendary");
  await expect(page.getByTestId("shard-facts")).toContainText("Shard ID");
  await expect(page.getByTestId("shard-attribute")).toContainText(
    "Echo of Echoes",
  );
  await expect(page.getByTestId("shard-levels")).toContainText("24");
  const made = page.getByTestId("shard-made-from");
  await expect(made.getByText("Special fusion")).toBeVisible();
  await made.getByRole("link", { name: "Caiman" }).first().click();
  await expect(page).toHaveURL("/tools/skyblock/shards/caiman/");
  await expect(
    page
      .getByTestId("shard-used-in")
      .getByRole("link", { name: "Tiamat" })
      .first(),
  ).toBeVisible();
});

test("a shard's stat symbols are drawn, and unknown shards are 404s", async ({
  page,
  request,
}) => {
  await page.goto("/tools/skyblock/shards/grove/");
  await expect(
    page.getByTestId("shard-attribute").locator("svg.sb-glyph"),
  ).toHaveCount(1);
  expect(
    (await request.get("/tools/skyblock/shards/no-such-shard/")).status(),
  ).toBe(404);
});

test("shard pages are in their sitemap and have share cards", async ({
  page,
  request,
}) => {
  const sitemap = await (await request.get("/sitemap-skyblock.xml")).text();
  expect(sitemap).toContain("/tools/skyblock/shards/tiamat/</loc>");
  expect(await (await request.get("/robots.txt")).text()).toContain(
    "sitemap-skyblock.xml",
  );
  await page.goto("/tools/skyblock/shards/tiamat/");
  const image = await page
    .locator('meta[property="og:image"]')
    .getAttribute("content");
  expect(image).toMatch(/\/og\/skyblock\/tiamat\.png\?v=/);
  const card = await request.get(
    new URL(image ?? "").pathname + new URL(image ?? "").search,
  );
  expect(card.headers()["content-type"]).toBe("image/png");
});

test("the admin's SkyBlock panel shows the data in use", async ({
  browser,
  baseURL,
}) => {
  const admin = await adminPage(browser, baseURL);
  await admin.goto("/admin/skyblock/");
  await expect(
    admin.getByRole("heading", { level: 1, name: "SkyBlock" }),
  ).toBeVisible();
  await expect(admin.getByTestId("skyblock-counts")).toContainText(
    "the copy committed with the site",
  );
  await expect(admin.getByText("Fetching is switched off here")).toBeVisible();
  await expect(admin.getByRole("button", { name: "Check now" })).toBeDisabled();
  await expect(admin.getByTestId("skyblock-bazaar")).toContainText(
    "shards on the Bazaar",
  );
});

test("a shard's page opens the calculator, which works out the fastest route", async ({
  page,
}) => {
  await page.goto("/tools/skyblock/shards/tiamat/");
  await page.getByTestId("shard-calculate").click();
  await expect(page).toHaveURL(
    "/tools/skyblock/calculator/?shard=tiamat&qty=24",
  );
  await hydrated(page);
  const summary = page.getByTestId("calc-summary");
  await expect(summary).toContainText("Fusions");
  await expect(page.getByTestId("calc-tree")).toContainText("24 Tiamat");
  await expect(page.getByTestId("calc-checklist")).toContainText(
    /0 of \d+ done/,
  );
  await expect(page.getByTestId("calc-breakdown")).toBeVisible();
});

test("the calculator follows the setup and keeps choices in this browser", async ({
  page,
}) => {
  await page.goto("/tools/skyblock/calculator/?shard=tiamat&qty=24");
  await hydrated(page);
  const time = page.getByTestId("calc-summary").locator("dd").first();
  await expect(time).not.toBeEmpty();
  const before = await time.textContent();
  await page.getByLabel("Hunting Fortune").fill("300");
  await expect(time).not.toHaveText(before ?? "");

  await page
    .getByRole("button", { name: "Change how to get Crocodile" })
    .first()
    .click();
  const dialog = page.getByTestId("calc-alternatives");
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: /^Use / }).first().click();
  await expect(dialog).toBeHidden();
  await expect(page.getByTestId("calc-chosen")).toContainText("Crocodile");
  await page
    .getByTestId("calc-checklist")
    .getByRole("checkbox")
    .first()
    .check();

  await page.reload();
  await hydrated(page);
  await expect(page.getByLabel("Hunting Fortune")).toHaveValue("300");
  await expect(page.getByTestId("calc-chosen")).toContainText("Crocodile");
  await expect(page.getByTestId("calc-checklist")).toContainText(
    /1 of \d+ done/,
  );
});

test("the calculator's data is versioned and revalidated", async ({
  request,
}) => {
  const first = await request.get("/api/skyblock/deck.json");
  expect(first.status()).toBe(200);
  const etag = first.headers().etag ?? "";
  const deck = (await first.json()) as { version: string; shards: unknown[] };
  expect(etag).toBe(`"${deck.version}"`);
  expect(deck.shards.length).toBeGreaterThan(300);
  const again = await request.get("/api/skyblock/deck.json", {
    headers: { "If-None-Match": etag },
  });
  expect(again.status()).toBe(304);
});

for (const colorScheme of ["light", "dark"] as const)
  test(`the calculator's result and alternatives are accessible (${colorScheme})`, async ({
    page,
  }) => {
    await page.emulateMedia({ colorScheme });
    await page.goto("/tools/skyblock/calculator/?shard=tiamat&qty=24");
    await hydrated(page);
    await expect(page.getByTestId("calc-tree")).toBeVisible();
    const tags = [
      "wcag2a",
      "wcag2aa",
      "wcag21a",
      "wcag21aa",
      "wcag22aa",
      "best-practice",
    ];
    const result = await new AxeBuilder({ page }).withTags(tags).analyze();
    expect(
      result.violations.map(
        (v) =>
          `${v.id}: ${v.nodes
            .map((n) => n.target.join(" "))
            .slice(0, 3)
            .join(", ")}`,
      ),
    ).toEqual([]);
    await page
      .getByRole("button", { name: "Change how to get Tiamat" })
      .click();
    await expect(
      page
        .getByTestId("calc-alternatives")
        .getByRole("button", { name: /^Use / })
        .first(),
    ).toBeVisible();
    const dialog = await new AxeBuilder({ page })
      .withTags(tags)
      .include("[data-testid=calc-alternatives]")
      .analyze();
    expect(dialog.violations.map((v) => v.id)).toEqual([]);
  });

/** Waits for the site's first fetch of the (fake) Bazaar. */
async function pricesReady(
  request: import("@playwright/test").APIRequestContext,
) {
  await expect(async () => {
    const body = (await (
      await request.get("/api/skyblock/prices.json")
    ).json()) as {
      prices: unknown;
    };
    expect(body.prices).not.toBeNull();
  }).toPass({ timeout: 30_000 });
}

test("the profits page lists fusions worth doing, and its options are links", async ({
  page,
  request,
}) => {
  await pricesReady(request);
  await page.goto("/tools/skyblock/profits/");
  await expect(
    page.getByRole("heading", { level: 1, name: "Fusion profits" }),
  ).toBeVisible();
  const table = page.getByTestId("profits-table");
  await expect(table.locator("tbody tr").first()).toBeVisible();
  await expect(page.locator('meta[name="robots"]')).toHaveCount(0);
  await page.getByLabel("Sell with").selectOption("instant");
  await page.getByLabel("Sort by").selectOption("margin");
  await page.getByRole("button", { name: "Show" }).click();
  await expect(page).toHaveURL(/sell=instant/);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
    "content",
    "noindex",
  );
  await expect(page.getByTestId("profits-movers")).toContainText(
    "Not enough price history yet",
  );
  // A route opens the calculator in coin mode.
  await page
    .getByTestId("profits-table")
    .getByRole("link", { name: /^Route for / })
    .first()
    .click();
  await expect(page).toHaveURL(
    /\/tools\/skyblock\/calculator\/\?shard=.*&mode=coins/,
  );
  await hydrated(page);
  await expect(page.getByTestId("calc-summary")).toContainText("Cost");
  await expect(page.getByTestId("calc-summary")).toContainText(
    "Sell instantly",
  );
});

test("a shard's page shows its Bazaar prices and what maxing costs", async ({
  page,
  request,
}) => {
  await pricesReady(request);
  await page.goto("/tools/skyblock/shards/tiamat/");
  const bazaar = page.getByTestId("shard-bazaar");
  await expect(bazaar).toContainText("Instant buy");
  await expect(page.getByTestId("shard-cost-to-max")).toContainText(/\d/);
  await expect(page.getByTestId("shard-chart-waiting")).toBeVisible();
  await bazaar.getByRole("link", { name: "30 days" }).click();
  await expect(page).toHaveURL(/range=30d/);
  await expect(bazaar.getByText("30 days", { exact: true })).toHaveAttribute(
    "aria-current",
    "true",
  );
});

test("the calculator counts coins once there are prices", async ({
  page,
  request,
}) => {
  await pricesReady(request);
  await page.goto("/tools/skyblock/calculator/?shard=grove&qty=2");
  await hydrated(page);
  const coins = page.getByRole("radio", {
    name: "Coins (buy from the Bazaar)",
  });
  await expect(coins).toBeEnabled();
  await page.getByText("Coins (buy from the Bazaar)").click();
  await expect(page.getByTestId("calc-summary")).toContainText("Cost");
  await expect(page.getByTestId("calc-prices")).toBeVisible();
  await expect(page.getByTestId("calc-tree")).toContainText("Buy");
});

test("the API serves shard prices", async ({ request }) => {
  await pricesReady(request);
  const response = await request.get("/api/v1/skyblock/prices");
  expect(response.status()).toBe(200);
  const body = (await response.json()) as { items: { id: string }[] };
  expect(body.items.length).toBeGreaterThan(300);
  const history = await request.get(
    "/api/v1/skyblock/shards/tiamat/prices?range=24h",
  );
  expect(((await history.json()) as { points: unknown[] }).points.length).toBe(
    1,
  );
});

test("the collection keeps levels and held shards in this browser", async ({
  page,
}) => {
  await page.goto("/tools/skyblock/collection/");
  await hydrated(page);
  await page.getByLabel("Filter", { exact: true }).fill("tiamat");
  const row = page.locator(
    '[data-testid="collection-row"][data-shard="SHARD_TIAMAT"]',
  );
  await row.getByLabel("Tiamat: level").selectOption("3");
  await row.getByLabel("Tiamat: held").fill("4");
  await expect(row).toContainText("21 of 24 left");
  await expect(row.getByRole("link", { name: "Plan it" })).toHaveAttribute(
    "href",
    "/tools/skyblock/calculator/?shard=tiamat&qty=21",
  );
  // Saved after a pause; a reload brings it back.
  await page.waitForTimeout(900);
  await page.reload();
  await hydrated(page);
  // Rows come 60 at a time; Tiamat is further down, so find it again.
  await page.getByLabel("Filter", { exact: true }).fill("tiamat");
  await expect(
    page
      .locator('[data-testid="collection-row"][data-shard="SHARD_TIAMAT"]')
      .getByLabel("Tiamat: level"),
  ).toHaveValue("3");
  await expect(page.getByTestId("collection-totals")).toContainText("Held");
});

test("the calculator uses the collection's shards when asked", async ({
  page,
}) => {
  await page.goto("/tools/skyblock/collection/");
  await hydrated(page);
  await page.getByLabel("Filter", { exact: true }).fill("grove");
  await page
    .locator('[data-testid="collection-row"][data-shard="SHARD_GROVE"]')
    .getByLabel("Grove: held")
    .fill("1000");
  await page.waitForTimeout(900);
  await page.goto("/tools/skyblock/calculator/?shard=grove&qty=10");
  await hydrated(page);
  await expect(page.getByTestId("calc-summary")).toBeVisible();
  await page.getByRole("checkbox", { name: "Use my collection" }).check();
  await expect(page.getByTestId("calc-used")).toContainText(
    "Uses 10 shards from your collection",
  );
  await expect(page.getByTestId("calc-tree")).toContainText("Have");
});

test("the planner plans several shards together", async ({ page }) => {
  await page.goto("/tools/skyblock/planner/");
  await hydrated(page);
  for (const name of ["Grove", "Tiamat"]) {
    await chooseShard(page, "Add a shard", name);
    await page.getByRole("button", { name: "Add", exact: true }).click();
  }
  await expect(page.getByTestId("planner-target")).toHaveCount(2);
  await expect(page.getByTestId("planner-summary")).toContainText("Fusions");
  await expect(page.getByTestId("planner-hunt")).toBeVisible();
  await expect(page.getByTestId("planner-checklist")).toContainText("done");
  await page.getByRole("button", { name: "Remove Grove" }).click();
  await expect(page.getByTestId("planner-target")).toHaveCount(1);
});

test("the shard picker searches by name, ID and typed filters, with the keyboard", async ({
  page,
}) => {
  await page.goto("/tools/skyblock/calculator/");
  await hydrated(page);
  const trigger = page.getByRole("button", { name: /^Shard to make/ });
  await trigger.click();
  const picker = page.getByTestId("shard-picker");
  const box = picker.getByRole("combobox", { name: "Search shards" });
  const results = picker
    .getByRole("listbox", { name: "Shards" })
    .getByRole("option");
  await expect(box).toBeFocused();
  // Hypixel's order of shard IDs while nothing is typed.
  await expect(results.first()).toContainText("Grove");
  await box.fill("r:legendary fam:croco");
  await expect(results.first()).toContainText("Tiamat");
  await box.fill("C1");
  await expect(results.first()).toContainText("Grove");
  await box.fill("");
  await picker.getByRole("button", { name: "Legendary", exact: true }).click();
  await expect(results.first()).toContainText("ID L1");
  await box.press("ArrowDown");
  await expect(results.nth(1)).toHaveAttribute("aria-selected", "true");
  await box.press("Escape");
  await expect(picker).toBeHidden();
  await expect(trigger).toBeFocused();
  await chooseShard(page, "Shard to make", "tiamat");
  await expect(trigger).toContainText("Tiamat");
  await expect(page).toHaveURL(/\?shard=tiamat&qty=24$/);
  // The pick leads the list next time, while nothing is typed.
  await trigger.click();
  await expect(results.first()).toContainText("Recent");
  await expect(results.first()).toContainText("Tiamat");
  const { violations } = await new AxeBuilder({ page })
    .include('[data-testid="shard-picker"]')
    .analyze();
  expect(violations.map((v) => v.id)).toEqual([]);
});

test("fusion lines draw a shard's line, and each shard re-centres it", async ({
  page,
}) => {
  await page.goto("/tools/skyblock/lines/?shard=iguana");
  const diagram = page.getByTestId("lines-diagram");
  await expect(diagram).toBeVisible();
  await expect(page.getByTestId("lines-summary")).toContainText(
    "shards within 2 steps",
  );
  await expect(page.getByTestId("lines-list")).toContainText("Komodo Dragon");
  await diagram.getByRole("link", { name: /^Gecko,/ }).click();
  await expect(page).toHaveURL("/tools/skyblock/lines/?shard=gecko");
  await expect(diagram.locator("[aria-current=page]")).toHaveAccessibleName(
    "Gecko, this shard",
  );
  await page.getByLabel("Steps out").selectOption("1");
  await page.getByRole("button", { name: "Show" }).click();
  await expect(page).toHaveURL(/steps=1/);
  // The shard picker re-centres it at once.
  await hydrated(page);
  await chooseShard(page, "Centre on", "komodo");
  await expect(page).toHaveURL(/\?shard=komodo-dragon&steps=1(&|$)/);
  // A shard's page links its line.
  await page.goto("/tools/skyblock/shards/iguana/");
  await page.getByTestId("shard-lines").click();
  await expect(page).toHaveURL("/tools/skyblock/lines/?shard=iguana");
});

test.describe("without JavaScript", () => {
  test.use({ javaScriptEnabled: false });

  test("fusion lines centre on a shard from a plain list", async ({ page }) => {
    await page.goto("/tools/skyblock/lines/");
    await page.getByLabel("Centre on").selectOption("gecko");
    await page.getByRole("button", { name: "Show" }).click();
    await expect(page).toHaveURL(/\/lines\/\?shard=gecko(&|$)/);
  });
});

test("the guide explains levels with the data's numbers", async ({ page }) => {
  await page.goto("/tools/skyblock/guide/");
  await expect(
    page.getByRole("heading", { level: 1, name: "Guide" }),
  ).toBeVisible();
  await expect(page.getByTestId("guide-levels")).toContainText("96");
  await page
    .getByTestId("guide-contents")
    .getByRole("link", { name: /Fusing/ })
    .click();
  await expect(page).toHaveURL(/#fusing$/);
});

test("signed in, each SkyBlock profile keeps its own collection", async ({
  page,
}) => {
  await page.goto("/tools/skyblock/profiles/");
  await page.getByRole("link", { name: "Sign in with GitHub" }).click();
  await continueAs(page, freshLogin("profiles"));
  await expect(page).toHaveURL("/tools/skyblock/profiles/");
  await expect(page.locator("[data-profile-list]")).toContainText("Main");

  const tiamat = (level: string) => async () => {
    await page.goto("/tools/skyblock/collection/");
    await hydrated(page);
    await page.getByLabel("Filter", { exact: true }).fill("tiamat");
    const select = page
      .locator('[data-testid="collection-row"][data-shard="SHARD_TIAMAT"]')
      .getByLabel("Tiamat: level");
    await select.selectOption(level);
    // Saved after a pause.
    await page.waitForTimeout(900);
  };
  await tiamat("3")();

  await page.goto("/tools/skyblock/profiles/");
  await page.getByLabel("Name", { exact: true }).fill("Apple");
  await page.getByRole("button", { name: "Add profile" }).click();
  await expect(toasts(page)).toContainText("Profile made");
  const { violations } = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze();
  expect(violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);

  // Apple starts empty; set its own level.
  await tiamat("5")();
  await expect(page.getByLabel("Profile")).toHaveValue(/\d+/);
  await expect(page.getByLabel("Profile").locator("option:checked")).toHaveText(
    "Apple",
  );

  // Switching back shows Main's level, untouched.
  await page.getByLabel("Profile").selectOption({ label: "Main" });
  await expect(page.getByLabel("Profile").locator("option:checked")).toHaveText(
    "Main",
  );
  await hydrated(page);
  await page.getByLabel("Filter", { exact: true }).fill("tiamat");
  await expect(
    page
      .locator('[data-testid="collection-row"][data-shard="SHARD_TIAMAT"]')
      .getByLabel("Tiamat: level"),
  ).toHaveValue("3");
});

test("a mod's sync fills the collection, and the page says so", async ({
  page,
  request,
}) => {
  const me = freshLogin("syncer");
  await page.goto("/account/apps/");
  await page.getByRole("link", { name: "Sign in with GitHub" }).click();
  await continueAs(page, me);
  await expect(page).toHaveURL("/account/apps/");
  await page.getByLabel("Name").fill("SkyBlock mod");
  await page.getByRole("button", { name: "Make token" }).click();
  const token =
    (
      await page.getByTestId("new-token").locator("[data-token]").textContent()
    )?.trim() ?? "";

  // Read in the game yesterday, synced now: the chart dates it yesterday.
  const earlier = await request.post(
    "/api/v1/skyblock/me/profiles/1f2e3d4c-5b6a-7980-1a2b-3c4d5e6f7a8b/sync",
    {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        name: "Apple",
        levels: [{ id: "SHARD_TIAMAT", level: 5 }],
        capturedAt: new Date(Date.now() - 86_400_000).toISOString(),
      },
    },
  );
  expect(earlier.status()).toBe(200);
  const synced = await request.post(
    "/api/v1/skyblock/me/profiles/1f2e3d4c-5b6a-7980-1a2b-3c4d5e6f7a8b/sync",
    {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        name: "Apple",
        levels: [{ id: "SHARD_TIAMAT", level: 7 }],
        held: [{ id: "SHARD_GROVE", count: 12 }],
      },
    },
  );
  expect(synced.status()).toBe(200);
  const answer = (await synced.json()) as {
    profile: { name: string; active: boolean };
  };
  // The account had no profile yet: this one is it, and it's shown.
  expect(answer.profile).toMatchObject({ name: "Apple", active: true });

  await page.goto("/tools/skyblock/collection/");
  await hydrated(page);
  await expect(page.locator("[data-sync-summary]")).toContainText(
    "Synced from the game by SkyBlock mod",
  );
  await page.locator("[data-sync-summary] summary").click();
  await expect(page.locator("[data-sync-summary]")).toContainText(
    "Tiamat 5 → 7",
  );
  await expect(page.getByTestId("progress-chart")).toContainText(
    "+2 attribute levels",
  );
  await page.getByLabel("Filter", { exact: true }).fill("tiamat");
  await expect(
    page
      .locator('[data-testid="collection-row"][data-shard="SHARD_TIAMAT"]')
      .getByLabel("Tiamat: level"),
  ).toHaveValue("7");
  const { violations } = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze();
  expect(violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
});
