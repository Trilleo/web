import type { APIRoute } from "astro";
import { setSessionCookie } from "../../../lib/auth/cookies";
import { noStoreRedirect } from "../../../lib/auth/redirect";
import { getDb } from "../../../lib/db";
import {
  redeemTicket,
  takeHandoffState,
  wikiNext,
} from "../../../lib/wiki/handoff";

export const prerender = false;

/**
 * Back from the main site with a ticket: if it was issued to this browser, it
 * becomes a session on the wiki's host. Otherwise nothing happens (signed out).
 */
export const GET: APIRoute = async ({ cookies, url, request }) => {
  const next = wikiNext(url.searchParams.get("next"));
  const state = takeHandoffState(cookies, url);
  const session = await redeemTicket(await getDb(), {
    ticket: url.searchParams.get("ticket") ?? "",
    state,
    userAgent: request.headers.get("user-agent"),
  });
  if (!session) {
    const separator = next.includes("?") ? "&" : "?";
    return noStoreRedirect(`${next}${separator}signed-in=failed`);
  }
  setSessionCookie(cookies, url, session.token, session.expiresAt);
  return noStoreRedirect(next);
};
