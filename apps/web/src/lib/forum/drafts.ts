/**
 * Drafts: what someone is writing, saved as they type (the post form's script, via
 * /api/forum/drafts), one per place: "topic:<forum id>", "reply:<topic id>" or
 * "message:<conversation id>".
 * Posting there deletes it.
 */
import { forumDrafts, type Database } from "@trilleo/db";
import { FORUM_LIMITS } from "@trilleo/forum";
import { and, eq } from "drizzle-orm";

const KEY = /^(?:topic|reply|message):[1-9]\d{0,9}$/;

export function isDraftKey(value: string): boolean {
  return KEY.test(value);
}

export const draftKey = {
  topic: (forumId: number) => `topic:${String(forumId)}`,
  reply: (topicId: number) => `reply:${String(topicId)}`,
  message: (conversationId: number) => `message:${String(conversationId)}`,
};

export async function getDraft(db: Database, userId: string, key: string) {
  const [row] = await db
    .select()
    .from(forumDrafts)
    .where(and(eq(forumDrafts.userId, userId), eq(forumDrafts.key, key)))
    .limit(1);
  return row;
}

/** Saves a draft (an empty one is deleted). */
export async function saveDraft(
  db: Database,
  userId: string,
  input: { key: string; title: string; body: string },
  now = new Date(),
): Promise<boolean> {
  if (!isDraftKey(input.key)) return false;
  const title = input.title.slice(0, FORUM_LIMITS.title.max * 2);
  const body = input.body.slice(0, FORUM_LIMITS.body.max);
  if (!title.trim() && !body.trim()) {
    await deleteDraft(db, userId, input.key);
    return true;
  }
  await db
    .insert(forumDrafts)
    .values({ userId, key: input.key, title, body, updatedAt: now })
    .onConflictDoUpdate({
      target: [forumDrafts.userId, forumDrafts.key],
      set: { title, body, updatedAt: now },
    });
  return true;
}

export async function deleteDraft(
  db: Database,
  userId: string,
  key: string,
): Promise<void> {
  await db
    .delete(forumDrafts)
    .where(and(eq(forumDrafts.userId, userId), eq(forumDrafts.key, key)));
}

export async function draftsExport(db: Database, userId: string) {
  return db
    .select({
      key: forumDrafts.key,
      title: forumDrafts.title,
      body: forumDrafts.body,
      updatedAt: forumDrafts.updatedAt,
    })
    .from(forumDrafts)
    .where(eq(forumDrafts.userId, userId));
}
