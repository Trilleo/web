import { FORUM_LIMITS } from "@trilleo/forum";
import type { APIRoute } from "astro";
import { getDb } from "../../../lib/db";
import { renderBody } from "../../../lib/forum/store";

export const prerender = false;

/**
 * POST {body}: a post's HTML as it would be saved, for the live preview. Signed-in
 * people only, from this site.
 */
export const POST: APIRoute = async ({ locals, request, url }) => {
  const headers = { "Cache-Control": "private, no-store" };
  if (!locals.user)
    return Response.json({ error: "Sign in first." }, { status: 401, headers });
  if (request.headers.get("origin") !== url.origin)
    return Response.json(
      { error: "Not from this site." },
      { status: 403, headers },
    );
  let body = "";
  try {
    const input = (await request.json()) as unknown;
    if (input !== null && typeof input === "object") {
      const value = (input as Record<string, unknown>).body;
      if (typeof value === "string")
        body = value.slice(0, FORUM_LIMITS.body.max);
    }
  } catch {
    return Response.json({ error: "Not JSON." }, { status: 400, headers });
  }
  return Response.json(
    { html: await renderBody(await getDb(), body) },
    { headers },
  );
};
