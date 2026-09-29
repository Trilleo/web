import type { APIRoute } from "astro";
import { clearSessionCookie, readSessionToken } from "../../lib/auth/cookies";
import { noStoreRedirect } from "../../lib/auth/redirect";
import {
  invalidateSession,
  invalidateUserSessions,
} from "../../lib/auth/sessions";
import { getDb } from "../../lib/db";

export const prerender = false;

/**
 * Signs out: this browser, or with `everywhere=1` every browser. POST only, and
 * Astro's origin check rejects form posts from other sites.
 */
export const POST: APIRoute = async ({ request, locals, cookies, url }) => {
  const form = await request.formData();
  const token = readSessionToken(cookies, url);
  if (locals.user && form.get("everywhere") === "1") {
    await invalidateUserSessions(await getDb(), locals.user.id);
  } else if (token) {
    await invalidateSession(await getDb(), token);
  }
  clearSessionCookie(cookies, url);
  return noStoreRedirect("/sign-in?signed-out=1", 303);
};
