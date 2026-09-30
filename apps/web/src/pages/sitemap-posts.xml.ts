import type { APIRoute } from "astro";
import { listPublicPosts, type BlogPost } from "../lib/blog/store";
import { getDb } from "../lib/db";
import { collectTags, hasTag, postHref, tagHref } from "../lib/posts";
import { TAG_INDEX_MIN_POSTS } from "../lib/seo";
import { SITE_URL } from "../lib/site";

export const prerender = false;

function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/** When a post last changed, as readers see it. */
function lastChanged(post: BlogPost): Date | undefined {
  return post.data.updatedDate ?? post.data.pubDate;
}

/** The newest change among some posts. */
function newest(posts: readonly BlogPost[]): Date | undefined {
  const times = posts
    .map((post) => lastChanged(post)?.getTime())
    .filter((time) => time !== undefined);
  return times.length > 0 ? new Date(Math.max(...times)) : undefined;
}

/**
 * Posts and tag pages (only tags with enough posts to be indexed). They live in the database, so the build-time sitemap
 * (sitemap-index.xml) can't list them; robots.txt points crawlers at both.
 */
export const GET: APIRoute = async ({ site }) => {
  const origin = site ?? SITE_URL;
  const posts = await listPublicPosts(await getDb());
  const entries = [
    ...posts.map((post) => ({
      loc: new URL(postHref(post.id), origin).href,
      lastmod: lastChanged(post),
    })),
    ...collectTags(posts)
      .filter((tag) => tag.count >= TAG_INDEX_MIN_POSTS)
      .map((tag) => ({
        loc: new URL(tagHref(tag.name), origin).href,
        lastmod: newest(posts.filter((post) => hasTag(post, tag.slug))),
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
