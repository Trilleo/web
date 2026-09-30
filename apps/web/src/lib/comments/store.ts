import {
  comments,
  posts,
  sessions,
  users,
  type Comment,
  type CommentStatus,
  type Database,
  type User,
} from "@trilleo/db";
import {
  and,
  asc,
  desc,
  eq,
  gt,
  inArray,
  isNotNull,
  isNull,
  sql,
} from "drizzle-orm";

export const COMMENT_MAX_LENGTH = 4000;

const MINUTE_MS = 60_000;
/** Per person (the admin is exempt): a burst, a daily total, and unreviewed comments. */
export const LIMITS = {
  burst: { count: 5, windowMs: 10 * MINUTE_MS },
  daily: { count: 30, windowMs: 24 * 60 * MINUTE_MS },
  pending: 3,
} as const;

export interface CommentAuthor {
  login: string;
  name: string | null;
}

/** A comment as one visitor sees it on a post. */
export interface CommentView {
  id: number;
  /** As typed (render with renderComment); empty when removed. */
  body: string;
  createdAt: Date;
  author: CommentAuthor | null;
  /** Waiting for approval: only ever the viewer's own. */
  pending: boolean;
  mine: boolean;
  /** Deleted or hidden, kept as a placeholder because it has replies. */
  removed: boolean;
  /** The post's pinned comment: shown first. */
  pinned: boolean;
}

export interface Thread {
  comment: CommentView;
  replies: CommentView[];
}

/** Published comments, plus the viewer's own pending ones. */
function canSee(comment: Comment, viewerId: string | null): boolean {
  if (comment.deletedAt !== null) return false;
  if (comment.status === "published") return true;
  return (
    comment.status === "pending" &&
    viewerId !== null &&
    comment.authorId === viewerId
  );
}

/** Line endings made consistent, and no leading or trailing blank space. */
export function normalizeBody(body: string): string {
  return body.replace(/\r\n?/g, "\n").trim();
}

/**
 * A post's comments for one viewer (null: signed out), oldest first, in threads. The
 * pinned comment's thread (if it's visible) comes first.
 */
export async function listThreads(
  db: Database,
  postSlug: string,
  viewerId: string | null,
  pinnedId: number | null = null,
): Promise<{ threads: Thread[]; count: number }> {
  const rows = await db
    .select({ comment: comments, login: users.githubLogin, name: users.name })
    .from(comments)
    .leftJoin(users, eq(comments.authorId, users.id))
    .where(eq(comments.postSlug, postSlug))
    .orderBy(asc(comments.createdAt), asc(comments.id));

  const view = (row: (typeof rows)[number], removed: boolean): CommentView => ({
    id: row.comment.id,
    body: removed ? "" : row.comment.body,
    createdAt: row.comment.createdAt,
    author:
      removed || row.login === null
        ? null
        : { login: row.login, name: row.name },
    pending: !removed && row.comment.status === "pending",
    mine: !removed && viewerId !== null && row.comment.authorId === viewerId,
    removed,
    pinned:
      !removed &&
      row.comment.id === pinnedId &&
      row.comment.status === "published",
  });

  const replies = new Map<number, typeof rows>();
  for (const row of rows) {
    const { parentId } = row.comment;
    if (parentId !== null)
      replies.set(parentId, [...(replies.get(parentId) ?? []), row]);
  }

  const threads: Thread[] = [];
  for (const row of rows) {
    if (row.comment.parentId !== null) continue;
    const shownReplies = (replies.get(row.comment.id) ?? [])
      .filter((reply) => canSee(reply.comment, viewerId))
      .map((reply) => view(reply, false));
    if (canSee(row.comment, viewerId)) {
      threads.push({ comment: view(row, false), replies: shownReplies });
    } else if (shownReplies.length > 0) {
      threads.push({ comment: view(row, true), replies: shownReplies });
    }
  }

  const pinned = threads.findIndex((thread) => thread.comment.pinned);
  if (pinned > 0) threads.unshift(...threads.splice(pinned, 1));

  const all = threads.flatMap((thread) => [thread.comment, ...thread.replies]);
  const count = all.filter(
    (comment) => !comment.removed && !comment.pending,
  ).length;
  return { threads, count };
}

