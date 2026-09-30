import type { APIRoute } from "astro";
import { indexNowKey } from "../lib/indexnow";

export const prerender = false;

/** IndexNow's key file (/<key>.txt): proves the site's pings are really its own. */
export const GET: APIRoute = ({ params }) => {
  const key = indexNowKey();
  if (!key || params.indexnow !== key) {
    return new Response("Not found", { status: 404 });
  }
  return new Response(key, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
};
