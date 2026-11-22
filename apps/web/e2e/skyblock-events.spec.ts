import { expect, test } from "@playwright/test";

// The event timer works the calendar out from the time alone, so these check shape
// and links, never a particular date.

test("the event timer shows the SkyBlock date, what's next and the year", async ({
  page,
}) => {
  await page.goto("/tools/skyblock/");
  await page
    .getByTestId("skyblock-utilities")
    .getByRole("link", { name: "Event timer" })
    .click();
  await expect(page).toHaveURL("/tools/skyblock/events/");
  await expect(page.getByTestId("sb-date")).toHaveText(
    /^(Early |Late )?(Spring|Summer|Autumn|Winter) \d{1,2}(st|nd|rd|th), Year \d+$/,
  );
  const next = page.getByTestId("events-next");
  // A header and the 11 calendar events, plus any the mayor's perks add.
  expect(await next.getByRole("row").count()).toBeGreaterThanOrEqual(12);
  await expect(
    next.getByRole("rowheader", { name: "Dark Auction" }),
  ).toBeVisible();
  // Times are rewritten in the visitor's zone, without "UTC".
  await expect(next.locator("time").first()).not.toContainText("UTC");
  await expect(
    page.getByTestId("events-year").getByRole("listitem"),
  ).not.toHaveCount(0);
});

test("the event timer filters by kind of event", async ({ page }) => {
  await page.goto("/tools/skyblock/events/");
  await page
    .getByRole("navigation", { name: "Event categories" })
    .getByRole("link", { name: "Farming" })
    .click();
  await expect(page).toHaveURL("/tools/skyblock/events/?category=farming");
  const next = page.getByTestId("events-next");
  await expect(next.getByRole("row")).toHaveCount(2);
  await expect(
    next.getByRole("rowheader", { name: "Jacob's Farming Contest" }),
  ).toBeVisible();
});

test("an event's page lists its next times", async ({ page }) => {
  await page.goto("/tools/skyblock/events/");
  await page
    .getByTestId("events-next")
    .getByRole("link", { name: "Spooky Festival" })
    .click();
  await expect(page).toHaveURL("/tools/skyblock/events/spooky-festival/");
  await expect(
    page.getByRole("heading", { level: 1, name: "Spooky Festival" }),
  ).toBeVisible();
  await expect(page.getByTestId("event-facts")).toContainText(
    "Autumn 29th to 31st",
  );
  await expect(page.getByTestId("event-times").getByRole("row")).toHaveCount(
    11,
  );
  await expect(page.getByTestId("event-status")).toContainText(
    /Next in|On now/,
  );
});

test("an unknown event is not found", async ({ page }) => {
  const response = await page.goto("/tools/skyblock/events/no-such-event/");
  expect(response?.status()).toBe(404);
});

test.describe("without JavaScript", () => {
  test.use({ javaScriptEnabled: false });

  test("the event timer still reads, in UTC", async ({ page }) => {
    await page.goto("/tools/skyblock/events/");
    await expect(page.getByTestId("sb-date")).toContainText("Year");
    await expect(
      page.getByTestId("events-next").locator("time").first(),
    ).toContainText("UTC");
  });
});

/**
 * The feeds come from e2e/fake-skyblock.ts, fetched by the server in the background
 * after its first requests: reload until they've arrived.
 */
async function feedsLoaded(page: import("@playwright/test").Page) {
  await expect(async () => {
    await page.goto("/tools/skyblock/events/");
    await expect(page.getByTestId("mayor-name")).toHaveText("Marina", {
      timeout: 1000,
    });
  }).toPass({ timeout: 30_000 });
}

test("the board shows the mayor, the election, fire sales, Bingo and news", async ({
  page,
}) => {
  await feedsLoaded(page);
  const mayor = page.getByTestId("events-mayor");
  await expect(mayor).toContainText("Fishing Festival");
  await expect(mayor).toContainText("Diaz");
  const election = page.getByTestId("election-running");
  await expect(election.getByRole("listitem").first()).toContainText("Diana");
  await expect(election).toContainText("60.0%");
  await expect(page.getByTestId("events-firesales")).toContainText(
    "Pet Skin Test",
  );
  await expect(page.getByTestId("events-firesales")).toContainText("650 gems");
  await expect(page.getByTestId("events-bingo")).toContainText("Test Bingo");
  await expect(
    page
      .getByTestId("events-news")
      .getByRole("link", { name: "SkyBlock v0.99" }),
  ).toHaveAttribute("href", "https://hypixel.net/threads/1/");
});

test("the mayor's perks add their events", async ({ page }) => {
  await feedsLoaded(page);
  await page
    .getByRole("navigation", { name: "Event categories" })
    .getByRole("link", { name: "Mayor's perks" })
    .click();
  await page
    .getByTestId("events-next")
    .getByRole("link", { name: "Fishing Festival" })
    .click();
  await expect(page).toHaveURL("/tools/skyblock/events/fishing-festival/");
  await expect(page.getByTestId("event-facts")).toContainText(
    "The 1st to 3rd of every month",
  );
  await expect(page.getByTestId("event-facts")).toContainText(
    "held by Marina (mayor)",
  );
  // Nobody holds Mythological Ritual: it has no times.
  await page.goto("/tools/skyblock/events/mythological-ritual/");
  await expect(page.getByTestId("event-status")).toContainText(
    "Only while a mayor or minister",
  );
  await expect(page.getByTestId("event-times")).toHaveCount(0);
});
