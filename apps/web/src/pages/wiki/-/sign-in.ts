import type { APIRoute } from "astro";
import { noStoreRedirect } from "../../../lib/auth/redirect";
import { beginHandoff, wikiNext } from "../../../lib/wiki/handoff";
import { mainOrigin } from "../../../lib/wiki/host";

export const prerender = false;

/**
 * Signing in on the wiki starts on the main site, where accounts live
 * (lib/wiki/handoff.ts): this browser gets a state, the main site a request for a
 * ticket. Already signed in here: straight on.
 */
export const GET: APIRoute = ({ cookies, url, locals }) => {
  const next = wikiNext(url.searchParams.get("next"));
  if (locals.user) return noStoreRedirect(next);
  const state = beginHandoff(cookies, url);
  const params = new URLSearchParams({ state, next });
  return noStoreRedirect(`${mainOrigin(url)}/auth/wiki?${params.toString()}`);
};
