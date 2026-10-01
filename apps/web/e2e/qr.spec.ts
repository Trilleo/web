import { expect, test } from "@playwright/test";

test("QR code draws a Wi-Fi code and saves it as SVG and PNG", async ({
  page,
}) => {
  await page.goto("/tools/qr/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("QR code");

  await page.getByText("Wi-Fi", { exact: true }).click();
  await page.getByLabel("Network name").fill("Cafe");
  await page.getByLabel("Password").fill("latte;art");
  await expect(
    page.getByText("WIFI:T:WPA;S:Cafe;P:latte\\;art;;"),
  ).toBeVisible();
  await expect(
    page.getByRole("img", { name: /^QR code for: WIFI:/ }),
  ).toBeVisible();

  const svg = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download SVG" }).click();
  expect((await svg).suggestedFilename()).toBe("qr-code.svg");

  const png = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download PNG" }).click();
  expect((await png).suggestedFilename()).toBe("qr-code.png");
});