export type CreateError =
  | "empty"
  | "too-long"
  | "blocked"
  | "no-parent"
  | "rate-limited"
  | "too-many-pending";

export type CreateResult =
  { ok: true; comment: Comment } | { ok: false; error: CreateError };

async function recentUsage(db: Database, userId: string, now: Date) {
  const since = (ms: number) => new Date(now.getTime() - ms);
  const [usage] = await db
    .select({
      burst:
        sql<number>`count(*) filter (where ${gt(comments.createdAt, since(LIMITS.burst.windowMs))})`.mapWith(
          Number,
        ),
      daily:
        sql<number>`count(*) filter (where ${gt(comments.createdAt, since(LIMITS.daily.windowMs))})`.mapWith(
          Number,
        ),
      pending:
        sql<number>`count(*) filter (where ${and(eq(comments.status, "pending"), isNull(comments.deletedAt))})`.mapWith(
          Number,
        ),
    })
    .from(comments)
    .where(eq(comments.authorId, userId));
  return usage ?? { burst: 0, daily: 0, pending: 0 };
}

/**
 * Adds a comment (the caller has checked the post exists). The admin's and trusted
 * people's comments publish at once; anyone else's wait for approval. A reply to a
 * reply joins the same thread.
 */
export async function createComment(
  db: Database,
  input: {
    author: User;
    isAdmin: boolean;
    postSlug: string;
    parentId: number | null;
    body: string;
    now?: Date;
  },
): Promise<CreateResult> {
  const now = input.now ?? new Date();
  const body = normalizeBody(input.body);
  if (!body) return { ok: false, error: "empty" };
  if (body.length > COMMENT_MAX_LENGTH) return { ok: false, error: "too-long" };
  if (input.author.blockedAt) return { ok: false, error: "blocked" };

  let parentId: number | null = null;
  if (input.parentId !== null) {
    const [parent] = await db
      .select()
      .from(comments)
      .where(
        and(
          eq(comments.id, input.parentId),
          eq(comments.postSlug, input.postSlug),
        ),
      )
      .limit(1);
    if (!parent || !canSee(parent, input.author.id)) {
      return { ok: false, error: "no-parent" };
    }
    parentId = parent.parentId ?? parent.id;
  }

  const trusted = input.isAdmin || input.author.trustedAt !== null;
  if (!input.isAdmin) {
    const usage = await recentUsage(db, input.author.id, now);
    if (
      usage.burst >= LIMITS.burst.count ||
      usage.daily >= LIMITS.daily.count
    ) {
      return { ok: false, error: "rate-limited" };
    }
    if (!trusted && usage.pending >= LIMITS.pending) {
      return { ok: false, error: "too-many-pending" };
    }
  }

  const [comment] = await db
    .insert(comments)
    .values({
      postSlug: input.postSlug,
      authorId: input.author.id,
      parentId,
      body,
      status: trusted ? "published" : "pending",
      createdAt: now,
    })
    .returning();
  if (!comment) throw new Error("Saving the comment returned nothing");
  return { ok: true, comment };
}

/**
 * Deletes a comment. One that still has replies stays as an empty, authorless
 * placeholder so the thread reads; a placeholder whose last reply goes, goes too.
 */
