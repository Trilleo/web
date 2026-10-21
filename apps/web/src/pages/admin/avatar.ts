import type { APIRoute } from "astro";
import { requireAdmin } from "../../lib/auth/guard";
import { noStoreRedirect, safeNextPath } from "../../lib/auth/redirect";
import { field, parseUserId } from "../../lib/comments/form";
import { getDb } from "../../lib/db";
import { removeAvatar } from "../../lib/profile/avatar";

export const prerender = false;

/** The admin takes someone's picture down (from their profile page). Back to `back`. */
export const POST: APIRoute = async (context) => {
  const admin = requireAdmin(context);
  if (admin instanceof Response) return admin;
  const form = await context.request.formData();
  const userId = parseUserId(field(form, "user"));
  if (userId) await removeAvatar(await getDb(), userId);
  return noStoreRedirect(safeNextPath(field(form, "back") || "/admin/"), 303);
};
