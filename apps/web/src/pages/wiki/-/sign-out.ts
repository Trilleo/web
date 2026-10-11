import type { APIRoute } from "astro";
import {
  clearSessionCookie,
  readSessionToken,
} from "../../../lib/auth/cookies";
import { noStoreRedirect } from "../../../lib/auth/redirect";
import { invalidateSession } from "../../../lib/auth/sessions";
import { getDb } from "../../../lib/db";
import { wikiNext } from "../../../lib/wiki/handoff";

export const prerender = false;

/** Signs this browser out of the wiki (the main site's session is its own). */
export const POST: APIRoute = async ({ request, cookies, url }) => {
  const form = await request.formData();
  const token = readSessionToken(cookies, url);
  if (token) await invalidateSession(await getDb(), token);
  clearSessionCookie(cookies, url);
  const next = form.get("next");
  return noStoreRedirect(wikiNext(typeof next === "string" ? next : null), 303);
};
