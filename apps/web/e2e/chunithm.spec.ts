import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { adminPage } from "./support";

// E2E runs with CHUNITHM_SYNC=off, so the catalog stays empty: this checks the
// control panel itself. Updates and placements are covered by Vitest (lib/chunithm/).
test("the admin's CHUNITHM panel works without a catalog", async ({
  browser,
  baseURL,
}) => {
  const admin = await adminPage(browser, baseURL);
  await admin.goto("/admin/chunithm/");
  await expect(
    admin.getByRole("heading", { level: 1, name: "CHUNITHM" }),
  ).toBeVisible();
  await expect(admin.getByText("Fetching is switched off here")).toBeVisible();
  await expect(admin.getByRole("button", { name: "Check now" })).toBeDisabled();

  // Withdrawing a chart that isn't there says so.
  await admin.getByLabel("Song ID").fill("99999");
  await admin.getByLabel("Reason").fill("Asked to");
  await admin.getByRole("button", { name: "Withdraw" }).click();
  await expect(admin.getByRole("alert")).toHaveText(
    "There's no such chart in the catalog.",
  );

  await admin.evaluate(() => document.fonts.ready);
  const { violations } = await new AxeBuilder({ page: admin })
    .withTags([
      "wcag2a",
      "wcag2aa",
      "wcag21a",
      "wcag21aa",
      "wcag22aa",
      "best-practice",
    ])
    .analyze();
  expect(violations.map((violation) => violation.id)).toEqual([]);
});

// With fetching off (e2e), the picture route says so rather than building.
test("the chart picture route answers without building when fetching is off", async ({
  request,
}) => {
  const off = await request.get("/api/chunithm/charts/3062/master");
  expect(off.status()).toBe(503);
  expect(await off.json()).toEqual({
    status: "unavailable",
    reason: "storage",
  });
  const wrong = await request.get("/api/chunithm/charts/abc/hardest");
  expect(wrong.status()).toBe(404);
});
