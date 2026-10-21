/**
 * Reactions to posts (one per person per post), votes on answers in Q&A forums, and
 * accepting an answer. Each recounts what it changes (a post's score, people's
 * points) and tells the people concerned (notifications.ts).
 */
import {
  forumPosts,
  forumReactions,
  forumTopics,
  forumUserBadges,
  forumUserStats,
  forumVotes,
  users,
  type Database,
  type ForumPost,
  type ForumTopic,
} from "@trilleo/db";
import { REACTIONS, type ReactionKey } from "@trilleo/forum";
import { and, eq, inArray, sql } from "drizzle-orm";
import { logAction } from "./log";
import { notifyAccepted, notifyReaction } from "./notifications";
import { refreshStats } from "./reputation";
import { setSolved } from "./tags";

export interface ReactionSummary {
  key: ReactionKey;
  emoji: string;
  label: string;
  count: number;
  /** The viewer's own. */
  mine: boolean;
  /** Who reacted (usernames), for the tooltip and screen readers. */
  people: string[];
}

/** Each post's reactions (only ones someone used), by post id. */
export async function reactionsFor(
  db: Database,
  postIds: readonly number[],
  viewerId: string | null,
): Promise<Map<number, ReactionSummary[]>> {
  const out = new Map<number, ReactionSummary[]>();
  if (postIds.length === 0) return out;
  const rows = await db
    .select({
      postId: forumReactions.postId,
      reaction: forumReactions.reaction,
      userId: forumReactions.userId,
      username: users.username,
    })
    .from(forumReactions)
    .innerJoin(users, eq(users.id, forumReactions.userId))
    .where(inArray(forumReactions.postId, [...postIds]))
    .orderBy(forumReactions.createdAt);
  for (const postId of postIds) {
    const mine = rows.filter((row) => row.postId === postId);
    const summaries = REACTIONS.flatMap((reaction) => {
      const by = mine.filter((row) => row.reaction === reaction.key);
      return by.length === 0
        ? []
        : [
            {
              key: reaction.key,
              emoji: reaction.emoji,
              label: reaction.label,
              count: by.length,
              mine:
                viewerId !== null && by.some((row) => row.userId === viewerId),
              people: by.map((row) => row.username),
            },
          ];
    });
    out.set(postId, summaries);
  }
  return out;
}

/**
 * Sets someone's reaction to a post: a new one replaces theirs, the same one again
 * takes it back. Returns their reaction now (null: none).
 */
export async function react(
  db: Database,
  input: { post: ForumPost; userId: string; reaction: ReactionKey; now?: Date },
): Promise<ReactionKey | null> {
  const now = input.now ?? new Date();
  const [current] = await db
    .select({ reaction: forumReactions.reaction })
    .from(forumReactions)
    .where(
      and(
        eq(forumReactions.postId, input.post.id),
        eq(forumReactions.userId, input.userId),
      ),
    )
    .limit(1);
  let result: ReactionKey | null;
  if (current?.reaction === input.reaction) {
    await db
      .delete(forumReactions)
      .where(
        and(
          eq(forumReactions.postId, input.post.id),
          eq(forumReactions.userId, input.userId),
        ),
      );
    result = null;
  } else {
    await db
      .insert(forumReactions)
      .values({
        postId: input.post.id,
        userId: input.userId,
        reaction: input.reaction,
        createdAt: now,
      })
      .onConflictDoUpdate({
        target: [forumReactions.postId, forumReactions.userId],
        set: { reaction: input.reaction, createdAt: now },
      });
    result = input.reaction;
    if (!current)
      await notifyReaction(db, input.post, input.userId, input.reaction, now);
  }
  await refreshStats(db, [input.post.authorId], now);
  return result;
}

/** Each post's score and the viewer's vote, by post id. */
export async function votesFor(
  db: Database,
  postIds: readonly number[],
  viewerId: string | null,
): Promise<Map<number, number>> {
  const out = new Map<number, number>();
  if (postIds.length === 0 || viewerId === null) return out;
  const rows = await db
    .select({ postId: forumVotes.postId, value: forumVotes.value })
    .from(forumVotes)
    .where(
      and(
        inArray(forumVotes.postId, [...postIds]),
        eq(forumVotes.userId, viewerId),
      ),
    );
  for (const row of rows) out.set(row.postId, row.value);
  return out;
}

