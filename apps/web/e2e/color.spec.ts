import { expect, test } from "@playwright/test";
import { hydrated } from "./support";

test("Color converts, checks contrast, and keeps the color in the link", async ({
  page,
}) => {
  await page.goto("/tools/color/#3a7bd5");
  await hydrated(page);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Color");
  const formats = page.getByRole("list", { name: "Formats" });
  await expect(formats.getByText("rgb(58, 123, 213)")).toBeVisible();

  await page.getByLabel("Any CSS color").fill("black");
  await expect(formats.getByText("#000000")).toBeVisible();
  await expect(page).toHaveURL(/#000000$/);
  await expect(page.getByText("21.00:1")).toBeVisible();

  await page.getByRole("button", { name: /^Use 500:/ }).click();
  await expect(page.getByText("21.00:1")).toBeHidden();
});
