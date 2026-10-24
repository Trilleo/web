import type { APIRoute } from "astro";
import { songIndex } from "../../../lib/chunithm/viewer";
import { getDb } from "../../../lib/db";
import { getStorage } from "../../../lib/storage/config";

export const prerender = false;

/**
 * GET /api/chunithm/index.json: the CHUNITHM catalog for the tool's search (songs,
 * their charts, versions). Public, cached a few minutes; the ETag changes with each
 * catalog update.
 */
export const GET: APIRoute = async ({ request }) => {
  const { index, key } = await songIndex(await getDb(), getStorage());
  const etag = `"chuni-${key}"`;
  const headers = {
    "Cache-Control": "public, max-age=300",
    ETag: etag,
  };
  if (request.headers.get("if-none-match") === etag)
    return new Response(null, { status: 304, headers });
  return Response.json(index, { headers });
};
