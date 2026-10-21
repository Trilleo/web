/**
 * Points, ranks and badges. Someone's counts are recounted from the rows whenever a
 * post, reaction or accepted answer of theirs changes (`refreshStats`), so hiding or
 * deleting takes points back. Badges, once earned, stay.
 */
import {
  forumPosts,
  forumRanks,
  forumReactions,
  forumTopics,
  forumUserBadges,
  forumUserStats,
  users,
  type Database,
  type ForumRank,
} from "@trilleo/db";
import {
  earnedBadges,
  pointsFor,
  rankFor,
  type ForumStats,
} from "@trilleo/forum";
import { and, asc, eq, inArray, isNull, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

type Tx = Parameters<Parameters<Database["transaction"]>[0]>[0];
type Db = Database | Tx;

/** Recounts these people's posts, topics, reactions and accepted answers. */
export async function refreshStats(
  db: Db,
  userIds: readonly (string | null)[],
  now = new Date(),
): Promise<void> {
  const ids = [...new Set(userIds.filter((id): id is string => id !== null))];
  if (ids.length === 0) return;
  const live = and(
    eq(forumPosts.state, "published"),
    isNull(forumPosts.deletedAt),
    isNull(forumTopics.deletedAt),
  );
  const reactors = alias(forumPosts, "reacted_posts");
  const [posts, topics, reactions, accepted, joined] = await Promise.all([
    db
      .select({
        userId: forumPosts.authorId,
        n: sql<number>`count(*)`.mapWith(Number),
      })
      .from(forumPosts)
      .innerJoin(forumTopics, eq(forumTopics.id, forumPosts.topicId))
      .where(and(inArray(forumPosts.authorId, ids), live))
      .groupBy(forumPosts.authorId),
    db
      .select({
        userId: forumTopics.authorId,
        n: sql<number>`count(*)`.mapWith(Number),
      })
      .from(forumTopics)
      .where(
        and(
          inArray(forumTopics.authorId, ids),
          eq(forumTopics.state, "published"),
          isNull(forumTopics.deletedAt),
        ),
      )
      .groupBy(forumTopics.authorId),
    db
      .select({
        userId: reactors.authorId,
        n: sql<number>`count(*)`.mapWith(Number),
      })
      .from(forumReactions)
      .innerJoin(reactors, eq(reactors.id, forumReactions.postId))
      .where(
        and(
          inArray(reactors.authorId, ids),
          sql`${forumReactions.userId} <> ${reactors.authorId}`,
          eq(reactors.state, "published"),
          isNull(reactors.deletedAt),
        ),
      )
      .groupBy(reactors.authorId),
    db
      .select({
        userId: forumPosts.authorId,
        n: sql<number>`count(*)`.mapWith(Number),
      })
      .from(forumTopics)
      .innerJoin(forumPosts, eq(forumPosts.id, forumTopics.acceptedPostId))
      .where(and(inArray(forumPosts.authorId, ids), live))
      .groupBy(forumPosts.authorId),
    db
      .select({ id: users.id, createdAt: users.createdAt })
      .from(users)
      .where(inArray(users.id, ids)),
  ]);
  const count = (rows: { userId: string | null; n: number }[], id: string) =>
    rows.find((row) => row.userId === id)?.n ?? 0;
  for (const { id, createdAt } of joined) {
    const stats: ForumStats = {
      posts: count(posts, id),
      topics: count(topics, id),
      reactionsReceived: count(reactions, id),
      acceptedAnswers: count(accepted, id),
    };
    const row = { ...stats, points: pointsFor(stats), updatedAt: now };
    await db
      .insert(forumUserStats)
      .values({ userId: id, ...row })
      .onConflictDoUpdate({ target: forumUserStats.userId, set: row });
    const badges = earnedBadges(stats, createdAt, now);
    if (badges.length > 0)
      await db
        .insert(forumUserBadges)
        .values(badges.map((badge) => ({ userId: id, badge, earnedAt: now })))
        .onConflictDoNothing();
  }
}

export async function loadRanks(db: Db): Promise<ForumRank[]> {
  return db.select().from(forumRanks).orderBy(asc(forumRanks.minPoints));
}

export interface Reputation {
  points: number;
  rank: string | null;
  badges: string[];
}

/** People's points, rank and badges, by id. */
export async function reputationOf(
  db: Db,
  userIds: readonly string[],
): Promise<Map<string, Reputation>> {
  const out = new Map<string, Reputation>();
  if (userIds.length === 0) return out;
  const ids = [...new Set(userIds)];
  const [stats, badges, ranks] = await Promise.all([
    db.select().from(forumUserStats).where(inArray(forumUserStats.userId, ids)),
    db
      .select()
      .from(forumUserBadges)
      .where(inArray(forumUserBadges.userId, ids))
      .orderBy(asc(forumUserBadges.earnedAt)),
    loadRanks(db),
  ]);
  for (const id of ids) {
    const points = stats.find((row) => row.userId === id)?.points ?? 0;
    out.set(id, {
      points,
      rank: rankFor(points, ranks)?.name ?? null,
      badges: badges.filter((row) => row.userId === id).map((row) => row.badge),
    });
  }
  return out;
}

export async function statsOf(db: Db, userId: string) {
  const [row] = await db
    .select()
    .from(forumUserStats)
    .where(eq(forumUserStats.userId, userId))
    .limit(1);
  return row;
}

// ---------------------------------------------------------------------------
// The admin's ranks

export async function saveRanks(
  db: Database,
  ranks: readonly { name: string; minPoints: number }[],
): Promise<void> {
  await db.transaction(async (tx) => {
    await tx.delete(forumRanks);
    if (ranks.length > 0) await tx.insert(forumRanks).values([...ranks]);
  });
}
