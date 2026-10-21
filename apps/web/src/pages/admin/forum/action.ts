import type { APIRoute } from "astro";
import { requireAdmin } from "../../../lib/auth/guard";
import { noStoreRedirect } from "../../../lib/auth/redirect";
import { field, parseId } from "../../../lib/comments/form";
import { getDb } from "../../../lib/db";
import { deleteForum, moveForum } from "../../../lib/forum/admin";
import { liftBan } from "../../../lib/forum/moderation";
import { loadTree } from "../../../lib/forum/store";

export const prerender = false;

const PROBLEMS = {
  "has-children": "It still has forums inside it.",
  "has-topics": "It still has topics (deleted ones count too).",
} as const;

/**
 * The admin's buttons on the forum tree: move a forum up or down among its
 * siblings, or delete an empty one (ticked to confirm); and lifting a ban
 * (`action=lift`, `ban`). Back to /admin/forum/.
 */
export const POST: APIRoute = async (context) => {
  const admin = requireAdmin(context);
  if (admin instanceof Response) return admin;
  const form = await context.request.formData();
  const db = await getDb();
  const finish = (query: string) =>
    noStoreRedirect(`/admin/forum/?${query}`, 303);
  if (field(form, "action") === "lift") {
    const banId = parseId(field(form, "ban"));
    if (banId !== null) await liftBan(db, { banId, by: admin });
    return finish("tab=bans&done=lifted");
  }
  const tree = await loadTree(db);
  const forum = tree.get(parseId(field(form, "forum")) ?? 0)?.forum;
  if (!forum)
    return finish(`error=${encodeURIComponent("There’s no such forum.")}`);

  const action = field(form, "action");
  if (action === "up" || action === "down") {
    await moveForum(db, tree, forum, action);
    return finish("done=moved");
  }
  if (action === "delete") {
    if (field(form, "confirm") !== "yes")
      return noStoreRedirect(`/admin/forum/${String(forum.id)}/`, 303);
    const problem = await deleteForum(db, tree, forum);
    if (problem)
      return noStoreRedirect(
        `/admin/forum/${String(forum.id)}/?error=${encodeURIComponent(PROBLEMS[problem])}`,
        303,
      );
    return finish("done=deleted");
  }
  return finish(`error=${encodeURIComponent("Unknown action.")}`);
};
