import type { APIRoute } from "astro";
import { getDb } from "../../../lib/db";
import { shardData } from "../../../lib/skyblock/data";
import { deckFile } from "../../../lib/skyblock/deck";
import { getStorage } from "../../../lib/storage/config";

export const prerender = false;

/**
 * The fusion calculator's shard data (lib/skyblock/deck.ts): public, the same for
 * everyone, revalidated by ETag so an unchanged copy costs a 304.
 */
export const GET: APIRoute = async ({ request }) => {
  const file = deckFile(await shardData(await getDb(), getStorage()));
  const etag = `"${file.version}"`;
  const headers = {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "public, max-age=0, must-revalidate",
    ETag: etag,
  };
  if (request.headers.get("If-None-Match") === etag)
    return new Response(null, { status: 304, headers });
  return new Response(file.body, { headers });
};
