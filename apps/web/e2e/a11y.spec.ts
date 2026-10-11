import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const PAGES = [
  "/",
  "/about/",
  "/writing/",
  "/writing/rebuilding-this-site/",
  "/writing/tags/astro/",
  "/does-not-exist",
  "/sign-in",
  "/sign-in?error=state",
  "/sign-up",
  "/tools/",
  "/tools/notes/",
  "/tools/color/",
  "/tools/convert/",
  "/tools/inspect/",
  "/tools/qr/",
  "/games/",
  "/games/skygrid/",
  "/games/skygrid/leaderboard/",
  "/minecraft/",
  "/minecraft/browse/",
  "/minecraft/resource-packs/",
  "/legal/",
  "/legal/terms/",
  "/legal/privacy/",
  "/legal/cookies/",
  "/legal/guidelines/",
  "/legal/copyright/",
  "/contact/",
  "/faq/",
  "/accessibility/",
  "/security/",
  "/colophon/",
  "/sitemap/",
  // The wiki's host (wiki.localhost; see e2e/wiki.spec.ts).
  "wiki:/",
  "wiki:/skygrid/",
  "wiki:/skygrid/Wheat",
  "wiki:/skygrid/Category:Mobs",
  "wiki:/skygrid/No_such_page",
  "wiki:/skygrid/-/history/Main_Page",
  "wiki:/skygrid/-/edit/Main_Page",
  "wiki:/skygrid/-/recent",
  "wiki:/skygrid/-/pages",
  "wiki:/skygrid/-/components",
  "wiki:/skygrid/Wheat_Minion",
  "wiki:/skygrid/-/search?q=spider&fulltext=1",
];

/** A path, or "wiki:<path>" for the same path on the wiki's host. */
function address(path: string, baseURL: string | undefined): string {
  if (!path.startsWith("wiki:")) return path;
  const url = new URL(baseURL ?? "http://127.0.0.1:4329");
  url.hostname = "wiki.localhost";
  return url.origin + path.slice("wiki:".length);
}
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
        test(`${path} has no accessibility violations`, async ({
          page,
          baseURL,
        }) => {
          await page.goto(address(path, baseURL));
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
            // Samples of colors people pick (the Color tool's contrast preview)
            // may fail contrast on purpose.
            .exclude("[data-contrast-sample]")
            .analyze();

          expect(
            violations.map((v) => `${v.id} (${v.impact ?? "?"}): ${v.help}`),
          ).toEqual([]);
        });
      }
    });
  }
}
