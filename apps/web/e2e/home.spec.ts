import { expect, test } from "@playwright/test";

test("home page renders, styles, and hydrates the React island", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });
  page.on("pageerror", (err) => {
    errors.push(err.message);
  });

  await page.goto("/");

  await expect(page).toHaveTitle("Trilleo");
  await expect(
    page.getByRole("heading", { level: 1, name: "Trilleo" }),
  ).toBeVisible();

  // Astro removes the `ssr` attribute once an island has hydrated.
  await expect(page.locator("astro-island[ssr]")).toHaveCount(0);

  const counter = page.getByRole("button", { name: "Clicked 0 times" });
  // bg-brand-600 comes from @trilleo/ui's theme, so a colored background proves Tailwind scanned the package.
  await expect(counter).not.toHaveCSS("background-color", "rgba(0, 0, 0, 0)");

  await counter.click();
  await expect(
    page.getByRole("button", { name: "Clicked 1 time" }),
  ).toBeVisible();

  expect(errors).toEqual([]);
});
