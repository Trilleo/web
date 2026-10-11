import type { APIRoute } from "astro";
import { attachWikiFile } from "../../../../../lib/wiki/files";
import { openWiki, wikiSlugOf } from "../../../../../lib/wiki/page";

export const prerender = false;

const HEADERS = { "Cache-Control": "no-store" };
const problem = (status: number, error: string) =>
  Response.json({ error }, { status, headers: HEADERS });

/**
 * Attaches a picture a member has just started uploading to their wiki (the upload
 * client's `onStarted`, before any bytes are sent). JSON { file } in, { ok } out;
 * same-origin only.
 */
export const POST: APIRoute = async (context) => {
  const { request, url } = context;
  if (request.headers.get("origin") !== url.origin)
    return problem(403, "Changes can only come from this site.");
  const wiki = await openWiki(context, wikiSlugOf(context));
  if (!wiki) return problem(404, "There’s no such wiki.");
  if (!wiki.user) return problem(401, "Sign in first.");
  if (!wiki.access.edit)
    return problem(403, "Only this wiki’s members can upload pictures.");
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
  const result = await attachWikiFile(wiki.db, {
    wikiId: wiki.wiki.id,
    userId: wiki.user.id,
    fileId,
  });
  return result.ok
    ? Response.json({ ok: true }, { headers: HEADERS })
    : problem(result.status, result.error);
};
