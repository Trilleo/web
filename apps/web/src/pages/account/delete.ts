import type { APIRoute } from "astro";
import { clearSessionCookie } from "../../lib/auth/cookies";
import { requireUser } from "../../lib/auth/guard";
import { noStoreRedirect } from "../../lib/auth/redirect";
import { field } from "../../lib/comments/form";
import { deleteAccount } from "../../lib/comments/store";
import { getDb } from "../../lib/db";
import { deleteAccountFiles } from "../../lib/storage/account";
import { getStorage } from "../../lib/storage/config";

export const prerender = false;

/** Deletes the signed-in account, its comments and files, once they've ticked the box. */
export const POST: APIRoute = async (context) => {
  const user = requireUser(context);
  if (user instanceof Response) return user;

  const form = await context.request.formData();
  if (field(form, "confirm") !== "yes") return noStoreRedirect("/account", 303);

  const db = await getDb();
  // Their stored files first: the bytes in the bucket, then the rows.
  await deleteAccountFiles(db, getStorage(), user.id);
  await deleteAccount(db, user.id);
  clearSessionCookie(context.cookies, context.url);
  return noStoreRedirect("/sign-in?account-deleted=1", 303);
};
