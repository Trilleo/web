import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { adminPage, continueAs, freshLogin, toasts } from "./support";

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
async function feedsLoaded(page: Page) {
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

async function axe(page: Page) {
  const { violations } = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze();
  expect(violations.map((v) => `${page.url()} ${v.id}: ${v.help}`)).toEqual([]);
}

async function signIn(page: Page, user: string, start: string) {
  await page.goto(start);
  await page
    .getByRole("link", { name: "Sign in", exact: true })
    .first()
    .click();
  await page.getByRole("link", { name: "Sign in with GitHub" }).click();
  await continueAs(page, user);
}

test("signed out, an event page offers sign-in and browser notifications", async ({
  page,
}) => {
  await page.goto("/tools/skyblock/events/spooky-festival/");
  const remind = page.locator("#remind");
  await expect(remind.getByRole("link", { name: "Sign in" })).toBeVisible();
  await expect(
    remind.getByRole("button", { name: "Notify me in this browser" }),
  ).toBeVisible();
});

test("email reminders are added, listed, set up and removed", async ({
  page,
  browser,
  baseURL,
}) => {
  const me = freshLogin("reminder");
  await signIn(page, me, "/tools/skyblock/events/spooky-festival/");
  await expect(page).toHaveURL(/\/events\/spooky-festival\//);
  const remind = page.locator("#remind");
  await remind
    .getByLabel("Email me")
    .selectOption({ label: "15 minutes before" });
  await remind.getByRole("button", { name: "Remind me" }).click();
  await expect(toasts(page)).toContainText("Reminder added.");
  await expect(page.getByTestId("event-reminders")).toContainText(
    "15 minutes before",
  );
  // Hourly events don't offer leads longer than their gap.
  await page.goto("/tools/skyblock/events/dark-auction/");
  await expect(
    page.locator("#remind").getByLabel("Email me").locator("option"),
  ).toHaveText([
    "When it starts",
    "5 minutes before",
    "15 minutes before",
    "30 minutes before",
  ]);

  await page.goto("/tools/skyblock/events/reminders/");
  await expect(page.getByTestId("reminders-list")).toContainText(
    "Spooky Festival",
  );
  await axe(page);
  const settings = page.getByTestId("reminder-settings");
  await settings.getByLabel("Time zone").fill("Asia/Shanghai");
  await settings.getByLabel("Most emails a day").fill("5");
  await settings.getByLabel("Quiet hours").check();
  await settings.getByRole("button", { name: "Save" }).click();
  await expect(toasts(page)).toContainText("Settings saved.");
  await expect(settings.getByLabel("Time zone")).toHaveValue("Asia/Shanghai");
  await settings.getByLabel("Time zone").fill("Nowhere/Here");
  await settings.getByRole("button", { name: "Save" }).click();
  await expect(toasts(page)).toContainText("That isn't a time zone.");

  // The admin sees it under Mail, and can remove it.
  const admin = await adminPage(browser, baseURL);
  await admin.goto(`/admin/mail/reminders/?user=${me}`);
  const table = admin.getByTestId("admin-reminders");
  await expect(table).toContainText("Spooky Festival");
  await expect(table).toContainText("15 minutes before");
  await axe(admin);
  await table.getByRole("button", { name: "Pause person" }).click();
  await expect(toasts(admin)).toContainText("paused");
  await page.reload();
  await expect(page.locator("#remind")).toContainText(
    "paused by the site's admin",
  );

  await page
    .getByRole("button", { name: "Remove Spooky Festival, 15 minutes before" })
    .click();
  await expect(toasts(page)).toContainText("Reminder removed.");
  await expect(page.getByTestId("reminders-empty")).toBeVisible();
  await admin.close();
});

test("the calendar feed makes a link, and the feed is a calendar", async ({
  page,
  request,
}) => {
  await page.goto("/tools/skyblock/events/");
  await page.getByRole("link", { name: "Calendar feed" }).click();
  await expect(page).toHaveURL("/tools/skyblock/events/calendar/");
  const form = page.getByTestId("calendar-form");
  await form.getByLabel("Spooky Festival").check();
  await form.getByLabel("Dark Auction").check();
  await form.getByLabel("Alarm").selectOption({ label: "15 minutes before" });
  await form.getByRole("button", { name: "Make the link" }).click();
  const url = await page.getByTestId("calendar-url").inputValue();
  expect(url).toMatch(
    /\/tools\/skyblock\/events\/calendar\.ics\?events=(spooky-festival|dark-auction)%2C(spooky-festival|dark-auction)&alarm=15$/,
  );
  await expect(
    page.getByRole("link", { name: "Open in a calendar app" }),
  ).toHaveAttribute("href", /^webcal:/);
  const response = await request.get(url);
  expect(response.headers()["content-type"]).toContain("text/calendar");
  const ics = await response.text();
  expect(ics).toContain("BEGIN:VCALENDAR");
  expect(ics).toContain("SUMMARY:Dark Auction");
  expect(ics).toContain("TRIGGER:-PT15M");
  expect(ics).not.toContain("SUMMARY:Jacob");
});

test("Jacob's contests show their crops, and reminders and the feed can pick crops", async ({
  page,
  request,
}) => {
  await feedsLoaded(page);
  await expect(
    page.getByTestId("events-next").getByTestId("contest-crops"),
  ).toHaveText(
    /^(Wheat, Carrot, Potato|Cactus, Melon, Pumpkin|Sugar Cane, Nether Wart, Mushroom)$/,
  );
  await page.goto("/tools/skyblock/events/jacobs-farming-contest/");
  const crops = page.getByTestId("event-times").getByTestId("contest-crops");
  await expect(crops.first()).not.toHaveText("Not known yet");
  // The calendar feed keeps only contests with a chosen crop.
  const ics = await (
    await request.get(
      "/tools/skyblock/events/calendar.ics?events=jacobs-farming-contest&crops=Cactus",
    )
  ).text();
  const summaries = ics.match(/^SUMMARY:.*$/gm) ?? [];
  expect(summaries.length).toBeGreaterThan(0);
  for (const summary of summaries) expect(summary).toContain("Cactus");
});

test("a reminder for Jacob's contests can name crops", async ({ page }) => {
  await signIn(
    page,
    freshLogin("farmer"),
    "/tools/skyblock/events/jacobs-farming-contest/",
  );
  const remind = page.locator("#remind");
  await remind.getByLabel("Cactus").check();
  await remind.getByLabel("Wheat").check();
  await remind.getByRole("button", { name: "Remind me" }).click();
  await expect(toasts(page)).toContainText("Reminder added.");
  await expect(page.getByTestId("event-reminders")).toContainText(
    "Cactus or Wheat",
  );
});

test("elections list what the site recorded, and each has its page", async ({
  page,
}) => {
  await feedsLoaded(page);
  await page.getByRole("link", { name: "Elections", exact: true }).click();
  await expect(page).toHaveURL("/tools/skyblock/events/elections/");
  await expect(page.getByTestId("election-running")).toContainText("Diana");
  const past = page.getByTestId("elections-past");
  await expect(past).toContainText("Marina");
  await past.getByRole("link").first().click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    /^Year \d+ election$/,
  );
  await expect(page.getByTestId("election-candidates")).toContainText("Marina");
  await expect(page.getByTestId("election-facts")).toContainText("Diaz");
  await axe(page);
  expect(
    (await page.goto("/tools/skyblock/events/elections/1/"))?.status(),
  ).toBe(404);
});
