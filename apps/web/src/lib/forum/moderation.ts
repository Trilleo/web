/**
 * Moderators' tools beyond a single post's state (store.ts's moderatePost): moving,
 * merging and splitting topics, bans, reports and edit history. The caller has
 * checked who may (`tree.moderates`); everything here is logged (log.ts).
 */
import {
  forumBans,
  forumLog,
  forumPostRevisions,
  forumPosts,
  forumReports,
  forumTopics,
  users,
  type Database,
  type Forum,
  type ForumBan,
  type ForumPost,
  type ForumPostRevision,
  type ForumReport,
  type ForumTopic,
  type User,
} from "@trilleo/db";
import {
  REASON_MAX,
  REPORT_NOTE_MAX,
  banEnds,
  normalizeTitle,
  slugify,
  type BanLength,
  type ReportReason,
} from "@trilleo/forum";
import { reporterCounts, reportsHide } from "@trilleo/storage";
import { and, asc, desc, eq, gt, inArray, isNull, or, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { isAdmin } from "../auth/guard";
import { alertAdmin } from "../mail/alerts";
import { safely } from "../mail/notify";
import { removeAvatar } from "../profile/avatar";
import { characterCount } from "../profile/profile";
import { logAction } from "./log";
import {
  moderatePost,
  refreshForum,
  refreshTopic,
  type PostResult,
} from "./store";
import type { ForumTree } from "./tree";

// ---------------------------------------------------------------------------
// Move, merge, split

/** Moves a topic into another forum (not a category). Its address follows. */
export async function moveTopic(
  db: Database,
  input: { topic: ForumTopic; to: Forum; by: User; now?: Date },
): Promise<boolean> {
  const now = input.now ?? new Date();
  const { topic, to } = input;
  if (to.kind !== "forum" || to.id === topic.forumId) return false;
  await db.transaction(async (tx) => {
    await tx
      .update(forumTopics)
      .set({ forumId: to.id, updatedAt: now })
      .where(eq(forumTopics.id, topic.id));
    await refreshForum(tx, topic.forumId);
    await refreshForum(tx, to.id);
    await logAction(
      tx,
      {
        actorId: input.by.id,
        action: "move",
        forumId: to.id,
        topicId: topic.id,
        targetUserId: topic.authorId,
        detail: `To ${to.name}`,
      },
      now,
    );
  });
  return true;
}

/**
 * Merges a topic into another: its posts join the other (in time order, as ever),
 * and it's deleted with `mergedInto` set, so its address redirects.
 */
export async function mergeTopic(
  db: Database,
  input: { from: ForumTopic; into: ForumTopic; by: User; now?: Date },
): Promise<boolean> {
  const now = input.now ?? new Date();
  const { from, into } = input;
  if (from.id === into.id || into.deletedAt !== null) return false;
  await db.transaction(async (tx) => {
    await tx
      .update(forumPosts)
      .set({ topicId: into.id })
      .where(eq(forumPosts.topicId, from.id));
    await tx
      .update(forumTopics)
      .set({ deletedAt: now, mergedInto: into.id, pinned: "none" })
      .where(eq(forumTopics.id, from.id));
    await refreshTopic(tx, into.id);
    if (from.forumId !== into.forumId) await refreshForum(tx, from.forumId);
    await logAction(
      tx,
      {
        actorId: input.by.id,
        action: "merge",
        forumId: into.forumId,
        topicId: into.id,
        targetUserId: from.authorId,
        detail: `“${from.title}” merged in`,
      },
      now,
    );
  });
  return true;
}

/** Where a merged (or merged-again) topic went now: follows the chain. */
export async function mergedTarget(
  db: Database,
  topicId: number,
): Promise<ForumTopic | undefined> {
  let id: number | null = topicId;
  for (let hops = 0; id !== null && hops < 10; hops++) {
    const [topic] = await db
      .select()
      .from(forumTopics)
      .where(eq(forumTopics.id, id))
      .limit(1);
    if (!topic) return undefined;
    if (topic.deletedAt === null) return hops === 0 ? undefined : topic;
    id = topic.mergedInto;
  }
  return undefined;
}

/**
 * Splits some posts off into a new topic in `to`, titled `title`. The first of them
 * (by time) opens it, so its author starts it. A topic can't lose every post.
 */
export async function splitPosts(
  db: Database,
  input: {
    topic: ForumTopic;
    postIds: readonly number[];
    title: string;
    to: Forum;
    by: User;
    now?: Date;
  },
): Promise<PostResult<ForumTopic>> {
  const now = input.now ?? new Date();
  const title = normalizeTitle(input.title);
  if (!title) return { ok: false, error: "empty-title" };
  if (characterCount(title) > 120) return { ok: false, error: "long-title" };
  if (input.to.kind !== "forum") return { ok: false, error: "forbidden" };
  const moving = await db
    .select()
    .from(forumPosts)
    .where(
      and(
        eq(forumPosts.topicId, input.topic.id),
        inArray(forumPosts.id, [...input.postIds]),
        isNull(forumPosts.deletedAt),
      ),
    )
    .orderBy(asc(forumPosts.createdAt), asc(forumPosts.id));
  const [left] = await db
    .select({ id: forumPosts.id })
    .from(forumPosts)
    .where(
      and(
        eq(forumPosts.topicId, input.topic.id),
        isNull(forumPosts.deletedAt),
        moving.length > 0
          ? sql`${forumPosts.id} not in ${moving.map((post) => post.id)}`
          : undefined,
      ),
    )
    .limit(1);
  const opening = moving[0];
  if (!opening || !left) return { ok: false, error: "forbidden" };

  const topic = await db.transaction(async (tx) => {
    const [created] = await tx
      .insert(forumTopics)
      .values({
        forumId: input.to.id,
        authorId: opening.authorId,
        title,
        slug: slugify(title),
        state: opening.state,
        lastPostAt: opening.createdAt,
        createdAt: opening.createdAt,
        updatedAt: now,
      })
      .returning();
    if (!created) throw new Error("Saving the topic returned nothing");
    await tx
      .update(forumPosts)
      .set({ topicId: created.id })
      .where(
        inArray(
          forumPosts.id,
          moving.map((post) => post.id),
        ),
      );
    await refreshTopic(tx, created.id);
    await refreshTopic(tx, input.topic.id);
    await logAction(
      tx,
      {
        actorId: input.by.id,
        action: "split",
        forumId: input.to.id,
        topicId: created.id,
        detail: `${String(moving.length)} ${moving.length === 1 ? "post" : "posts"} from “${input.topic.title}”`,
      },
      now,
    );
    return created;
  });
  return { ok: true, value: topic };
}

// ---------------------------------------------------------------------------
// Edit history

export interface PostVersion {
  body: string;
  title: string | null;
  editor: string | null;
  savedAt: Date;
  /** The version shown now. */
  current: boolean;
}

/** A post's versions, oldest first, ending with the current one. */
export async function postHistory(
  db: Database,
  post: ForumPost,
  topic: ForumTopic,
): Promise<PostVersion[]> {
  const editors = alias(users, "editors");
  const rows = await db
    .select({ revision: forumPostRevisions, editor: editors.username })
    .from(forumPostRevisions)
    .leftJoin(editors, eq(editors.id, forumPostRevisions.editorId))
    .where(eq(forumPostRevisions.postId, post.id))
    .orderBy(asc(forumPostRevisions.savedAt), asc(forumPostRevisions.id));
  const [current] = await db
    .select({ username: users.username })
    .from(users)
    .where(eq(users.id, post.editedById ?? post.authorId ?? ""))
    .limit(1);
  const first = post.id === topic.firstPostId;
  return [
    ...rows.map(
      ({
        revision,
        editor,
      }: {
        revision: ForumPostRevision;
        editor: string | null;
      }) => ({
        body: revision.body,
        title: revision.title,
        editor,
        savedAt: revision.savedAt,
        current: false,
      }),
    ),
    {
      body: post.body,
      title: first ? topic.title : null,
      editor: current?.username ?? null,
      savedAt: post.editedAt ?? post.createdAt,
      current: true,
    },
  ];
}

// ---------------------------------------------------------------------------
// Bans

export function cleanReason(reason: string): string {
  return reason.replace(/\s+/g, " ").trim().slice(0, REASON_MAX);
}

/** Bans someone from posting (replacing a ban they have). */
export async function banUser(
  db: Database,
  input: {
    userId: string;
    length: BanLength;
    reason: string;
    by: User;
    now?: Date;
  },
): Promise<ForumBan | null> {
  const now = input.now ?? new Date();
  const reason = cleanReason(input.reason);
  if (!reason || input.userId === input.by.id) return null;
  // The admin can't be banned (they could always lift it, and must stay in charge).
  const [target] = await db
    .select({ email: users.email, githubId: users.githubId })
    .from(users)
    .where(eq(users.id, input.userId))
    .limit(1);
  if (!target || isAdmin(target)) return null;
  return db.transaction(async (tx) => {
    await tx
      .update(forumBans)
      .set({ liftedAt: now, liftedById: input.by.id })
      .where(
        and(eq(forumBans.userId, input.userId), isNull(forumBans.liftedAt)),
      );
    const [ban] = await tx
      .insert(forumBans)
      .values({
        userId: input.userId,
        reason,
        until: banEnds(input.length, now),
        byId: input.by.id,
        createdAt: now,
      })
      .returning();
    await logAction(
      tx,
      {
        actorId: input.by.id,
        action: "ban",
        targetUserId: input.userId,
        detail: `${input.length === "forever" ? "Permanently" : `Until ${(ban?.until ?? now).toISOString().slice(0, 10)}`} · ${reason}`,
      },
      now,
    );
    return ban ?? null;
  });
}

export async function liftBan(
  db: Database,
  input: { banId: number; by: User; now?: Date },
): Promise<boolean> {
  const now = input.now ?? new Date();
  const [ban] = await db
    .update(forumBans)
    .set({ liftedAt: now, liftedById: input.by.id })
    .where(and(eq(forumBans.id, input.banId), isNull(forumBans.liftedAt)))
    .returning();
  if (!ban) return false;
  await logAction(
    db,
    { actorId: input.by.id, action: "unban", targetUserId: ban.userId },
    now,
  );
  return true;
}

/** Bans in force now, newest first, with whom they're for and who gave them. */
export async function activeBans(db: Database, now = new Date()) {
  const givers = alias(users, "givers");
  return db
    .select({
      ban: forumBans,
      username: users.username,
      by: givers.username,
    })
    .from(forumBans)
    .innerJoin(users, eq(users.id, forumBans.userId))
    .leftJoin(givers, eq(givers.id, forumBans.byId))
    .where(
      and(
        isNull(forumBans.liftedAt),
        or(isNull(forumBans.until), gt(forumBans.until, now)),
      ),
    )
    .orderBy(desc(forumBans.createdAt));
}

// ---------------------------------------------------------------------------
// Reports

export type ReportError =
  "not-found" | "own" | "already" | "empty" | "forbidden";

export const REPORT_ERROR_MESSAGES: Readonly<Record<ReportError, string>> = {
  "not-found": "That isn’t there any more.",
  own: "You can’t report your own post or picture.",
  already: "You’ve already reported this; a moderator will look at it.",
  empty: "Choose a reason.",
  forbidden: "You can’t report this.",
};

/**
 * Reports a post (the caller checked the reporter may see it) or someone's
 * picture. One open report per reporter per thing. Enough reports from established
 * accounts hide a post until a moderator looks.
 */
export async function createReport(
  db: Database,
  input: {
    reporter: User;
    reason: ReportReason;
    note: string;
    target:
      | { kind: "post"; post: ForumPost; topic: ForumTopic }
      | { kind: "avatar"; userId: string };
    now?: Date;
  },
): Promise<{ ok: true; hidden: boolean } | { ok: false; error: ReportError }> {
  const now = input.now ?? new Date();
  const { target } = input;
  const ownerId = target.kind === "post" ? target.post.authorId : target.userId;
  if (ownerId === input.reporter.id) return { ok: false, error: "own" };
  const same =
    target.kind === "post"
      ? eq(forumReports.postId, target.post.id)
      : and(
          eq(forumReports.kind, "avatar"),
          eq(forumReports.userId, target.userId),
        );
  const [already] = await db
    .select({ id: forumReports.id })
    .from(forumReports)
    .where(
      and(
        same,
        eq(forumReports.status, "open"),
        eq(forumReports.reporterId, input.reporter.id),
      ),
    )
    .limit(1);
  if (already) return { ok: false, error: "already" };

  await db.insert(forumReports).values({
    kind: target.kind,
    postId: target.kind === "post" ? target.post.id : null,
    userId: ownerId,
    reporterId: input.reporter.id,
    reason: input.reason,
    note: input.note.trim().slice(0, REPORT_NOTE_MAX),
    createdAt: now,
  });

  let hidden = false;
  if (target.kind === "post" && target.post.state === "published") {
    const reporters = await db
      .select({ createdAt: users.createdAt })
      .from(forumReports)
      .innerJoin(users, eq(users.id, forumReports.reporterId))
      .where(and(same, eq(forumReports.status, "open")));
    const counting = reporters.filter((row) =>
      reporterCounts(row.createdAt, now),
    ).length;
    if (reportsHide(counting)) {
      hidden = await moderatePost(db, {
        topic: target.topic,
        post: target.post,
        action: "hide",
        by: null,
        reason: `${String(counting)} reports`,
        now,
      });
    }
  }
  await safely("admin alert", () =>
    alertAdmin(
      db,
      {
        kind: "forum-report",
        summary:
          target.kind === "post"
            ? `A forum post was reported (${input.reason})`
            : `A profile picture was reported (${input.reason})`,
        path: "/forum/moderate/?tab=reports",
      },
      now,
    ),
  );
  return { ok: true, hidden };
}

/** Open reports, grouped by what they're about, oldest first. */
export interface ReportGroup {
  kind: "post" | "avatar";
  /** For a post. */
  post: ForumPost | null;
  topic: ForumTopic | null;
  forum: Pick<Forum, "id" | "slug" | "name"> | null;
  /** Whose post or picture. */
  owner: { id: string; username: string; avatarHash: string | null } | null;
  reports: (ForumReport & { reporter: string | null })[];
}

/**
 * The open reports a moderator may act on: posts in forums they moderate, and
 * pictures if they moderate everywhere (`everywhere`).
 */
export async function openReports(
  db: Database,
  input: {
    tree: ForumTree;
    moderatedIds: ReadonlySet<number>;
    everywhere: boolean;
  },
): Promise<ReportGroup[]> {
  const reporters = alias(users, "reporters");
  const owners = alias(users, "owners");
  const rows = await db
    .select({
      report: forumReports,
      reporter: reporters.username,
      post: forumPosts,
      topic: forumTopics,
      owner: {
        id: owners.id,
        username: owners.username,
        avatarHash: owners.avatarHash,
      },
    })
    .from(forumReports)
    .leftJoin(reporters, eq(reporters.id, forumReports.reporterId))
    .leftJoin(owners, eq(owners.id, forumReports.userId))
    .leftJoin(forumPosts, eq(forumPosts.id, forumReports.postId))
    .leftJoin(forumTopics, eq(forumTopics.id, forumPosts.topicId))
    .where(eq(forumReports.status, "open"))
    .orderBy(asc(forumReports.createdAt));
  const groups = new Map<string, ReportGroup>();
  for (const row of rows) {
    const key =
      row.report.kind === "post"
        ? `post:${String(row.report.postId)}`
        : `avatar:${row.report.userId ?? ""}`;
    if (row.report.kind === "post") {
      if (!row.topic || !input.moderatedIds.has(row.topic.forumId)) continue;
    } else if (!input.everywhere) {
      continue;
    }
    let group = groups.get(key);
    if (!group) {
      const node = row.topic ? input.tree.get(row.topic.forumId) : undefined;
      group = {
        kind: row.report.kind,
        post: row.post,
        topic: row.topic,
        forum: node
          ? { id: node.forum.id, slug: node.forum.slug, name: node.forum.name }
          : null,
        owner: row.owner,
        reports: [],
      };
      groups.set(key, group);
    }
    group.reports.push({ ...row.report, reporter: row.reporter });
  }
  return [...groups.values()];
}

export async function openReportCount(
  db: Database,
  input: { moderatedIds: ReadonlySet<number>; everywhere: boolean },
): Promise<number> {
  const rows = await db
    .select({ kind: forumReports.kind, forumId: forumTopics.forumId })
    .from(forumReports)
    .leftJoin(forumPosts, eq(forumPosts.id, forumReports.postId))
    .leftJoin(forumTopics, eq(forumTopics.id, forumPosts.topicId))
    .where(eq(forumReports.status, "open"));
  return rows.filter((row) =>
    row.kind === "avatar"
      ? input.everywhere
      : row.forumId !== null && input.moderatedIds.has(row.forumId),
  ).length;
}

export type ReportDecision = "dismiss" | "hide" | "delete" | "remove-avatar";

export function isReportDecision(value: string): value is ReportDecision {
  return ["dismiss", "hide", "delete", "remove-avatar"].includes(value);
}

/**
 * Settles every open report about one thing: dismiss them, or act (hide or delete
 * the post, remove the picture). Returns whether there were any.
 */
export async function resolveReports(
  db: Database,
  input: {
    target:
      | { kind: "post"; post: ForumPost; topic: ForumTopic }
      | { kind: "avatar"; userId: string };
    decision: ReportDecision;
    by: User;
    now?: Date;
  },
): Promise<boolean> {
  const now = input.now ?? new Date();
  const { target, decision } = input;
  const valid =
    target.kind === "post"
      ? decision !== "remove-avatar"
      : decision === "dismiss" || decision === "remove-avatar";
  if (!valid) return false;
  const same =
    target.kind === "post"
      ? eq(forumReports.postId, target.post.id)
      : and(
          eq(forumReports.kind, "avatar"),
          eq(forumReports.userId, target.userId),
        );
  const settled = await db
    .update(forumReports)
    .set({
      status: decision === "dismiss" ? "dismissed" : "actioned",
      resolvedAt: now,
      resolvedById: input.by.id,
    })
    .where(and(same, eq(forumReports.status, "open")))
    .returning({ id: forumReports.id });
  if (settled.length === 0) return false;

  if (target.kind === "post") {
    if (decision === "hide" || decision === "delete")
      await moderatePost(db, {
        topic: target.topic,
        post: target.post,
        action: decision,
        by: input.by.id,
        reason: "Reported",
        now,
      });
    // A post the reports hid (not a moderator) comes back when they're dismissed.
    if (decision === "dismiss" && target.post.state === "hidden") {
      const [last] = await db
        .select({ action: forumLog.action })
        .from(forumLog)
        .where(eq(forumLog.postId, target.post.id))
        .orderBy(desc(forumLog.createdAt), desc(forumLog.id))
        .limit(1);
      if (last?.action === "auto-hide")
        await moderatePost(db, {
          topic: target.topic,
          post: target.post,
          action: "unhide",
          by: input.by.id,
          reason: "Reports dismissed",
          now,
        });
    }
  } else if (decision === "remove-avatar") {
    await removeAvatar(db, target.userId);
    await logAction(
      db,
      {
        actorId: input.by.id,
        action: "avatar-removed",
        targetUserId: target.userId,
      },
      now,
    );
  }
  await logAction(
    db,
    {
      actorId: input.by.id,
      action: decision === "dismiss" ? "report-dismissed" : "report-actioned",
      forumId: target.kind === "post" ? target.topic.forumId : null,
      topicId: target.kind === "post" ? target.topic.id : null,
      postId: target.kind === "post" ? target.post.id : null,
      targetUserId:
        target.kind === "post" ? target.post.authorId : target.userId,
      detail: `${String(settled.length)} ${settled.length === 1 ? "report" : "reports"}`,
    },
    now,
  );
  return true;
}

// ---------------------------------------------------------------------------
// Accounts

/** For someone's export: their reports, bans on them, and their posts' history. */
export async function moderationExport(db: Database, userId: string) {
  const [reports, bans, revisions] = await Promise.all([
    db
      .select({
        kind: forumReports.kind,
        postId: forumReports.postId,
        reason: forumReports.reason,
        note: forumReports.note,
        status: forumReports.status,
        createdAt: forumReports.createdAt,
      })
      .from(forumReports)
      .where(eq(forumReports.reporterId, userId))
      .orderBy(asc(forumReports.createdAt)),
    db
      .select({
        reason: forumBans.reason,
        until: forumBans.until,
        createdAt: forumBans.createdAt,
        liftedAt: forumBans.liftedAt,
      })
      .from(forumBans)
      .where(eq(forumBans.userId, userId))
      .orderBy(asc(forumBans.createdAt)),
    db
      .select({
        postId: forumPostRevisions.postId,
        body: forumPostRevisions.body,
        title: forumPostRevisions.title,
        savedAt: forumPostRevisions.savedAt,
      })
      .from(forumPostRevisions)
      .innerJoin(forumPosts, eq(forumPosts.id, forumPostRevisions.postId))
      .where(eq(forumPosts.authorId, userId))
      .orderBy(asc(forumPostRevisions.savedAt)),
  ]);
  return { reports, bans, revisions };
}

/** The forums someone moderates (theirs and everything under them), by id. */
export function moderatedForumIds(
  tree: ForumTree,
  viewer: Parameters<ForumTree["moderates"]>[1],
): Set<number> {
  return new Set(
    tree
      .flat()
      .filter((node) => tree.moderates(node.forum, viewer))
      .map((node) => node.forum.id),
  );
}

/** Topics a moderator could merge into: found by id or address. */
export function parseTopicReference(value: string): number | null {
  const match = /(?:^|\/)([1-9]\d{0,9})(?:-[^/]*)?\/?(?:[?#].*)?$/.exec(
    value.trim(),
  );
  return match?.[1] ? Number(match[1]) : null;
}