async function removeComment(
  db: Database,
  comment: Comment,
  now: Date,
): Promise<void> {
  if (comment.parentId === null) {
    const [reply] = await db
      .select({ id: comments.id })
      .from(comments)
      .where(eq(comments.parentId, comment.id))
      .limit(1);
    if (reply) {
      await db
        .update(comments)
        .set({ deletedAt: now, body: "", authorId: null })
        .where(eq(comments.id, comment.id));
      await unpinComment(db, comment.id);
    } else {
      await db.delete(comments).where(eq(comments.id, comment.id));
    }
    return;
  }

  await db.delete(comments).where(eq(comments.id, comment.id));
  const [parent] = await db
    .select()
    .from(comments)
    .where(eq(comments.id, comment.parentId))
    .limit(1);
  if (parent?.deletedAt) {
    const [another] = await db
      .select({ id: comments.id })
      .from(comments)
      .where(eq(comments.parentId, parent.id))
      .limit(1);
    if (!another) await db.delete(comments).where(eq(comments.id, parent.id));
  }
}

export type DeleteResult =
  | { ok: true; postSlug: string }
  | { ok: false; error: "not-found" | "forbidden" };

/** Deletes a comment for its author or the admin. */
export async function deleteComment(
  db: Database,
  input: { id: number; by: User; isAdmin: boolean; now?: Date },
): Promise<DeleteResult> {
  const [comment] = await db
    .select()
    .from(comments)
    .where(and(eq(comments.id, input.id), isNull(comments.deletedAt)))
    .limit(1);
  if (!comment) return { ok: false, error: "not-found" };
  if (!input.isAdmin && comment.authorId !== input.by.id) {
    return { ok: false, error: "forbidden" };
  }
  await removeComment(db, comment, input.now ?? new Date());
  return { ok: true, postSlug: comment.postSlug };
}

export type ModerationAction = "approve" | "hide" | "unhide" | "delete";

export function isModerationAction(value: unknown): value is ModerationAction {
  return (
    value === "approve" ||
    value === "hide" ||
    value === "unhide" ||
    value === "delete"
  );
}

/**
 * The admin's actions on a comment. Approving someone's comment also trusts them,
 * so their later comments skip review. Returns whether anything changed.
 */
export async function moderateComment(
  db: Database,
  id: number,
  action: ModerationAction,
  now = new Date(),
): Promise<boolean> {
  const live = and(eq(comments.id, id), isNull(comments.deletedAt));
  const setStatus = async (from: CommentStatus[], to: CommentStatus) =>
    db
      .update(comments)
      .set({ status: to })
      .where(and(live, inArray(comments.status, from)))
      .returning({ authorId: comments.authorId });

  switch (action) {
    case "approve": {
      const [approved] = await setStatus(["pending"], "published");
      if (approved?.authorId) {
        await db
          .update(users)
          .set({ trustedAt: now })
          .where(and(eq(users.id, approved.authorId), isNull(users.trustedAt)));
      }
      return approved !== undefined;
    }
    case "hide": {
      const hidden = await setStatus(["pending", "published"], "hidden");
      if (hidden.length > 0) await unpinComment(db, id);
      return hidden.length > 0;
    }
    case "unhide":
      return (await setStatus(["hidden"], "published")).length > 0;
    case "delete": {
      const [comment] = await db.select().from(comments).where(live).limit(1);
      if (!comment) return false;
      await removeComment(db, comment, now);
      return true;
    }
  }
}

/**
 * Pins a comment to the top of its post, replacing any other pin there. Only a
 * published top-level comment can be pinned. Returns its post's slug, or null.
 */
export async function pinComment(
  db: Database,
  id: number,
): Promise<string | null> {
  const [comment] = await db
    .select()
    .from(comments)
    .where(
      and(
        eq(comments.id, id),
        isNull(comments.parentId),
        isNull(comments.deletedAt),
        eq(comments.status, "published"),
      ),
    )
    .limit(1);
  if (!comment) return null;
  const updated = await db
    .update(posts)
    .set({ pinnedCommentId: comment.id })
    .where(eq(posts.slug, comment.postSlug))
    .returning({ slug: posts.slug });
  return updated[0]?.slug ?? null;
}

