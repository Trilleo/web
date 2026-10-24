import type { APIRoute } from "astro";
import { siteBuildDeps } from "../../../lib/chunithm/build";
import { LIST_JACKETS, wantJackets } from "../../../lib/chunithm/jackets";

export const prerender = false;

/**
 * POST /api/chunithm/jackets with `{ "songs": [SEGA song IDs] }`: the tool's lists
 * ask for the missing jackets of the songs they show. They're copied in the
 * background (lib/chunithm/jackets.ts `wantJackets`); the index has them once done.
 * Answers 202 `{ taken }`. Public, same-origin (the middleware's check), and bounded
 * by LIST_JACKETS: one worker per server, one sdvx.in request at a time.
 */
export const POST: APIRoute = async ({ request }) => {
  const noStore = { "Cache-Control": "no-store" };
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json(
      { error: "Not JSON." },
      { status: 400, headers: noStore },
    );
  }
  const songs =
    typeof body === "object" && body !== null && "songs" in body
      ? body.songs
      : null;
  if (
    !Array.isArray(songs) ||
    songs.length > LIST_JACKETS.perRequest ||
    !songs.every((id) => Number.isSafeInteger(id) && id >= 0)
  )
    return Response.json(
      { error: `Send up to ${String(LIST_JACKETS.perRequest)} song IDs.` },
      { status: 400, headers: noStore },
    );
  const deps = await siteBuildDeps();
  if (!deps)
    return Response.json({ taken: 0 }, { status: 503, headers: noStore });
  const taken = wantJackets(deps, songs as number[]);
  return Response.json({ taken }, { status: 202, headers: noStore });
};
