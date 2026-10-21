import type { APIRoute } from "astro";
import { getDb } from "../../lib/db";
import { avatarByHash } from "../../lib/profile/avatar";

export const prerender = false;

/**
 * GET /avatars/<sha256>: someone's picture. A new picture has a new address, but a
 * removed one should stop showing, so browsers keep it for a day, not forever.
 */
export const GET: APIRoute = async ({ params }) => {
  const avatar = await avatarByHash(await getDb(), params.hash ?? "");
  if (!avatar) {
    return new Response("Not found", {
      status: 404,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }
  return new Response(new Uint8Array(avatar.data), {
    headers: {
      "Content-Type": avatar.contentType,
      "Content-Length": String(avatar.size),
      "Cache-Control": "public, max-age=86400",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; sandbox",
    },
  });
};