/** Unpins a comment, wherever it's pinned. Returns whether it was. */
export async function unpinComment(db: Database, id: number): Promise<boolean> {
  const updated = await db
    .update(posts)
    .set({ pinnedCommentId: null })
    .where(eq(posts.pinnedCommentId, id))
    .returning({ id: posts.id });
  return updated.length > 0;
}

/** Stops someone signing in or commenting, and hides everything they wrote. */
export async function blockUser(
  db: Database,
  userId: string,
  now = new Date(),
) {
  await db.update(users).set({ blockedAt: now }).where(eq(users.id, userId));
  await db
    .update(comments)
    .set({ status: "hidden" })
    .where(
      and(
        eq(comments.authorId, userId),
        inArray(comments.status, ["pending", "published"]),
      ),
    );
  await db.delete(sessions).where(eq(sessions.userId, userId));
}

/** Lets them back in. Their hidden comments stay hidden until unhidden one by one. */
export async function unblockUser(db: Database, userId: string) {
  await db.update(users).set({ blockedAt: null }).where(eq(users.id, userId));
}

/** Deletes an account: its comments (placeholders where others replied), then the user. */
export async function deleteAccount(
  db: Database,
  userId: string,
  now = new Date(),
) {
  await db.transaction(async (tx) => {
    const own = await tx
      .select()
      .from(comments)
      .where(and(eq(comments.authorId, userId), isNull(comments.deletedAt)))
      // Replies first, so a thread they started can go entirely if only they replied.
      .orderBy(sql`${comments.parentId} is null`, asc(comments.id));
    for (const comment of own) await removeComment(tx, comment, now);
    await tx.delete(users).where(eq(users.id, userId));
  });
}

/** A comment as the admin or its author sees it outside the post. */
export interface CommentSummary {
  id: number;
  postSlug: string;
  parentId: number | null;
  body: string;
  status: CommentStatus;
  createdAt: Date;
  author: (CommentAuthor & { id: string; trusted: boolean }) | null;
  /** Pinned to the top of its post. */
  pinned: boolean;
}

async function summaries(
  db: Database,
  where: ReturnType<typeof and>,
  order: "oldest" | "newest",
  limit: number,
): Promise<CommentSummary[]> {
  const rows = await db
    .select({ comment: comments, author: users, pinnedIn: posts.id })
    .from(comments)
    .leftJoin(users, eq(comments.authorId, users.id))
    .leftJoin(posts, eq(posts.pinnedCommentId, comments.id))
    .where(where)
    .orderBy(
      order === "oldest" ? asc(comments.createdAt) : desc(comments.createdAt),
    )
    .limit(limit);
  return rows.map(({ comment, author, pinnedIn }) => ({
    id: comment.id,
    postSlug: comment.postSlug,
    parentId: comment.parentId,
    body: comment.body,
    status: comment.status,
    createdAt: comment.createdAt,
    author: author && {
      id: author.id,
      login: author.githubLogin,
      name: author.name,
      trusted: author.trustedAt !== null,
    },
    pinned: pinnedIn !== null,
  }));
}

/** What /admin shows: the review queue, recent comments, and blocked accounts. */
export async function moderationOverview(db: Database) {
  const [pending, recent, blocked] = await Promise.all([
    summaries(
      db,
      and(eq(comments.status, "pending"), isNull(comments.deletedAt)),
      "oldest",
      100,
    ),
    summaries(
      db,
      and(
        inArray(comments.status, ["published", "hidden"]),
        isNull(comments.deletedAt),
      ),
      "newest",
      30,
    ),
    db
      .select()
      .from(users)
      .where(isNotNull(users.blockedAt))
      .orderBy(desc(users.blockedAt)),
  ]);
  return { pending, recent, blocked };
}

/** Someone's own comments, newest first (for /account). */
export async function userComments(db: Database, userId: string) {
  return summaries(
    db,
    and(eq(comments.authorId, userId), isNull(comments.deletedAt)),
    "newest",
    200,
  );
}
