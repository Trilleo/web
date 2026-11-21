import type { APIRoute } from "astro";
import { currentPrices } from "../../../lib/skyblock/bazaar";
import { getDb } from "../../../lib/db";

export const prerender = false;

/**
 * The shards' latest Bazaar prices for the fusion calculator's coin mode
 * (lib/skyblock/bazaar.ts): `prices` is null until the server's first fetch. The same
 * for everyone; revalidated by ETag (the fetch's time).
 */
export const GET: APIRoute = async ({ request }) => {
  const current = await currentPrices(await getDb());
  const etag = `"${current ? String(current.fetchedAt.getTime()) : "none"}"`;
  const headers = {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "public, max-age=60, must-revalidate",
    ETag: etag,
  };
  if (request.headers.get("If-None-Match") === etag)
    return new Response(null, { status: 304, headers });
  return new Response(
    JSON.stringify(
      current
        ? {
            fetchedAt: current.fetchedAt.toISOString(),
            hypixelAt: current.hypixelAt.toISOString(),
            prices: current.prices,
          }
        : { fetchedAt: null, hypixelAt: null, prices: null },
    ),
    { headers },
  );
};
