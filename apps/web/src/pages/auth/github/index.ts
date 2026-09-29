import type { APIRoute } from "astro";
import { authConfig } from "../../../lib/auth/config";
import { setOAuthCookie } from "../../../lib/auth/cookies";
import { codeChallenge, randomToken } from "../../../lib/auth/crypto";
import { authorizationUrl } from "../../../lib/auth/github";
import { noStoreRedirect, safeNextPath } from "../../../lib/auth/redirect";

export const prerender = false;

/** Starts a sign-in: remembers where it's going, then sends the visitor to GitHub. */
export const GET: APIRoute = ({ url, cookies }) => {
  const config = authConfig();
  if (!config) return noStoreRedirect("/sign-in?error=not-configured");

  const state = randomToken();
  const codeVerifier = randomToken();
  const next = safeNextPath(url.searchParams.get("next"));
  setOAuthCookie(cookies, url, { state, codeVerifier, next });

  return noStoreRedirect(
    authorizationUrl(config, {
      state,
      codeChallenge: codeChallenge(codeVerifier),
      redirectUri: new URL("/auth/github/callback", url.origin).href,
    }),
  );
};
