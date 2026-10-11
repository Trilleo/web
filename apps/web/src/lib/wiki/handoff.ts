/**
 * Signing in on the wiki's host. Session cookies are __Host- cookies, so the main
 * site's session can't be read on wiki.trilleo.net; instead the wiki asks the main
 * site for a one-time ticket and trades it for a session of its own:
 *
 *   wiki   /-/sign-in?next=…        sets a random state cookie (wiki host only)
 *   main   /auth/wiki?state=…&next=  signs in first if needed, makes a ticket
 *   wiki   /-/auth?ticket=…&next=    ticket + this browser's state → a session
 *
 * The state ties the ticket to the browser that asked, so nobody can sign someone
 * else in to their account with a link. Tickets live a minute and work once.
 */
import {
  users,
  wikiSignInTickets,
  type Database,
  type User,
} from "@trilleo/db";
import type { AstroCookies } from "astro";
import { and, eq, gt, lte } from "drizzle-orm";
import { hashToken, randomToken } from "../auth/crypto";
import { safeNextPath } from "../auth/redirect";
import { startSession } from "../auth/sign-in";

export const TICKET_TTL_MS = 60_000;
/** Time allowed to get from the wiki to the main site and back. */
export const STATE_MAX_AGE_S = 10 * 60;
const STATE_COOKIE = "trilleo_wiki_state";

function stateCookieName(url: URL): string {
  return url.protocol === "https:" ? `__Host-${STATE_COOKIE}` : STATE_COOKIE;
}

const cookieOptions = (url: URL) => ({
  path: "/",
  httpOnly: true,
  secure: url.protocol === "https:",
  sameSite: "lax" as const,
});

/** On the wiki: a fresh state for this browser, kept in its cookie. */
export function beginHandoff(cookies: AstroCookies, url: URL): string {
  const state = randomToken();
  cookies.set(stateCookieName(url), state, {
    ...cookieOptions(url),
    maxAge: STATE_MAX_AGE_S,
  });
  return state;
}

/** On the wiki: the state this browser was given, read once. */
export function takeHandoffState(
  cookies: AstroCookies,
  url: URL,
): string | null {
  const name = stateCookieName(url);
  const value = cookies.get(name)?.value ?? null;
  cookies.delete(name, cookieOptions(url));
  return value === "" ? null : value;
}

export function isState(value: string | null): value is string {
  return value !== null && /^[A-Za-z0-9_-]{20,64}$/.test(value);
}

/** On the main site: a ticket for the signed-in user, for the browser with `state`. */
export async function issueTicket(
  db: Database,
  userId: string,
  state: string,
  now = new Date(),
): Promise<string> {
  await db
    .delete(wikiSignInTickets)
    .where(lte(wikiSignInTickets.expiresAt, now));
  const ticket = randomToken();
  await db.insert(wikiSignInTickets).values({
    id: hashToken(ticket),
    userId,
    stateHash: hashToken(state),
    createdAt: now,
    expiresAt: new Date(now.getTime() + TICKET_TTL_MS),
  });
  return ticket;
}

/**
 * On the wiki: trades a ticket for a session. Null if the ticket is unknown,
 * used, expired, or was issued to another browser (or the account is blocked).
 */
export async function redeemTicket(
  db: Database,
  input: {
    ticket: string;
    state: string | null;
    userAgent: string | null;
    now?: Date;
  },
): Promise<{ user: User; token: string; expiresAt: Date } | null> {
  const now = input.now ?? new Date();
  if (!isState(input.state) || !/^[A-Za-z0-9_-]{20,64}$/.test(input.ticket))
    return null;
  const [row] = await db
    .delete(wikiSignInTickets)
    .where(
      and(
        eq(wikiSignInTickets.id, hashToken(input.ticket)),
        gt(wikiSignInTickets.expiresAt, now),
      ),
    )
    .returning();
  if (!row) return null;
  if (row.stateHash !== hashToken(input.state)) return null;
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, row.userId))
    .limit(1);
  if (!user || user.blockedAt) return null;
  const session = await startSession(db, user, {
    method: "wiki",
    userAgent: input.userAgent,
    now,
  });
  return { user, ...session };
}

/** Where to land on the wiki: a path on it, or its front page. */
export function wikiNext(value: string | null | undefined): string {
  return value && safeNextPath(value) === value ? value : "/";
}
