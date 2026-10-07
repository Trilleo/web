import { FILE_ID_PATTERN } from "@trilleo/storage";
import type { APIRoute } from "astro";
import { isAdmin } from "../../../lib/auth/guard";
import { getDb } from "../../../lib/db";
import { previewBytes } from "../../../lib/minecraft/previews";

export const prerender = false;

/**
 * A build's 3D preview (gzipped; the viewer unpacks it), cached for a day while its
 * file is public; its owner also gets it before then, uncached.
 */
export const GET: APIRoute = async ({ params, locals }) => {
  const fileId = params.file ?? "";
  if (!FILE_ID_PATTERN.test(fileId))
    return new Response("Not found", { status: 404 });
  const user = locals.user;
  const viewer = { userId: user?.id ?? null, isAdmin: isAdmin(user) };
  const db = await getDb();
  const preview = await previewBytes(db, fileId, viewer);
  if (!preview) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(preview.data), {
    headers: {
      "Content-Type": "application/octet-stream",
      // A day, like public files, so a takedown reaches browsers.
      "Cache-Control": preview.isPublic
        ? "public, max-age=86400"
        : "private, no-store",
      "X-Robots-Tag": "noindex",
    },
  });
};
