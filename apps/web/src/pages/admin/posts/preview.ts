import type { APIRoute } from "astro";
import { requireAdmin } from "../../../lib/auth/guard";
import { POST_LIMITS } from "../../../lib/blog/input";
import { renderPost } from "../../../lib/blog/render";
import { addSidenotes } from "../../../lib/post-html";

export const prerender = false;

const HEADERS = { "Cache-Control": "private, no-store" };

/**
 * POST {"body": "<markdown>"} → {"html": …}: the editor's live preview, rendered
 * exactly as the post page renders it (side notes included).
 */
export const POST: APIRoute = async (context) => {
  const admin = requireAdmin(context);
  if (admin instanceof Response) return admin;
  // JSON posts skip Astro's form origin check; only the editor may use this.
  if (context.request.headers.get("origin") !== context.url.origin) {
    return Response.json(
      { error: "Only this site can ask." },
      { status: 403, headers: HEADERS },
    );
  }

  let body: unknown;
  try {
    body = ((await context.request.json()) as { body?: unknown }).body;
  } catch {
    body = undefined;
  }
  if (typeof body !== "string" || body.length > POST_LIMITS.body) {
    return Response.json(
      { error: "Send the Markdown as body." },
      { status: 400, headers: HEADERS },
    );
  }
  const { html } = await renderPost(body);
  return Response.json({ html: addSidenotes(html) }, { headers: HEADERS });
};
