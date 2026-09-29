import { expect, test } from "@playwright/test";

// The e2e build includes the draft posts (see playwright.config.ts).
const POST = "/writing/rebuilding-this-site/";
const POST_TITLE = "Rebuilding this site with Astro and a monorepo";

test("the index lists every post, numbered, linking to its page", async ({
  page,
}) => {
  await page.goto("/writing/");
  await expect(
    page.getByRole("heading", { level: 1, name: "Writing." }),
  ).toBeVisible();

  const rows = page.locator("[data-search-hides] ol > li");
  await expect(rows).toHaveCount(4);
  await expect(rows.first()).toContainText(/00\d/);

  await page.getByRole("link", { name: new RegExp(POST_TITLE) }).click();
  await expect(page).toHaveURL(POST);
  await expect(
    page.getByRole("heading", { level: 1, name: POST_TITLE }),
  ).toBeVisible();
});

test("home shows the latest posts and links to the full index", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator("#writing ol > li")).toHaveCount(4);
  await page
    .locator("#writing")
    .getByRole("link", { name: /All 4 posts/ })
    .click();
  await expect(page).toHaveURL("/writing/");
});

test.describe("post page on desktop", () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test("shows metadata, contents, and side notes in the margin", async ({
    page,
  }) => {
    await page.goto(POST);

    await expect(page.locator("dl")).toContainText("Draft");
    await expect(page.locator("dl")).toContainText(/\d+ min/);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
      "content",
      "noindex",
    );

    const contents = page.getByRole("navigation", { name: "Contents" });
    await expect(contents.getByRole("link")).toHaveText([
      /Starting over/,
      /The shape of the repo/,
      /Checks on every push/,
    ]);
    await contents.getByRole("link", { name: /Checks on every push/ }).click();
    await expect(page).toHaveURL(/#checks-on-every-push$/);

    // Side notes sit to the right of the text column; the footnotes list is visually hidden.
    const sidenote = page.locator(".sidenote").first();
    await expect(sidenote).toBeVisible();
    await expect(sidenote).toContainText("Turborepo hashes each task");
    const noteBox = await sidenote.boundingBox();
    const textBox = await page.locator(".prose > p").first().boundingBox();
    expect(noteBox && textBox && noteBox.x).toBeGreaterThan(
      (textBox?.x ?? 0) + (textBox?.width ?? 0),
    );
    await expect(page.locator("section[data-footnotes] ol")).toHaveCSS(
      "position",
      "static",
    );
    await expect(page.locator("section[data-footnotes]")).toHaveCSS(
      "position",
      "absolute",
    );
  });

  test("marks the section being read in the contents", async ({ page }) => {
    await page.goto(POST);
    const contents = page.getByRole("navigation", { name: "Contents" });
    const current = contents.locator('[aria-current="location"]');
    await expect(current).toHaveText(/Starting over/);

    await page.locator("#checks-on-every-push").scrollIntoViewIfNeeded();
    await page.mouse.wheel(0, 200);
    await expect(current).toHaveText(/Checks on every push/);
  });

  test("links to the neighbouring post and to its tags", async ({ page }) => {
    await page.goto(POST);
    await expect(
      page.getByRole("link", { name: /^(Next|Previous) — \d{3}/ }),
    ).toBeVisible();

    await page
      .getByRole("navigation", { name: "Post tags" })
      .getByRole("link", { name: "Astro" })
      .click();
    await expect(page).toHaveURL("/writing/tags/astro/");
    await expect(
      page.getByRole("heading", { level: 1, name: "Astro" }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: new RegExp(POST_TITLE) }),
    ).toBeVisible();
    await expect(page.locator("main ol > li")).toHaveCount(1);
  });
});

test.describe("post page on a phone", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("uses the footnotes list instead of side notes", async ({ page }) => {
    await page.goto(POST);
    await expect(page.locator(".sidenote").first()).toBeHidden();
    await expect(page.locator("section[data-footnotes]")).toBeVisible();
    await expect(
      page.getByRole("navigation", { name: "Contents" }),
    ).toBeHidden();
  });
});

test.describe("search", () => {
  test("finds posts by their text and replaces the list with results", async ({
    page,
  }) => {
    await page.goto("/writing/");
    await page
      .getByRole("searchbox", { name: "Search posts" })
      .fill("Turborepo");

    const results = page.locator("[data-search-results]");
    await expect(
      results.getByRole("link", { name: new RegExp(POST_TITLE) }),
    ).toBeVisible();
    await expect(page.locator("[data-search-hides]")).toBeHidden();
    await expect(page.getByText(/1 post matches “Turborepo”/)).toBeVisible();

    await page.getByRole("searchbox", { name: "Search posts" }).fill("");
    await expect(page.locator("[data-search-hides]")).toBeVisible();
  });

  test("says so when nothing matches", async ({ page }) => {
    await page.goto("/writing/");
    await page
      .getByRole("searchbox", { name: "Search posts" })
      .fill("zzqxnomatch");
    await expect(page.getByText(/No posts match “zzqxnomatch”/)).toBeVisible();
  });
});

test.describe("feeds", () => {
  test("RSS is valid XML and never includes drafts", async ({ request }) => {
    const response = await request.get("/rss.xml");
    expect(response.ok()).toBe(true);
    const xml = await response.text();
    expect(xml).toContain("<channel>");
    expect(xml).toContain("<title>Trilleo · Writing</title>");
    expect(xml).not.toContain("<item>");
  });

  test("sitemap and robots.txt point at the site URL", async ({ request }) => {
    expect((await request.get("/sitemap-index.xml")).ok()).toBe(true);
    const robots = await (await request.get("/robots.txt")).text();
    expect(robots).toContain(
      "Sitemap: https://www.trilleo.net/sitemap-index.xml",
    );
  });

  test("account pages stay out of search", async ({ request }) => {
    const robots = await (await request.get("/robots.txt")).text();
    for (const path of ["/admin", "/auth/", "/sign-in"]) {
      expect(robots).toContain(`Disallow: ${path}\n`);
    }
    const sitemap = await (await request.get("/sitemap-0.xml")).text();
    expect(sitemap).not.toMatch(/\/(admin|auth|sign-in)/);
  });
});
