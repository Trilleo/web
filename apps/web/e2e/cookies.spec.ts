import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

// The cookie manager (components/CookieConsent.astro). The e2e build has a fake
// analytics token; Cloudflare's beacon is stubbed so nothing leaves the machine.

const BEACON = "https://static.cloudflareinsights.com/beacon.min.js";

async function stubBeacon(page: Page): Promise<() => number> {
  let loads = 0;
  await page.route(BEACON, (route) => {
    loads += 1;
    return route.fulfill({ contentType: "text/javascript", body: "" });
  });
  return () => loads;
}

const card = (page: Page) =>
  page.getByRole("region", { name: "Cookies & storage" });

test("the card asks once, and analytics loads only when allowed", async ({
  page,
}) => {
  const beaconLoads = await stubBeacon(page);
  await page.goto("/about/");
  await expect(card(page)).toBeVisible();
  expect(beaconLoads()).toBe(0);
  const { violations } = await new AxeBuilder({ page })
    .include("[data-cookie-card]")
    .analyze();
  expect(violations.map((v) => v.id)).toEqual([]);

  await card(page).getByRole("button", { name: "Allow analytics" }).click();
  await expect(card(page)).toBeHidden();
  await expect(page.locator(`script[src="${BEACON}"]`)).toHaveAttribute(
    "data-cf-beacon",
    '{"token":"e2e-analytics-token"}',
  );

  // Remembered on the next page: no card, analytics on.
  await page.goto("/writing/");
  await expect(card(page)).toBeHidden();
  await expect(page.locator(`script[src="${BEACON}"]`)).toHaveCount(1);
});

test("“No thanks” keeps analytics off", async ({ page }) => {
  const beaconLoads = await stubBeacon(page);
  await page.goto("/about/");
  await card(page).getByRole("button", { name: "No thanks" }).click();
  await page.goto("/writing/");
  await expect(card(page)).toBeHidden();
  await expect(page.locator(`script[src="${BEACON}"]`)).toHaveCount(0);
  expect(beaconLoads()).toBe(0);
});

test("settings turn preferences off, which forgets the theme", async ({
  page,
}) => {
  await page.goto("/about/");
  // A remembered theme, before the choice.
  await page.getByRole("button", { name: "Dark mode" }).click();
  expect(await page.evaluate(() => localStorage.getItem("trilleo-theme"))).toBe(
    "dark",
  );

  // The footer link opens the same settings.
  await page.getByRole("link", { name: "Cookie settings" }).click();
  const dialog = page.getByRole("dialog", { name: "Settings" });
  await expect(dialog).toBeVisible();
  const { violations } = await new AxeBuilder({ page })
    .include("[data-cookie-dialog]")
    .analyze();
  expect(violations.map((v) => v.id)).toEqual([]);

  await expect(dialog.getByLabel("Preferences")).toBeChecked();
  await expect(dialog.getByLabel("Analytics")).not.toBeChecked();
  await dialog.getByLabel("Preferences").uncheck();
  await expect(dialog.getByRole("alert")).toContainText("deletes");
  await dialog.getByRole("button", { name: "Save choices" }).click();

  // The page reloads; what preferences covered is gone, and new choices last for
  // this tab only.
  await expect(card(page)).toBeHidden();
  expect(
    await page.evaluate(() => localStorage.getItem("trilleo-theme")),
  ).toBeNull();
  await page.getByRole("button", { name: "Dark mode" }).click();
  expect(
    await page.evaluate(() => [
      localStorage.getItem("trilleo-theme"),
      sessionStorage.getItem("trilleo-theme"),
    ]),
  ).toEqual([null, "dark"]);
});

test("Global Privacy Control keeps analytics off", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "globalPrivacyControl", { value: true });
  });
  const beaconLoads = await stubBeacon(page);
  await page.goto("/about/");
  await card(page).getByRole("button", { name: "Settings" }).click();
  const dialog = page.getByRole("dialog", { name: "Settings" });
  await expect(dialog.getByLabel("Analytics")).toBeDisabled();
  await expect(dialog).toContainText("Global Privacy Control");
  await dialog.getByRole("button", { name: "Cancel" }).click();
  await card(page).getByRole("button", { name: "Allow analytics" }).click();
  await page.goto("/writing/");
  expect(beaconLoads()).toBe(0);
});
