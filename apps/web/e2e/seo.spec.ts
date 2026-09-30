import { expect, test, type Page } from "@playwright/test";

// A post e2e/posts.setup.ts publishes before the specs run.
const POST = "/writing/rebuilding-this-site/";
const POST_TITLE = "Rebuilding this site with Astro and a monorepo";

function meta(page: Page, key: string) {
  return page
    .locator(`meta[property="${key}"], meta[name="${key}"]`)
    .first()
    .getAttribute("content");
}

async function jsonLdTypes(page: Page): Promise<string[]> {
  const text = await page
    .locator('script[type="application/ld+json"]')
    .textContent();
  const data = JSON.parse(text ?? "{}") as { "@graph": { "@type": string }[] };
  return data["@graph"].map((item) => item["@type"]);
}

test("a post describes itself to search engines and link previews", async ({
  page,
  request,
}) => {
  await page.goto(POST);
  expect(await meta(page, "og:type")).toBe("article");
  expect(await meta(page, "og:title")).toBe(POST_TITLE);
  expect(await meta(page, "og:url")).toBe(`https://www.trilleo.net${POST}`);
  expect(await meta(page, "twitter:card")).toBe("summary_large_image");
  expect(await meta(page, "article:published_time")).toMatch(/^\d{4}-/);
  expect(await meta(page, "description")).toBeTruthy();
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    "href",
    `https://www.trilleo.net${POST}`,
  );
  expect(await jsonLdTypes(page)).toEqual(["BlogPosting", "BreadcrumbList"]);

  // The share image is a 1200×630 PNG, cached for good at its current URL.
  const image = new URL((await meta(page, "og:image")) ?? "");
  expect(image.pathname).toBe("/og/posts/rebuilding-this-site.png");
  const response = await request.get(image.pathname + image.search);
  expect(response.status()).toBe(200);
  expect(response.headers()["content-type"]).toBe("image/png");
  expect(response.headers()["cache-control"]).toContain("immutable");
  const png = await response.body();
  expect(png.readUInt32BE(16)).toBe(1200);
  expect(png.readUInt32BE(20)).toBe(630);
});

test("share images exist only for public things", async ({ request }) => {
  const site = await request.get("/og/site.png");
  expect(site.status()).toBe(200);
  // No or an old version: still the image, but not cached for good.
  expect(site.headers()["cache-control"]).not.toContain("immutable");
  expect((await request.get("/og/tools/notes.png")).status()).toBe(200);
  expect((await request.get("/og/posts/no-such-post.png")).status()).toBe(404);
  expect((await request.get("/og/people/admin.png")).status()).toBe(404);
});

test("the home page names the site and its author", async ({ page }) => {
  await page.goto("/");
  expect(await jsonLdTypes(page)).toEqual(["WebSite", "Person"]);
  expect(await meta(page, "og:type")).toBe("website");
  expect(await meta(page, "og:image")).toMatch(/\/og\/site\.png\?v=/);
});

test("a tool's page has its own card and structured data", async ({ page }) => {
  await page.goto("/tools/notes/");
  expect(await meta(page, "og:image")).toMatch(/\/og\/tools\/notes\.png\?v=/);
  expect(await jsonLdTypes(page)).toEqual(["WebApplication", "BreadcrumbList"]);
});

test("search results and missing pages stay out of the index", async ({
  page,
}) => {
  await page.goto("/writing/");
  await expect(page.locator('meta[name="robots"]')).toHaveCount(0);

  await page.goto("/writing/?q=astro");
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
    "content",
    "noindex",
  );
  await expect(page.locator('link[rel="canonical"]')).toHaveCount(0);

  const missing = await page.goto("/writing/no-such-post/");
  expect(missing?.status()).toBe(404);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
    "content",
    "noindex",
  );
});

test("the posts sitemap lists posts, not thin tag pages", async ({
  request,
}) => {
  const xml = await (await request.get("/sitemap-posts.xml")).text();
  expect(xml).toContain(`https://www.trilleo.net${POST}`);
  // Every tag listed has a lastmod (the newest of its posts).
  for (const entry of xml.match(/<url>.*?<\/url>/g) ?? []) {
    if (entry.includes("/writing/tags/")) expect(entry).toContain("<lastmod>");
  }
});
