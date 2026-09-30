import type { APIRoute } from "astro";
import { PRIVATE_PATHS, SITE_URL } from "../lib/site";

/** The build's sitemap (static pages) and the server's (posts and tags). */
const SITEMAPS = ["sitemap-index.xml", "sitemap-posts.xml"];

export const GET: APIRoute = ({ site }) => {
  const sitemaps = SITEMAPS.map(
    (file) => `Sitemap: ${new URL(file, site ?? SITE_URL).href}\n`,
  ).join("");
  const disallow = PRIVATE_PATHS.map((path) => `Disallow: ${path}\n`).join("");
  return new Response(`User-agent: *\nAllow: /\n${disallow}\n${sitemaps}`, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
};
