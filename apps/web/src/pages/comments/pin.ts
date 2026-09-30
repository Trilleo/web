import type { APIRoute } from "astro";
import { requireAdmin } from "../../lib/auth/guard";
import { noStoreRedirect, safeNextPath } from "../../lib/auth/redirect";
import { field, parseId } from "../../lib/comments/form";
import { pinComment, unpinComment } from "../../lib/comments/store";
import { getDb } from "../../lib/db";

export const prerender = false;

/**
 * The admin pins a comment to the top of its post (replacing any other pin there), or
 * unpins it; then back where they were.
 */
export const POST: APIRoute = async (context) => {
  const admin = requireAdmin(context);
  if (admin instanceof Response) return admin;

  const form = await context.request.formData();
  const id = parseId(field(form, "id"));
  const action = field(form, "action");
  if (id === null || (action !== "pin" && action !== "unpin")) {
    return new Response("Unknown pin action.", {
      status: 400,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  const db = await getDb();
  if (action === "pin" && (await pinComment(db, id)) === null) {
    return new Response(
      "Only a published comment that isn’t a reply can be pinned.",
      { status: 400, headers: { "Content-Type": "text/plain; charset=utf-8" } },
    );
  }
  if (action === "unpin") await unpinComment(db, id);
  return noStoreRedirect(safeNextPath(field(form, "back")), 303);
};
