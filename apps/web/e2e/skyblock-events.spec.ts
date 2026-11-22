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
  await expect(next.getByRole("row")).toHaveCount(12);
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
