import type { APIRoute } from "astro";
import { PRIVATE_PATHS, SITE_URL } from "../lib/site";

export const GET: APIRoute = ({ site }) => {
  const sitemap = new URL("sitemap-index.xml", site ?? SITE_URL).href;
  const disallow = PRIVATE_PATHS.map((path) => `Disallow: ${path}\n`).join("");
  return new Response(
    `User-agent: *\nAllow: /\n${disallow}\nSitemap: ${sitemap}\n`,
    {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    },
  );
};
