import type { APIRoute } from "astro";
import { getDb } from "../../lib/db";
import { resolveCard } from "../../lib/og/cards";
import { renderCard } from "../../lib/og/render";

export const prerender = false;

/** Recently drawn images by URL (`?v=` included); drawing one takes ~100 ms. */
const cache = new Map<string, Uint8Array<ArrayBuffer>>();
const CACHE_SIZE = 100;

/** Share images for link previews (see lib/seo.ts). */
export const GET: APIRoute = async ({ params, url }) => {
  const resolved = await resolveCard(getDb, params.path ?? "");
  if (!resolved) return new Response("Not found", { status: 404 });

  let png = cache.get(resolved.href);
  if (png) {
    // Most recently used goes last; the oldest is evicted first.
    cache.delete(resolved.href);
  } else {
    png = await renderCard(resolved.card);
    if (cache.size >= CACHE_SIZE) {
      const oldest = cache.keys().next().value;
      if (oldest !== undefined) cache.delete(oldest);
    }
  }
  cache.set(resolved.href, png);

  // The current URL never changes what it shows, so it's cached for good. Old or
  // missing versions get today's image, briefly (previews made before an edit).
  const current = url.pathname + url.search === resolved.href;
  return new Response(png, {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": current
        ? "public, max-age=31536000, immutable"
        : "public, max-age=3600",
    },
  });
};
