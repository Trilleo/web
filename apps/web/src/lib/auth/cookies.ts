import type { AstroCookies } from "astro";

const SESSION_COOKIE = "trilleo_session";
const OAUTH_COOKIE = "trilleo_oauth";
/** Time allowed to finish signing in on GitHub. */
const OAUTH_MAX_AGE_S = 10 * 60;

/** What the sign-in flow remembers between leaving for GitHub and coming back. */
export interface OAuthState {
  state: string;
  codeVerifier: string;
  next: string;
}

/**
 * Over HTTPS, cookies get the __Host- prefix: browsers then insist they're Secure,
 * site-wide, and never shared with subdomains. Plain-HTTP dev and e2e can't use it.
 */
function cookieName(name: string, url: URL): string {
  return url.protocol === "https:" ? `__Host-${name}` : name;
}

function options(url: URL) {
  return {
    path: "/",
    httpOnly: true,
    secure: url.protocol === "https:",
    sameSite: "lax" as const,
  };
}

export function readSessionToken(
  cookies: AstroCookies,
  url: URL,
): string | undefined {
  const token = cookies.get(cookieName(SESSION_COOKIE, url))?.value;
  return token === "" ? undefined : token;
}

export function setSessionCookie(
  cookies: AstroCookies,
  url: URL,
  token: string,
  expiresAt: Date,
): void {
  cookies.set(cookieName(SESSION_COOKIE, url), token, {
    ...options(url),
    expires: expiresAt,
  });
}

export function clearSessionCookie(cookies: AstroCookies, url: URL): void {
  cookies.delete(cookieName(SESSION_COOKIE, url), options(url));
}

export function setOAuthCookie(
  cookies: AstroCookies,
  url: URL,
  value: OAuthState,
): void {
  cookies.set(cookieName(OAUTH_COOKIE, url), JSON.stringify(value), {
    ...options(url),
    maxAge: OAUTH_MAX_AGE_S,
  });
}

export function readOAuthCookie(
  cookies: AstroCookies,
  url: URL,
): OAuthState | null {
  const raw = cookies.get(cookieName(OAUTH_COOKIE, url))?.value;
  if (!raw) return null;
  try {
    const value: unknown = JSON.parse(raw);
    if (
      typeof value === "object" &&
      value !== null &&
      "state" in value &&
      "codeVerifier" in value &&
      "next" in value &&
      typeof value.state === "string" &&
      typeof value.codeVerifier === "string" &&
      typeof value.next === "string"
    ) {
      return {
        state: value.state,
        codeVerifier: value.codeVerifier,
        next: value.next,
      };
    }
  } catch {
    // A mangled cookie is the same as none.
  }
  return null;
}

export function clearOAuthCookie(cookies: AstroCookies, url: URL): void {
  cookies.delete(cookieName(OAUTH_COOKIE, url), options(url));
}
