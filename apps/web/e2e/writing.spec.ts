import { expect, test } from "@playwright/test";

// e2e/posts.setup.ts publishes the imported posts before these run. Other specs
// publish posts of their own in parallel, so counts here are lower bounds.
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
  expect(await rows.count()).toBeGreaterThanOrEqual(4);
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
    .getByRole("link", { name: /All \d+ posts/ })
    .click();
  await expect(page).toHaveURL("/writing/");
});

test.describe("post page on desktop", () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test("shows metadata, contents, and side notes in the margin", async ({
    page,
  }) => {
    await page.goto(POST);

    await expect(page.locator("dl")).toContainText("Published");
    await expect(page.locator("dl")).toContainText(/\d+ min/);
    await expect(page.locator('meta[name="robots"]')).toHaveCount(0);

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

  test("sets the text in the self-hosted serif and headings in the grotesk", async ({
    page,
  }) => {
    await page.goto(POST);

    await expect(page.locator(".prose > p").first()).toHaveCSS(
      "font-family",
      /^"Source Serif 4 Variable"/,
    );
    await expect(page.locator(".prose h2").first()).toHaveCSS(
      "font-family",
      /^"Schibsted Grotesk Variable"/,
    );
    // The face actually loads (from this site, not a system Georgia).
    expect(
      await page.evaluate(async () => {
        await document.fonts.ready;
        return document.fonts.check('1rem "Source Serif 4 Variable"');
      }),
    ).toBe(true);
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

test("unknown posts and tags are 404s", async ({ request }) => {
  expect((await request.get("/writing/no-such-post/")).status()).toBe(404);
  expect((await request.get("/writing/tags/no-such-tag/")).status()).toBe(404);
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
    await expect(page).toHaveURL("/writing/?q=Turborepo");

    await page.getByRole("searchbox", { name: "Search posts" }).fill("");
    await expect(page.locator("[data-search-hides]")).toBeVisible();
  });

  test("works without JavaScript, from the address", async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();
    await page.goto("/writing/?q=Turborepo");
    await expect(
      page
        .locator("[data-search-results]")
        .getByRole("link", { name: new RegExp(POST_TITLE) }),
    ).toBeVisible();
    await expect(page.locator("[data-search-results] mark").first()).toHaveText(
      /Turborepo/i,
    );
    await context.close();
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
  test("RSS carries published posts in full", async ({ request }) => {
    const response = await request.get("/rss.xml");
    expect(response.ok()).toBe(true);
    const xml = await response.text();
    expect(xml).toContain("<channel>");
    expect(xml).toContain("<title>Trilleo Network · Writing</title>");
    expect(xml).toContain(`<title>${POST_TITLE}</title>`);
    expect(xml).toContain("content:encoded");
  });

  test("sitemaps and robots.txt point at the site URL", async ({ request }) => {
    expect((await request.get("/sitemap-index.xml")).ok()).toBe(true);
    const posts = await (await request.get("/sitemap-posts.xml")).text();
    expect(posts).toContain(`https://www.trilleo.net${POST}`);
    expect(posts).toContain("https://www.trilleo.net/writing/tags/astro/");
    const robots = await (await request.get("/robots.txt")).text();
    expect(robots).toContain(
      "Sitemap: https://www.trilleo.net/sitemap-index.xml",
    );
    expect(robots).toContain(
      "Sitemap: https://www.trilleo.net/sitemap-posts.xml",
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
