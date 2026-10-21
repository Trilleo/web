import type { APIRoute } from "astro";
import { getDb } from "../../../lib/db";
import { attachUpload } from "../../../lib/forum/attachments";

export const prerender = false;

const HEADERS = { "Cache-Control": "no-store" };
const problem = (status: number, error: string) =>
  Response.json({ error }, { status, headers: HEADERS });

/**
 * Keeps a forum upload that has just started for its uploader's next post (the
 * upload client's `onStarted`). JSON { file } in, { ok } out; same-origin only.
 */
export const POST: APIRoute = async ({ locals, request, url }) => {
  if (request.headers.get("origin") !== url.origin)
    return problem(403, "Changes can only come from this site.");
  if (!locals.user) return problem(401, "Sign in first.");
  const text = await request.text();
  if (text.length > 500) return problem(400, "That request is too big.");
  let fileId: unknown;
  try {
    fileId = (JSON.parse(text) as { file?: unknown }).file;
  } catch {
    return problem(400, "That isn’t JSON.");
  }
  if (typeof fileId !== "string" || !/^[A-Za-z0-9_-]{8,64}$/.test(fileId))
    return problem(400, "That request isn’t valid.");
  const result = await attachUpload(await getDb(), {
    userId: locals.user.id,
    fileId,
  });
  return result.ok
    ? Response.json({ ok: true }, { headers: HEADERS })
    : problem(result.status, result.error);
};
