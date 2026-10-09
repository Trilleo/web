import {
  sessions,
  users,
  type Database,
  type Session,
  type User,
} from "@trilleo/db";
import { and, desc, eq, lte, ne } from "drizzle-orm";
import { hashToken, randomToken } from "./crypto";

const DAY_MS = 24 * 60 * 60 * 1000;

/** How long a sign-in lasts. */
export const SESSION_TTL_MS = 30 * DAY_MS;
/** A session used in its last 15 days is extended, so active visitors stay signed in. */
export const SESSION_RENEW_MS = 15 * DAY_MS;
/** `lastUsedAt` is only written when it's this stale, so most requests don't write. */
export const SESSION_TOUCH_MS = 5 * 60 * 1000;
/** Enough of a User-Agent to name the browser; the rest isn't kept. */
const USER_AGENT_MAX = 300;

export interface ValidSession {
  user: User;
  session: Session;
  /** The expiry moved, so the cookie needs sending again. */
  renewed: boolean;
}

/** Starts a session. The token goes in the cookie; only its hash is stored. */
export async function createSession(
  db: Database,
  userId: string,
  now = new Date(),
  userAgent: string | null = null,
): Promise<{ token: string; session: Session }> {
  const token = randomToken();
  const [session] = await db
    .insert(sessions)
    .values({
      id: hashToken(token),
      userId,
      createdAt: now,
      lastUsedAt: now,
      expiresAt: new Date(now.getTime() + SESSION_TTL_MS),
      userAgent: userAgent ? userAgent.slice(0, USER_AGENT_MAX) : null,
    })
    .returning();
  if (!session) throw new Error("Saving the session returned nothing");
  return { token, session };
}

/** The session and user for a cookie's token; null if unknown, expired, or blocked. */
export async function validateSession(
  db: Database,
  token: string,
  now = new Date(),
): Promise<ValidSession | null> {
  const id = hashToken(token);
  const [row] = await db
    .select({ user: users, session: sessions })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(eq(sessions.id, id))
    .limit(1);
  if (!row) return null;

  const remaining = row.session.expiresAt.getTime() - now.getTime();
  // Blocking also deletes sessions; this covers any that slipped past.
  if (remaining <= 0 || row.user.blockedAt !== null) {
    await db.delete(sessions).where(eq(sessions.id, id));
    return null;
  }
  const renew = remaining < SESSION_RENEW_MS;
  const touch =
    now.getTime() - row.session.lastUsedAt.getTime() >= SESSION_TOUCH_MS;
  if (!renew && !touch) return { ...row, renewed: false };

  const changes = {
    lastUsedAt: now,
    ...(renew && { expiresAt: new Date(now.getTime() + SESSION_TTL_MS) }),
  };
  await db.update(sessions).set(changes).where(eq(sessions.id, id));
  return {
    user: row.user,
    session: { ...row.session, ...changes },
    renewed: renew,
  };
}

/** Signs out one browser. */
export async function invalidateSession(
  db: Database,
  token: string,
): Promise<void> {
  await db.delete(sessions).where(eq(sessions.id, hashToken(token)));
}

/** Signs a user out everywhere. */
export async function invalidateUserSessions(
  db: Database,
  userId: string,
): Promise<void> {
  await db.delete(sessions).where(eq(sessions.userId, userId));
}

/** Someone's signed-in browsers, most recently used first. */
export async function listUserSessions(
  db: Database,
  userId: string,
): Promise<Session[]> {
  return db
    .select()
    .from(sessions)
    .where(eq(sessions.userId, userId))
    .orderBy(desc(sessions.lastUsedAt), desc(sessions.createdAt));
}

/** Signs out one of their browsers by its id; false if it isn't theirs (or is gone). */
export async function revokeUserSession(
  db: Database,
  userId: string,
  sessionId: string,
): Promise<boolean> {
  const deleted = await db
    .delete(sessions)
    .where(and(eq(sessions.id, sessionId), eq(sessions.userId, userId)))
    .returning({ id: sessions.id });
  return deleted.length > 0;
}

/** Signs a user out of every browser but this one. */
export async function invalidateOtherSessions(
  db: Database,
  userId: string,
  keepSessionId: string,
): Promise<void> {
  await db
    .delete(sessions)
    .where(and(eq(sessions.userId, userId), ne(sessions.id, keepSessionId)));
}

export async function deleteExpiredSessions(
  db: Database,
  now = new Date(),
): Promise<void> {
  await db.delete(sessions).where(lte(sessions.expiresAt, now));
}
