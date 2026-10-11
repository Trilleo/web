import type { APIRoute } from "astro";
import { wikiOrigin } from "../../lib/wiki/host";
import { wikiDb } from "../../lib/wiki/page";
import { allPages, listWikis } from "../../lib/wiki/store";
import { wikiHref } from "../../lib/wiki/wikis";

export const prerender = false;

function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Every page of every public wiki (redirects left out). */
export const GET: APIRoute = async ({ url }) => {
  const origin = wikiOrigin(url);
  const db = await wikiDb();
  const urls = [`${origin}/`];
  for (const { wiki } of await listWikis(db, null, false)) {
    if (wiki.visibility !== "public") continue;
    urls.push(`${origin}${wikiHref(wiki)}`);
    for (const page of await allPages(db, wiki)) {
      if (page.redirectTo || page.title === wiki.homeTitle) continue;
      urls.push(`${origin}${wikiHref(wiki, page.title)}`);
    }
  }
  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((loc) => `  <url><loc>${escapeXml(loc)}</loc></url>`).join("\n")}
</urlset>
`;
  return new Response(body, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
};
