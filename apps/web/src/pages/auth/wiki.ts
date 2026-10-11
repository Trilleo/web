import type { APIRoute } from "astro";
import { noStoreRedirect } from "../../lib/auth/redirect";
import { getDb } from "../../lib/db";
import { isState, issueTicket, wikiNext } from "../../lib/wiki/handoff";
import { wikiOrigin } from "../../lib/wiki/host";

export const prerender = false;

/**
 * The wiki asks for a sign-in (lib/wiki/handoff.ts): signed in here, this hands it a
 * one-time ticket for the browser holding `state`; otherwise sign in first and come
 * back. A GET, but all it can do is sign the asking browser in as this account.
 */
export const GET: APIRoute = async ({ url, locals }) => {
  const state = url.searchParams.get("state");
  const next = wikiNext(url.searchParams.get("next"));
  const wiki = wikiOrigin(url);
  if (!isState(state)) return noStoreRedirect(`${wiki}${next}`);
  if (!locals.user) {
    return noStoreRedirect(
      `/sign-in?next=${encodeURIComponent(url.pathname + url.search)}`,
    );
  }
  const ticket = await issueTicket(await getDb(), locals.user.id, state);
  const params = new URLSearchParams({ ticket, next });
  return noStoreRedirect(`${wiki}/-/auth?${params.toString()}`);
};
