import type { APIRoute } from "astro";
import { getMedia, mediaUrl, parseMediaFile } from "../../lib/blog/media";
import { getDb } from "../../lib/db";

export const prerender = false;

/**
 * GET /media/<sha256>.<ext>: an image uploaded in the post editor. The name is the
 * hash of the bytes, so it can be cached forever (by browsers and Cloudflare).
 */
export const GET: APIRoute = async ({ params }) => {
  const parsed = parseMediaFile(params.file ?? "");
  const item = parsed ? await getMedia(await getDb(), parsed.id) : undefined;
  if (!item || mediaUrl(item) !== `/media/${params.file ?? ""}`) {
    return new Response("Not found", {
      status: 404,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }
  return new Response(new Uint8Array(item.data), {
    headers: {
      "Content-Type": item.contentType,
      "Content-Length": String(item.size),
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; sandbox",
    },
  });
};
