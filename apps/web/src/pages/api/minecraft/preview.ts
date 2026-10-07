import { MAX_PREVIEW_BYTES } from "@trilleo/mc-files";
import { FILE_ID_PATTERN } from "@trilleo/storage";
import type { APIRoute } from "astro";
import { isAdmin } from "../../../lib/auth/guard";
import { getDb } from "../../../lib/db";
import { storePreview } from "../../../lib/minecraft/previews";

export const prerender = false;

const HEADERS = { "Cache-Control": "no-store" };
const problem = (status: number, error: string) =>
  Response.json({ error }, { status, headers: HEADERS });

/**
 * POST /api/minecraft/preview?file=<id>: a build file's 3D preview, made by its
 * owner's browser (gzipped, application/octet-stream). Same-origin only; checked by
 * decoding it before it's kept.
 */
export const POST: APIRoute = async ({ request, url, locals }) => {
  const user = locals.user;
  if (!user) return problem(401, "Sign in first.");
  if (request.headers.get("origin") !== url.origin)
    return problem(403, "Changes can only come from this site.");
  const fileId = url.searchParams.get("file") ?? "";
  if (!FILE_ID_PATTERN.test(fileId))
    return problem(404, "There’s no such file.");
  const length = Number(request.headers.get("content-length") ?? "0");
  if (length > MAX_PREVIEW_BYTES)
    return problem(413, "That preview is too big.");
  const body = new Uint8Array(await request.arrayBuffer());
  if (body.length > MAX_PREVIEW_BYTES)
    return problem(413, "That preview is too big.");
  const result = await storePreview(
    await getDb(),
    { userId: user.id, isAdmin: isAdmin(user) },
    fileId,
    body,
  );
  return result.ok
    ? Response.json(
        { ok: true, blocks: result.value.blocks },
        { status: 201, headers: HEADERS },
      )
    : problem(result.status, result.error);
};