/** Votes an answer up (1) or down (-1); the same vote again takes it back. Returns the score. */
export async function vote(
  db: Database,
  input: { post: ForumPost; userId: string; value: 1 | -1; now?: Date },
): Promise<number> {
  const now = input.now ?? new Date();
  return db.transaction(async (tx) => {
    const [current] = await tx
      .select({ value: forumVotes.value })
      .from(forumVotes)
      .where(
        and(
          eq(forumVotes.postId, input.post.id),
          eq(forumVotes.userId, input.userId),
        ),
      )
      .limit(1);
    if (current?.value === input.value) {
      await tx
        .delete(forumVotes)
        .where(
          and(
            eq(forumVotes.postId, input.post.id),
            eq(forumVotes.userId, input.userId),
          ),
        );
    } else {
      await tx
        .insert(forumVotes)
        .values({
          postId: input.post.id,
          userId: input.userId,
          value: input.value,
          createdAt: now,
        })
        .onConflictDoUpdate({
          target: [forumVotes.postId, forumVotes.userId],
          set: { value: input.value, createdAt: now },
        });
    }
    const [score] = await tx
      .update(forumPosts)
      .set({
        score: sql`(select coalesce(sum(${forumVotes.value}), 0) from ${forumVotes} where ${forumVotes.postId} = ${input.post.id})`,
      })
      .where(eq(forumPosts.id, input.post.id))
      .returning({ score: forumPosts.score });
    return score?.score ?? 0;
  });
}

/**
 * Accepts an answer (or, with null, takes the acceptance back). Accepting marks the
 * topic solved; taking it back leaves "solved" as it is.
 */
export async function acceptAnswer(
  db: Database,
  input: { topic: ForumTopic; post: ForumPost | null; by: string; now?: Date },
): Promise<boolean> {
  const now = input.now ?? new Date();
  const { topic, post } = input;
  if (post && (post.topicId !== topic.id || post.id === topic.firstPostId))
    return false;
  const before = topic.acceptedPostId;
  await db
    .update(forumTopics)
    .set({ acceptedPostId: post?.id ?? null })
    .where(eq(forumTopics.id, topic.id));
  if (post) await setSolved(db, topic.id, true, now);
  const affected = await db
    .select({ authorId: forumPosts.authorId })
    .from(forumPosts)
    .where(inArray(forumPosts.id, [before ?? -1, post?.id ?? -1]));
  await refreshStats(
    db,
    affected.map((row) => row.authorId),
    now,
  );
  if (post && post.id !== before) {
    await notifyAccepted(db, topic, post, input.by, now);
    if (input.by !== topic.authorId)
      await logAction(
        db,
        {
          actorId: input.by,
          action: "accept",
          forumId: topic.forumId,
          topicId: topic.id,
          postId: post.id,
          targetUserId: post.authorId,
        },
        now,
      );
  }
  return true;
}

/** For the export: reactions and votes someone gave, and their points and badges. */
export async function engagementExport(db: Database, userId: string) {
  const [reactions, votes, stats, badges] = await Promise.all([
    db
      .select({
        postId: forumReactions.postId,
        reaction: forumReactions.reaction,
        at: forumReactions.createdAt,
      })
      .from(forumReactions)
      .where(eq(forumReactions.userId, userId)),
    db
      .select({
        postId: forumVotes.postId,
        value: forumVotes.value,
        at: forumVotes.createdAt,
      })
      .from(forumVotes)
      .where(eq(forumVotes.userId, userId)),
    db.select().from(forumUserStats).where(eq(forumUserStats.userId, userId)),
    db
      .select({
        badge: forumUserBadges.badge,
        earnedAt: forumUserBadges.earnedAt,
      })
      .from(forumUserBadges)
      .where(eq(forumUserBadges.userId, userId)),
  ]);
  return { reactions, votes, stats: stats[0] ?? null, badges };
}
