import { forumPath, topicPath } from "@trilleo/forum";
import type { APIRoute } from "astro";
import { getDb } from "../lib/db";
import { sitemapTopics } from "../lib/forum/feeds";
import { loadTree } from "../lib/forum/store";
import { SITE_URL } from "../lib/site";

export const prerender = false;

function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/** The forum's public pages: the index, every forum visitors see, and their topics. */
export const GET: APIRoute = async ({ site }) => {
  const origin = site ?? SITE_URL;
  const db = await getDb();
  const tree = await loadTree(db);
  const visible = tree.visible(null);
  const entries = [
    { loc: "/forum/", lastmod: undefined as Date | undefined },
    ...visible.flat().map((node) => ({
      loc: forumPath(node.forum),
      lastmod: node.lastPostAt ?? undefined,
    })),
    ...(await sitemapTopics(db, tree)).map((row) => ({
      loc: topicPath(row.forum, row.topic),
      lastmod: row.topic.lastPostAt,
    })),
  ];
  const urls = entries
    .map(
      ({ loc, lastmod }) =>
        `<url><loc>${escapeXml(new URL(loc, origin).href)}</loc>${lastmod ? `<lastmod>${lastmod.toISOString()}</lastmod>` : ""}</url>`,
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
