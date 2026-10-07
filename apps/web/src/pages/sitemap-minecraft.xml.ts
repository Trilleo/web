import type { APIRoute } from "astro";
import { getDb } from "../lib/db";
import { PROJECT_TYPES } from "../lib/minecraft/catalog";
import {
  MINECRAFT_PATH,
  projectPath,
  releasesPath,
  typePath,
} from "../lib/minecraft/paths";
import { listedProjectPaths } from "../lib/minecraft/store";
import { SITE_URL } from "../lib/site";

export const prerender = false;

function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * The Minecraft platform: its front page, the listings, and every listed project with
 * its releases page. Projects live in the database, so robots.txt points here.
 */
export const GET: APIRoute = async ({ site }) => {
  const origin = site ?? SITE_URL;
  const projects = await listedProjectPaths(await getDb());
  const newest = projects[0]?.updatedAt;
  const entries: { loc: string; lastmod?: Date | undefined }[] = [
    { loc: MINECRAFT_PATH, lastmod: newest },
    ...PROJECT_TYPES.map((info) => ({
      loc: typePath(info.type),
      lastmod: projects.find((project) => project.type === info.type)
        ?.updatedAt,
    })),
    ...projects.flatMap((project) => [
      { loc: projectPath(project), lastmod: project.updatedAt },
      { loc: releasesPath(project), lastmod: project.updatedAt },
    ]),
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
