import type { APIRoute } from "astro";
import { getDb } from "../lib/db";
import { shardData } from "../lib/skyblock/data";
import { shardPaths } from "../lib/skyblock/public";
import { SITE_URL } from "../lib/site";

export const prerender = false;

/**
 * Every SkyBlock shard's page (the list is in the build's sitemap). The shards come from the
 * synced data, so robots.txt points here; `lastmod` is when that version was read.
 */
export const GET: APIRoute = async ({ site }) => {
  const origin = site ?? SITE_URL;
  const data = await shardData(await getDb(), null);
  const lastmod = data.readAt
    ? `<lastmod>${data.readAt.toISOString()}</lastmod>`
    : "";
  const urls = shardPaths(data)
    .map(
      (path) => `<url><loc>${new URL(path, origin).href}</loc>${lastmod}</url>`,
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
