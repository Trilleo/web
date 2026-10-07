import type { APIRoute } from "astro";
import { isAdmin } from "../../../lib/auth/guard";
import { getDb } from "../../../lib/db";
import { cleanCaption } from "../../../lib/minecraft/input";
import { parseAttachRequest } from "../../../lib/minecraft/creator";
import { MC_LIMITS } from "../../../lib/minecraft/catalog";
import {
  attachGalleryImage,
  attachReleaseFile,
  getProject,
  getRelease,
} from "../../../lib/minecraft/store";

export const prerender = false;

const HEADERS = { "Cache-Control": "no-store" };
const problem = (status: number, error: string) =>
  Response.json({ error }, { status, headers: HEADERS });

/**
 * Attaches a file the creator has just started uploading to a release (as its main
 * file or an extra) or to the gallery: the upload client calls this before sending
 * any bytes (`onStarted`), so no upload is left belonging to nothing. JSON in,
 * { ok: true } out; same-origin only.
 */
export const POST: APIRoute = async ({ request, url, locals }) => {
  const user = locals.user;
  if (!user) return problem(401, "Sign in first.");
  if (request.headers.get("origin") !== url.origin)
    return problem(403, "Changes can only come from this site.");
  const text = await request.text();
  if (text.length > 2000) return problem(400, "That request is too big.");
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return problem(400, "That isn’t JSON.");
  }
  const input = parseAttachRequest(body);
  if (!input) return problem(400, "That request isn’t valid.");

  const db = await getDb();
  const project = await getProject(db, input.project);
  const admin = isAdmin(user);
  if (!project || (!admin && project.ownerId !== user.id))
    return problem(404, "There’s no such project.");

  if (input.release !== undefined) {
    const release = await getRelease(db, project.id, input.release);
    if (!release) return problem(404, "There’s no such release.");
    const result = await attachReleaseFile(
      db,
      project,
      release,
      input.file,
      input.primary ?? false,
    );
    return result.ok
      ? Response.json({ ok: true }, { headers: HEADERS })
      : problem(result.status, result.error);
  }

  const caption = cleanCaption(input.caption ?? "");
  if (caption === null)
    return problem(
      400,
      `Captions can be at most ${String(MC_LIMITS.caption)} characters.`,
    );
  const result = await attachGalleryImage(
    db,
    project,
    { userId: user.id, isAdmin: admin },
    input.file,
    caption,
  );
  return result.ok
    ? Response.json({ ok: true }, { headers: HEADERS })
    : problem(result.status, result.error);
};
