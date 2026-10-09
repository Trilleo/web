import type { APIRoute } from "astro";
import { authConfig } from "../../../lib/auth/config";
import { setOAuthCookie } from "../../../lib/auth/cookies";
import { codeChallenge, randomToken } from "../../../lib/auth/crypto";
import { authorizationUrl } from "../../../lib/auth/github";
import { noStoreRedirect, safeNextPath } from "../../../lib/auth/redirect";

export const prerender = false;

/**
 * Starts a GitHub sign-in: remembers where it's going, then sends the visitor to
 * GitHub. With `link=1`, a signed-in account is linking GitHub instead (from
 * /account/security/); that's a POST, so another site can't start it.
 */
function start(
  url: URL,
  cookies: Parameters<APIRoute>[0]["cookies"],
  link: string | null,
) {
  const github = authConfig().github;
  if (!github) return noStoreRedirect("/sign-in?error=not-configured");

  const state = randomToken();
  const codeVerifier = randomToken();
  const next = link
    ? "/account/security/"
    : safeNextPath(url.searchParams.get("next"));
  setOAuthCookie(cookies, url, {
    state,
    codeVerifier,
    next,
    ...(link && { linkUserId: link }),
  });

  return noStoreRedirect(
    authorizationUrl(github, {
      state,
      codeChallenge: codeChallenge(codeVerifier),
      redirectUri: new URL("/auth/github/callback", url.origin).href,
    }),
    link ? 303 : 302,
  );
}

export const GET: APIRoute = ({ url, cookies }) => start(url, cookies, null);

export const POST: APIRoute = ({ url, cookies, locals }) => {
  if (!locals.user)
    return noStoreRedirect("/sign-in?next=%2Faccount%2Fsecurity%2F", 303);
  return start(url, cookies, locals.user.id);
};
