/**
 * The moderation log: every moderator action (and automatic ones, like a post
 * hidden after reports) with who did it, to what, and why. The admin reads it at
 * /admin/forum/?tab=log.
 */
import {
  forumLog,
  forumTopics,
  forums,
  users,
  type Database,
  type ForumLogEntry,
} from "@trilleo/db";
import type { LogAction } from "@trilleo/forum";
import { count, desc, eq } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

type Tx = Parameters<Parameters<Database["transaction"]>[0]>[0];

export interface LogInput {
  /** Null: the site did it (an automatic hide). */
  actorId: string | null;
  action: LogAction;
  forumId?: number | null;
  topicId?: number | null;
  postId?: number | null;
  targetUserId?: string | null;
  detail?: string;
}

export async function logAction(
  db: Database | Tx,
  entry: LogInput,
  now = new Date(),
): Promise<void> {
  await db.insert(forumLog).values({
    actorId: entry.actorId,
    action: entry.action,
    forumId: entry.forumId ?? null,
    topicId: entry.topicId ?? null,
    postId: entry.postId ?? null,
    targetUserId: entry.targetUserId ?? null,
    detail: entry.detail ?? "",
    createdAt: now,
  });
}

export const LOG_PAGE = 50;

const actors = alias(users, "actors");
const targets = alias(users, "targets");

export interface LogRow {
  entry: ForumLogEntry;
  actor: string | null;
  target: string | null;
  forum: { slug: string; name: string } | null;
  topic: { id: number; slug: string; title: string } | null;
}

/** The newest entries first, a page at a time. */
export async function readLog(
  db: Database,
  page = 1,
): Promise<{ rows: LogRow[]; pages: number }> {
  const [total] = await db.select({ total: count() }).from(forumLog);
  const pages = Math.max(1, Math.ceil((total?.total ?? 0) / LOG_PAGE));
  const rows = await db
    .select({
      entry: forumLog,
      actor: actors.username,
      target: targets.username,
      forum: { slug: forums.slug, name: forums.name },
      topic: {
        id: forumTopics.id,
        slug: forumTopics.slug,
        title: forumTopics.title,
      },
    })
    .from(forumLog)
    .leftJoin(actors, eq(actors.id, forumLog.actorId))
    .leftJoin(targets, eq(targets.id, forumLog.targetUserId))
    .leftJoin(forums, eq(forums.id, forumLog.forumId))
    .leftJoin(forumTopics, eq(forumTopics.id, forumLog.topicId))
    .orderBy(desc(forumLog.createdAt), desc(forumLog.id))
    .limit(LOG_PAGE)
    .offset((Math.min(Math.max(1, page), pages) - 1) * LOG_PAGE);
  return { rows, pages };
}
