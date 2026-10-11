import type { APIRoute } from "astro";
import { wikiOrigin } from "../../lib/wiki/host";

export const prerender = false;

/** The wiki's robots.txt: pages yes; editing, histories and other tools no. */
export const GET: APIRoute = ({ url }) => {
  const origin = wikiOrigin(url);
  const body = [
    "User-agent: *",
    "Allow: /",
    "Disallow: /-/",
    "Disallow: /*/-/",
    "",
    `Sitemap: ${origin}/sitemap.xml`,
    "",
  ].join("\n");
  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
};
