import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const PAGES = [
  "/",
  "/writing/",
  "/writing/rebuilding-this-site/",
  "/writing/tags/astro/",
  "/does-not-exist",
  "/sign-in",
  "/sign-in?error=state",
];
const VIEWPORTS = [
  { name: "desktop", width: 1440, height: 900 },
  { name: "phone", width: 390, height: 844 },
];

for (const colorScheme of ["light", "dark"] as const) {
  for (const viewport of VIEWPORTS) {
    test.describe(`${colorScheme} · ${viewport.name}`, () => {
      test.use({
        colorScheme,
        viewport: { width: viewport.width, height: viewport.height },
      });

      for (const path of PAGES) {
        test(`${path} has no accessibility violations`, async ({ page }) => {
          await page.goto(path);
          await page.evaluate(() => document.fonts.ready);

          const { violations } = await new AxeBuilder({ page })
            .withTags([
              "wcag2a",
              "wcag2aa",
              "wcag21a",
              "wcag21aa",
              "wcag22aa",
              "best-practice",
            ])
            .analyze();

          expect(
            violations.map((v) => `${v.id} (${v.impact ?? "?"}): ${v.help}`),
          ).toEqual([]);
        });
      }
    });
  }
}
