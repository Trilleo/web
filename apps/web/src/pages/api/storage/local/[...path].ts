import { LocalDriver } from "@trilleo/storage/server";
import type { APIRoute } from "astro";
import { getStorage } from "../../../../lib/storage/config";

export const prerender = false;

/**
 * The local storage driver's URLs (dev and e2e): part uploads, public files and
 * signed downloads. With OBS in production, this answers 404 for everything.
 */
export const ALL: APIRoute = ({ request, params }) => {
  const storage = getStorage();
  if (!(storage instanceof LocalDriver)) {
    return new Response("Not found", {
      status: 404,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }
  return storage.handle(request, params.path ?? "");
};
