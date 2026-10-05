import {
  comments,
  posts,
  sessions,
  skygridSaves,
  toolData,
  users,
  type Database,
  type User,
} from "@trilleo/db";
import { and, asc, desc, eq, isNull, lte, sql } from "drizzle-orm";
import { messagesFrom } from "../contact/store";
import type { ProfileInput } from "./profile";

/** Saves someone's profile. Returns the updated user. */
export async function updateProfile(
  db: Database,
  userId: string,
  profile: ProfileInput,
  now = new Date(),
): Promise<User | null> {
  const [user] = await db
    .update(users)
    .set({ ...profile, profileUpdatedAt: now })
    .where(eq(users.id, userId))
    .returning();
  return user ?? null;
}

/** How many recent comments a profile page shows. */
export const PROFILE_COMMENTS = 5;

export interface ProfileComment {
  id: number;
  body: string;
  createdAt: Date;
  postSlug: string;
  postTitle: string;
}

export interface ProfilePage {
  user: User;
  /** Their latest published comments on public posts. */
  comments: ProfileComment[];
  commentCount: number;
}

/**
 * The profile at /people/<login>, as the viewer may see it: null for an unknown or
 * blocked account, or a private profile that isn't the viewer's own. Logins are
 * matched without case, as GitHub does; if an old login is still on an account that
 * hasn't signed in since, the most recent sign-in wins.
 */
export async function findProfile(
  db: Database,
  login: string,
  viewerId: string | null,
  now = new Date(),
): Promise<ProfilePage | null> {
  const [user] = await db
    .select()
    .from(users)
    .where(
      and(
        sql`lower(${users.githubLogin}) = ${login.toLowerCase()}`,
        isNull(users.blockedAt),
      ),
    )
    .orderBy(desc(users.lastSignInAt))
    .limit(1);
  if (!user) return null;
  if (!user.profilePublic && user.id !== viewerId) return null;

  const visible = and(
    eq(comments.authorId, user.id),
    eq(comments.status, "published"),
    isNull(comments.deletedAt),
    eq(posts.status, "published"),
    lte(posts.publishedAt, now),
  );
  const [recent, [total]] = await Promise.all([
    db
      .select({
        id: comments.id,
        body: comments.body,
        createdAt: comments.createdAt,
        postSlug: posts.slug,
        postTitle: posts.title,
      })
      .from(comments)
      .innerJoin(posts, eq(posts.slug, comments.postSlug))
      .where(visible)
      .orderBy(desc(comments.createdAt), desc(comments.id))
      .limit(PROFILE_COMMENTS),
    db
      .select({ count: sql<number>`count(*)`.mapWith(Number) })
      .from(comments)
      .innerJoin(posts, eq(posts.slug, comments.postSlug))
      .where(visible),
  ]);
  return { user, comments: recent, commentCount: total?.count ?? 0 };
}

/**
 * Everything kept about someone, for /account/export.json: their account and
 * profile, signed-in browsers (without the session ids), comments, tool data,
 * game saves, and messages sent from /contact/ while signed in.
 */
export async function exportUserData(
  db: Database,
  userId: string,
  now = new Date(),
) {
  const [user] = await db.select().from(users).where(eq(users.id, userId));
  if (!user) return null;
  const [browsers, own, tools, skygrid, messages] = await Promise.all([
    db
      .select({
        createdAt: sessions.createdAt,
        lastUsedAt: sessions.lastUsedAt,
        expiresAt: sessions.expiresAt,
        userAgent: sessions.userAgent,
      })
      .from(sessions)
      .where(eq(sessions.userId, userId))
      .orderBy(desc(sessions.lastUsedAt)),
    db
      .select({
        id: comments.id,
        post: comments.postSlug,
        parentId: comments.parentId,
        body: comments.body,
        status: comments.status,
        createdAt: comments.createdAt,
      })
      .from(comments)
      .where(and(eq(comments.authorId, userId), isNull(comments.deletedAt)))
      .orderBy(asc(comments.createdAt), asc(comments.id)),
    db
      .select({
        tool: toolData.tool,
        key: toolData.key,
        value: toolData.value,
        updatedAt: toolData.updatedAt,
      })
      .from(toolData)
      .where(eq(toolData.userId, userId))
      .orderBy(asc(toolData.tool), asc(toolData.key)),
    db
      .select({
        state: skygridSaves.state,
        version: skygridSaves.version,
        createdAt: skygridSaves.createdAt,
        updatedAt: skygridSaves.updatedAt,
      })
      .from(skygridSaves)
      .where(eq(skygridSaves.userId, userId)),
    messagesFrom(db, userId),
  ]);
  return {
    exportedAt: now.toISOString(),
    account: {
      id: user.id,
      githubId: user.githubId,
      username: user.githubLogin,
      githubName: user.name,
      createdAt: user.createdAt,
      lastSignInAt: user.lastSignInAt,
      trusted: user.trustedAt !== null,
    },
    profile: {
      displayName: user.displayName,
      pronouns: user.pronouns,
      location: user.location,
      status: user.status,
      bio: user.bio,
      links: user.links,
      public: user.profilePublic,
      commentName: user.commentName,
      updatedAt: user.profileUpdatedAt,
    },
    sessions: browsers,
    comments: own,
    toolData: tools,
    games: { skygrid: skygrid[0] ?? null },
    contactMessages: messages,
  };
}
