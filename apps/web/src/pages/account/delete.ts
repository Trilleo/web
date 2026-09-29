import type { APIRoute } from "astro";
import { clearSessionCookie } from "../../lib/auth/cookies";
import { requireUser } from "../../lib/auth/guard";
import { noStoreRedirect } from "../../lib/auth/redirect";
import { field } from "../../lib/comments/form";
import { deleteAccount } from "../../lib/comments/store";
import { getDb } from "../../lib/db";

export const prerender = false;

/** Deletes the signed-in account and its comments, once they've ticked the box. */
export const POST: APIRoute = async (context) => {
  const user = requireUser(context);
  if (user instanceof Response) return user;

  const form = await context.request.formData();
  if (field(form, "confirm") !== "yes") return noStoreRedirect("/account", 303);

  await deleteAccount(await getDb(), user.id);
  clearSessionCookie(context.cookies, context.url);
  return noStoreRedirect("/sign-in?account-deleted=1", 303);
};
