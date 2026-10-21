/**
 * Unread tracking: how far each person has read each topic (forum_reads: the newest
 * post they've seen), and "mark all read" (forum_user_settings.read_all_at). A topic
 * is unread when something newer than both went live. Before someone has read
 * anything, what came before their account counts as read.
 */
import {
  forumPosts,
  forumReads,
  forumTopics,
  type Database,
  type ForumTopic,
} from "@trilleo/db";
import { and, asc, eq, gt, inArray, isNull } from "drizzle-orm";
import { saveSettings, settingsOf } from "./notifications";

/** Marks a topic read up to its newest post. Returns what they'd read before (or null). */
export async function markRead(
  db: Database,
  userId: string,
  topic: Pick<ForumTopic, "id" | "lastPostId">,
  now = new Date(),
): Promise<number | null> {
  const [before] = await db
    .select({ lastPostId: forumReads.lastPostId })
    .from(forumReads)
    .where(and(eq(forumReads.userId, userId), eq(forumReads.topicId, topic.id)))
    .limit(1);
  if (
    topic.lastPostId !== null &&
    (before?.lastPostId ?? 0) < topic.lastPostId
  ) {
    await db
      .insert(forumReads)
      .values({
        userId,
        topicId: topic.id,
        lastPostId: topic.lastPostId,
        readAt: now,
      })
      .onConflictDoUpdate({
        target: [forumReads.userId, forumReads.topicId],
        set: { lastPostId: topic.lastPostId, readAt: now },
      });
  }
  return before?.lastPostId ?? null;
}

/** Which of these topics have something new for this person. */
export async function unreadOf(
  db: Database,
  user: { id: string; createdAt: Date },
  topics: readonly Pick<ForumTopic, "id" | "lastPostId" | "lastPostAt">[],
): Promise<Set<number>> {
  if (topics.length === 0) return new Set();
  const [reads, settings] = await Promise.all([
    db
      .select({
        topicId: forumReads.topicId,
        lastPostId: forumReads.lastPostId,
      })
      .from(forumReads)
      .where(
        and(
          eq(forumReads.userId, user.id),
          inArray(
            forumReads.topicId,
            topics.map((topic) => topic.id),
          ),
        ),
      ),
    settingsOf(db, user.id),
  ]);
  const floor = settings.readAllAt ?? user.createdAt;
  const read = new Map(reads.map((row) => [row.topicId, row.lastPostId]));
  return new Set(
    topics
      .filter((topic) => {
        if (topic.lastPostId === null || topic.lastPostAt <= floor)
          return false;
        return (read.get(topic.id) ?? 0) < topic.lastPostId;
      })
      .map((topic) => topic.id),
  );
}

export async function markAllRead(
  db: Database,
  userId: string,
  now = new Date(),
): Promise<void> {
  await saveSettings(db, userId, { readAllAt: now }, now);
}

/** Topics a person last read, for the export. */
export async function readsExport(db: Database, userId: string) {
  return db
    .select({ topic: forumTopics.title, readAt: forumReads.readAt })
    .from(forumReads)
    .innerJoin(forumTopics, eq(forumTopics.id, forumReads.topicId))
    .where(eq(forumReads.userId, userId));
}

/** The first post after one someone had read (for "Jump to first unread"), if any. */
export async function firstPostAfter(
  db: Database,
  topicId: number,
  readUpTo: number,
): Promise<number | null> {
  const [row] = await db
    .select({ id: forumPosts.id })
    .from(forumPosts)
    .where(
      and(
        eq(forumPosts.topicId, topicId),
        gt(forumPosts.id, readUpTo),
        eq(forumPosts.state, "published"),
        isNull(forumPosts.deletedAt),
      ),
    )
    .orderBy(asc(forumPosts.id))
    .limit(1);
  return row?.id ?? null;
}
