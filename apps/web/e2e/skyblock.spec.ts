import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { adminPage, hydrated } from "./support";

// The shard data is the copy committed with the site (SKYBLOCK_SYNC=off).

test("the SkyBlock tool lists its utilities", async ({ page }) => {
  await page.goto("/tools/skyblock/");
  await expect(
    page.getByRole("heading", { level: 1, name: "Hypixel SkyBlock" }),
  ).toBeVisible();
  const utilities = page.getByTestId("skyblock-utilities");
  await expect(utilities.getByText("Planned").first()).toBeVisible();
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
