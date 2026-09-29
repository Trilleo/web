import type { APIRoute } from "astro";
import { authConfig } from "../../../lib/auth/config";
import {
  clearOAuthCookie,
  readOAuthCookie,
  setSessionCookie,
} from "../../../lib/auth/cookies";
import { noStoreRedirect } from "../../../lib/auth/redirect";
import { completeSignIn } from "../../../lib/auth/sign-in";
import { getDb } from "../../../lib/db";

export const prerender = false;

/** Where GitHub sends the visitor back to. */
export const GET: APIRoute = async ({ url, cookies }) => {
  const config = authConfig();
  if (!config) return noStoreRedirect("/sign-in?error=not-configured");

  // Each sign-in attempt is good for one callback.
  const saved = readOAuthCookie(cookies, url);
  clearOAuthCookie(cookies, url);

  const result = await completeSignIn({
    db: await getDb(),
    config,
    params: url.searchParams,
    saved,
    redirectUri: new URL("/auth/github/callback", url.origin).href,
  });
  if (!result.ok) {
    const params = new URLSearchParams({ error: result.error });
    if (saved) params.set("next", saved.next);
    return noStoreRedirect(`/sign-in?${params.toString()}`);
  }

  setSessionCookie(cookies, url, result.token, result.expiresAt);
  return noStoreRedirect(result.next);
};
