import { users } from "@trilleo/db";
import type { APIRoute } from "astro";
import { eq } from "drizzle-orm";
import { isAdmin, requireAdmin } from "../../lib/auth/guard";
import { noStoreRedirect } from "../../lib/auth/redirect";
import { field, parseId, parseUserId } from "../../lib/comments/form";
import {
  blockUser,
  isModerationAction,
  moderateComment,
  unblockUser,
} from "../../lib/comments/store";
import { getDb } from "../../lib/db";

export const prerender = false;

/** The admin's moderation buttons on /admin: comment actions, block, unblock. */
export const POST: APIRoute = async (context) => {
  const admin = requireAdmin(context);
  if (admin instanceof Response) return admin;

  const form = await context.request.formData();
  const action = field(form, "action");
  const db = await getDb();

  if (action === "block" || action === "unblock") {
    const userId = parseUserId(field(form, "user"));
    const [target] = userId
      ? await db.select().from(users).where(eq(users.id, userId)).limit(1)
      : [];
    if (!target || isAdmin(target)) {
      return new Response("That account can’t be blocked.", {
        status: 400,
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      });
    }
    if (action === "block") await blockUser(db, target.id);
    else await unblockUser(db, target.id);
    return noStoreRedirect("/admin#moderation", 303);
  }

  const id = parseId(field(form, "id"));
  if (id === null || !isModerationAction(action)) {
    return new Response("Unknown moderation action.", {
      status: 400,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }
  await moderateComment(db, id, action);
  return noStoreRedirect("/admin#moderation", 303);
};
