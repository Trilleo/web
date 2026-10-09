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
export const GET: APIRoute = async ({ url, cookies, request, locals }) => {
  const github = authConfig().github;
  if (!github) return noStoreRedirect("/sign-in?error=not-configured");

  // Each sign-in attempt is good for one callback.
  const saved = readOAuthCookie(cookies, url);
  clearOAuthCookie(cookies, url);

  const result = await completeSignIn({
    db: await getDb(),
    config: github,
    params: url.searchParams,
    saved,
    currentUser: locals.user,
    redirectUri: new URL("/auth/github/callback", url.origin).href,
    userAgent: request.headers.get("user-agent"),
  });
  if (!result.ok) {
    if (saved?.linkUserId)
      return noStoreRedirect(`/account/security/?error=${result.error}`);
    const params = new URLSearchParams({ error: result.error });
    if (saved) params.set("next", saved.next);
    return noStoreRedirect(`/sign-in?${params.toString()}`);
  }
  if (result.kind === "linked")
    return noStoreRedirect("/account/security/?done=linked");

  setSessionCookie(cookies, url, result.token, result.expiresAt);
  // An account from before email sign-in just got its address: say so once.
  if (result.adopted)
    return noStoreRedirect(
      `/account/security/?done=adopted&next=${encodeURIComponent(result.next)}`,
    );
  return noStoreRedirect(result.next);
};
