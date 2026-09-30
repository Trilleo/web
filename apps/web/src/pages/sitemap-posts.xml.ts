import type { APIRoute } from "astro";
import { listPublicPosts } from "../lib/blog/store";
import { getDb } from "../lib/db";
import { collectTags, postHref, tagHref } from "../lib/posts";
import { SITE_URL } from "../lib/site";

export const prerender = false;

function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * Posts and tag pages. They live in the database, so the build-time sitemap
 * (sitemap-index.xml) can't list them; robots.txt points crawlers at both.
 */
export const GET: APIRoute = async ({ site }) => {
  const origin = site ?? SITE_URL;
  const posts = await listPublicPosts(await getDb());
  const entries = [
    ...posts.map((post) => ({
      loc: new URL(postHref(post.id), origin).href,
      lastmod: post.data.updatedDate ?? post.data.pubDate,
    })),
    ...collectTags(posts).map((tag) => ({
      loc: new URL(tagHref(tag.name), origin).href,
      lastmod: undefined,
    })),
  ];
  const urls = entries
    .map(
      ({ loc, lastmod }) =>
        `<url><loc>${escapeXml(loc)}</loc>${lastmod ? `<lastmod>${lastmod.toISOString()}</lastmod>` : ""}</url>`,
    )
    .join("");
  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`,
    {
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": "public, max-age=300",
      },
    },
  );
};
