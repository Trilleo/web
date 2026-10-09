import type { AstroCookies } from "astro";

const SESSION_COOKIE = "trilleo_session";
const OAUTH_COOKIE = "trilleo_oauth";
const PENDING_COOKIE = "trilleo_sign_in";
/** Time allowed to finish signing in on GitHub. */
export const OAUTH_MAX_AGE_S = 10 * 60;
/** Time allowed to type a code and choose a username. */
export const PENDING_MAX_AGE_S = 30 * 60;

/** What the sign-in flow remembers between leaving for GitHub and coming back. */
export interface OAuthState {
  state: string;
  codeVerifier: string;
  next: string;
  /** Set when a signed-in account is linking GitHub, not signing in. */
  linkUserId?: string;
}

/**
 * An email sign-in under way: the address a code went to, and once it's proved for
 * an address without an account, the sign-up ticket (its hash is in email_codes).
 * Not secret on its own: the code, or the ticket, is the proof.
 */
export interface PendingSignIn {
  email: string;
  next: string;
  ticket?: string;
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
        ...("linkUserId" in value &&
          typeof value.linkUserId === "string" && {
            linkUserId: value.linkUserId,
          }),
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

export function setPendingCookie(
  cookies: AstroCookies,
  url: URL,
  value: PendingSignIn,
): void {
  cookies.set(cookieName(PENDING_COOKIE, url), JSON.stringify(value), {
    ...options(url),
    maxAge: PENDING_MAX_AGE_S,
  });
}

export function readPendingCookie(
  cookies: AstroCookies,
  url: URL,
): PendingSignIn | null {
  const raw = cookies.get(cookieName(PENDING_COOKIE, url))?.value;
  if (!raw) return null;
  try {
    const value: unknown = JSON.parse(raw);
    if (
      typeof value === "object" &&
      value !== null &&
      "email" in value &&
      "next" in value &&
      typeof value.email === "string" &&
      typeof value.next === "string"
    ) {
      return {
        email: value.email,
        next: value.next,
        ...("ticket" in value &&
          typeof value.ticket === "string" && { ticket: value.ticket }),
      };
    }
  } catch {
    // A mangled cookie is the same as none.
  }
  return null;
}

export function clearPendingCookie(cookies: AstroCookies, url: URL): void {
  cookies.delete(cookieName(PENDING_COOKIE, url), options(url));
}
