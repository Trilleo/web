import type { APIRoute } from "astro";
import { isAdmin, requireUser } from "../../lib/auth/guard";
import { noStoreRedirect, safeNextPath } from "../../lib/auth/redirect";
import { field, parseId } from "../../lib/comments/form";
import { deleteComment } from "../../lib/comments/store";
import { getDb } from "../../lib/db";

export const prerender = false;

/** Deletes a comment, for its author or the admin; then back where they were. */
export const POST: APIRoute = async (context) => {
  const user = requireUser(context);
  if (user instanceof Response) return user;

  const form = await context.request.formData();
  const back = safeNextPath(field(form, "back"));
  const id = parseId(field(form, "id"));
  if (id !== null) {
    const result = await deleteComment(await getDb(), {
      id,
      by: user,
      isAdmin: isAdmin(user),
    });
    if (!result.ok && result.error === "forbidden") {
      return new Response("That comment isn’t yours to delete.", {
        status: 403,
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      });
    }
  }
  return noStoreRedirect(back, 303);
};
