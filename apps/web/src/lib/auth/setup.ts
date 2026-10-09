import type { User } from "@trilleo/db";

/**
 * Pages an account without an email address can still reach. Everything else sends
 * it to /account/email/ first: since email sign-in, an account is its address, and
 * accounts from before then are asked for one (once, the next time they're here).
 * APIs, islands and files keep working, so open tools don't break mid-use. Pre-built
 * pages never reach the middleware, so they're open too (they hold no account data).
 */
const OPEN_PREFIXES = [
  "/account/email",
  "/account/export.json",
  "/account/delete",
  "/auth/",
  "/sign-in",
  "/sign-up",
  "/api/",
  "/_",
  "/legal/",
  "/mail/",
  "/d/",
  "/media/",
  "/og/",
];

/** Where to send someone who still has to add an address, or null to carry on. */
export function emailSetupRedirect(
  user: Pick<User, "email"> | null,
  method: string,
  url: URL,
): string | null {
  if (user?.email !== null) return null;
  if (method !== "GET" && method !== "HEAD") return null;
  if (OPEN_PREFIXES.some((prefix) => url.pathname.startsWith(prefix)))
    return null;
  const next = url.pathname + url.search;
  return `/account/email/?setup=1&next=${encodeURIComponent(next)}`;
}
