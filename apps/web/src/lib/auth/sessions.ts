import {
  sessions,
  users,
  type Database,
  type Session,
  type User,
} from "@trilleo/db";
import { eq, lte } from "drizzle-orm";
import { hashToken, randomToken } from "./crypto";
import type { GitHubProfile } from "./github";

const DAY_MS = 24 * 60 * 60 * 1000;

/** How long a sign-in lasts. */
export const SESSION_TTL_MS = 30 * DAY_MS;
/** A session used in its last 15 days is extended, so active visitors stay signed in. */
export const SESSION_RENEW_MS = 15 * DAY_MS;

export interface ValidSession {
  user: User;
  session: Session;
  /** The expiry moved, so the cookie needs sending again. */
  renewed: boolean;
}

/** Records a GitHub sign-in: the user row is created or refreshed from their profile. */
export async function upsertGitHubUser(
  db: Database,
  profile: GitHubProfile,
  now = new Date(),
): Promise<User> {
  const [user] = await db
    .insert(users)
    .values({
      githubId: profile.id,
      githubLogin: profile.login,
      name: profile.name,
      lastSignInAt: now,
    })
    .onConflictDoUpdate({
      target: users.githubId,
      set: {
        githubLogin: profile.login,
        name: profile.name,
        lastSignInAt: now,
      },
    })
    .returning();
  if (!user) throw new Error("Saving the user returned nothing");
  return user;
}

/** Starts a session. The token goes in the cookie; only its hash is stored. */
export async function createSession(
  db: Database,
  userId: string,
  now = new Date(),
): Promise<{ token: string; session: Session }> {
  const token = randomToken();
  const [session] = await db
    .insert(sessions)
    .values({
      id: hashToken(token),
      userId,
      createdAt: now,
      expiresAt: new Date(now.getTime() + SESSION_TTL_MS),
    })
    .returning();
  if (!session) throw new Error("Saving the session returned nothing");
  return { token, session };
}

/** The session and user for a cookie's token, or null if it's unknown or expired. */
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
  if (remaining <= 0) {
    await db.delete(sessions).where(eq(sessions.id, id));
    return null;
  }
  if (remaining < SESSION_RENEW_MS) {
    const expiresAt = new Date(now.getTime() + SESSION_TTL_MS);
    await db.update(sessions).set({ expiresAt }).where(eq(sessions.id, id));
    return {
      user: row.user,
      session: { ...row.session, expiresAt },
      renewed: true,
    };
  }
  return { ...row, renewed: false };
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

export async function deleteExpiredSessions(
  db: Database,
  now = new Date(),
): Promise<void> {
  await db.delete(sessions).where(lte(sessions.expiresAt, now));
}
