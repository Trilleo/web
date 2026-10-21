/**
 * Watching and being told: people watch topics (their own, and ones they reply to
 * unless they turned that off) and forums; when a post goes live, watchers,
 * mentioned and quoted people get a notification (forum_notifications, shown on
 * /account/notifications/), and some kinds are emailed at once or in a daily or
 * weekly digest (forum_user_settings.email). Nobody hears about their own posts, or
 * about something they can't see.
 */
import {
  forumNotifications,
  forumPosts,
  forumTopics,
  forumUserSettings,
  forumWatches,
  forums,
  users,
  type Database,
  type ForumPost,
  type ForumTopic,
  type ForumUserSettings,
  type User,
} from "@trilleo/db";
import {
  DIGEST_GAP_MS,
  EMAILED_KINDS,
  NOTIFICATION_KINDS,
  REACTIONS,
  SIGNATURE_MAX,
  can,
  excerpt,
  isEmailFrequency,
  plainText,
  postPath,
  quotedPostIds,
  topicPath,
  type EmailFrequency,
  type NotificationKind,
} from "@trilleo/forum";
import { and, count, desc, eq, inArray, isNull, lt, or } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { absoluteUrl } from "../mail/compose";
import { notifyUser, safely } from "../mail/notify";
import { forumViewer, loadTree } from "./access";
import type { ForumTree } from "./tree";

type Tx = Parameters<Parameters<Database["transaction"]>[0]>[0];
type Db = Database | Tx;

// ---------------------------------------------------------------------------
// Settings

export interface ForumSettings {
  email: EmailFrequency;
  watchReplies: boolean;
  signature: string;
  readAllAt: Date | null;
}

export async function settingsOf(
  db: Db,
  userId: string,
): Promise<ForumSettings> {
  const [row] = await db
    .select()
    .from(forumUserSettings)
    .where(eq(forumUserSettings.userId, userId))
    .limit(1);
  return {
    email: row && isEmailFrequency(row.email) ? row.email : "instant",
    watchReplies: row?.watchReplies ?? true,
    signature: row?.signature ?? "",
    readAllAt: row?.readAllAt ?? null,
  };
}

export async function saveSettings(
  db: Database,
  userId: string,
  input: Partial<
    Pick<
      ForumUserSettings,
      "email" | "watchReplies" | "signature" | "readAllAt"
    >
  >,
  now = new Date(),
): Promise<void> {
  const set = {
    ...input,
    ...(input.signature !== undefined
      ? {
          signature: input.signature
            .replace(/\s+/g, " ")
            .trim()
            .slice(0, SIGNATURE_MAX),
        }
      : {}),
    updatedAt: now,
  };
  await db
    .insert(forumUserSettings)
    .values({ userId, ...set })
    .onConflictDoUpdate({ target: forumUserSettings.userId, set });
}

/** People's signatures, by id (only those who have one). */
export async function signaturesOf(
  db: Db,
  userIds: readonly string[],
): Promise<Map<string, string>> {
  if (userIds.length === 0) return new Map();
  const rows = await db
    .select({
      userId: forumUserSettings.userId,
      signature: forumUserSettings.signature,
    })
    .from(forumUserSettings)
    .where(inArray(forumUserSettings.userId, [...new Set(userIds)]));
  return new Map(
    rows
      .filter((row) => row.signature)
      .map((row) => [row.userId, row.signature]),
  );
}

// ---------------------------------------------------------------------------
// Watching

export type WatchTarget = { topicId: number } | { forumId: number };

const watchWhere = (userId: string, target: WatchTarget) =>
  and(
    eq(forumWatches.userId, userId),
    "topicId" in target
      ? eq(forumWatches.topicId, target.topicId)
      : eq(forumWatches.forumId, target.forumId),
  );

export async function watch(
  db: Db,
  userId: string,
  target: WatchTarget,
  now = new Date(),
): Promise<void> {
  await db
    .insert(forumWatches)
    .values({ userId, ...target, createdAt: now })
    .onConflictDoNothing();
}

export async function unwatch(
  db: Db,
  userId: string,
  target: WatchTarget,
): Promise<void> {
  await db.delete(forumWatches).where(watchWhere(userId, target));
}

export async function isWatching(db: Db, userId: string, target: WatchTarget) {
  const [row] = await db
    .select({ id: forumWatches.id })
    .from(forumWatches)
    .where(watchWhere(userId, target))
    .limit(1);
  return row !== undefined;
}

/** What someone watches, newest first (for /account/forum/). */
export async function watchesOf(db: Database, userId: string) {
  const watchedForums = alias(forums, "watched_forums");
  return db
    .select({
      id: forumWatches.id,
      topic: {
        id: forumTopics.id,
        slug: forumTopics.slug,
        title: forumTopics.title,
      },
      topicForum: { slug: forums.slug },
      forum: {
        id: watchedForums.id,
        slug: watchedForums.slug,
        name: watchedForums.name,
      },
      createdAt: forumWatches.createdAt,
    })
    .from(forumWatches)
    .leftJoin(forumTopics, eq(forumTopics.id, forumWatches.topicId))
    .leftJoin(forums, eq(forums.id, forumTopics.forumId))
    .leftJoin(watchedForums, eq(watchedForums.id, forumWatches.forumId))
    .where(
      and(
        eq(forumWatches.userId, userId),
        or(isNull(forumWatches.topicId), isNull(forumTopics.deletedAt)),
      ),
    )
    .orderBy(desc(forumWatches.createdAt));
}

// ---------------------------------------------------------------------------
// Telling people

interface Recipient {
  userId: string;
  kind: NotificationKind;
}

async function usersById(db: Db, ids: readonly string[]): Promise<User[]> {
  if (ids.length === 0) return [];
  return db
    .select()
    .from(users)
    .where(inArray(users.id, [...new Set(ids)]));
}

/** Whether someone may see this post (its forum, its topic, the post itself). */
async function canSee(
  db: Database,
  tree: ForumTree,
  user: User,
  topic: ForumTopic,
  post: ForumPost,
): Promise<boolean> {
  const node = tree.get(topic.forumId);
  if (!node || user.blockedAt) return false;
  const viewer = await forumViewer(db, tree, user);
  const place = tree.place(node.forum);
  return (
    can(viewer, "forum.view", place, topic) &&
    can(viewer, "forum.view", place, {
      ...topic,
      state: post.state,
      authorId: post.authorId,
    })
  );
}

function subjectFor(
  kind: NotificationKind,
  actor: string,
  topic: ForumTopic,
): string {
  switch (kind) {
    case "reply":
      return `${actor} replied in “${topic.title}”`;
    case "topic":
      return `New topic: “${topic.title}”`;
    case "mention":
      return `${actor} mentioned you in “${topic.title}”`;
    case "quote":
      return `${actor} quoted you in “${topic.title}”`;
    case "accepted":
      return `Your answer in “${topic.title}” was accepted`;
    case "reaction":
      return `${actor} reacted to your post`;
  }
}

/**
 * Writes the notifications and emails those who want them at once. One per person:
 * a mention beats a quote beats a reply or new topic.
 */
async function deliver(
  db: Database,
  input: {
    recipients: readonly Recipient[];
    actor: User | undefined;
    topic: ForumTopic;
    post: ForumPost;
    detail?: string;
    now: Date;
  },
): Promise<number> {
  const order: NotificationKind[] = [
    "mention",
    "quote",
    "accepted",
    "reply",
    "topic",
    "reaction",
  ];
  const best = new Map<string, NotificationKind>();
  for (const recipient of input.recipients) {
    if (recipient.userId === input.actor?.id) continue;
    const current = best.get(recipient.userId);
    if (!current || order.indexOf(recipient.kind) < order.indexOf(current))
      best.set(recipient.userId, recipient.kind);
  }
  if (best.size === 0) return 0;
  const tree = await loadTree(db);
  const people = await usersById(db, [...best.keys()]);
  let sent = 0;
  for (const person of people) {
    const kind = best.get(person.id);
    if (!kind || !(await canSee(db, tree, person, input.topic, input.post)))
      continue;
    const [row] = await db
      .insert(forumNotifications)
      .values({
        userId: person.id,
        kind,
        actorId: input.actor?.id ?? null,
        topicId: input.topic.id,
        postId: input.post.id,
        detail: input.detail ?? "",
        createdAt: input.now,
      })
      .returning({ id: forumNotifications.id });
    sent += 1;
    if (!row || !EMAILED_KINDS.has(kind)) continue;
    const settings = await settingsOf(db, person.id);
    if (settings.email !== "instant") continue;
    const actorName = input.actor ? `@${input.actor.username}` : "Someone";
    await safely("forum notification", () =>
      notifyUser(
        db,
        person,
        "forum-notification",
        {
          subject: subjectFor(kind, actorName, input.topic),
          body: {
            label: "Forum",
            title: input.topic.title,
            preheader: `${actorName} ${NOTIFICATION_KINDS[kind]}`,
            blocks: [
              {
                type: "text",
                text: `${actorName} ${NOTIFICATION_KINDS[kind]}:`,
              },
              { type: "quote", text: excerpt(plainText(input.post.html), 400) },
              {
                type: "button",
                label: "Read it",
                href: absoluteUrl(postPath(input.post)),
              },
            ],
          },
          ref: `forum-post:${String(input.post.id)}`,
        },
        input.now,
      ),
    );
    await db
      .update(forumNotifications)
      .set({ emailedAt: input.now })
      .where(eq(forumNotifications.id, row.id));
  }
  return sent;
}

/**
 * A post went live: its topic's (or, for a new topic, its forum's) watchers, and
 * anyone it mentions or quotes, hear about it.
 */
export async function notifyPublished(
  db: Database,
  topic: ForumTopic,
  post: ForumPost,
  now = new Date(),
): Promise<number> {
  if (post.state !== "published" || topic.state !== "published") return 0;
  const first = post.id === topic.firstPostId;
  const recipients: Recipient[] = [];

  if (first) {
    const tree = await loadTree(db);
    const chain = [
      ...tree.ancestors(topic.forumId).map((forum) => forum.id),
      topic.forumId,
    ];
    const watchers = await db
      .select({ userId: forumWatches.userId })
      .from(forumWatches)
      .where(inArray(forumWatches.forumId, chain));
    recipients.push(
      ...watchers.map((row) => ({
        userId: row.userId,
        kind: "topic" as const,
      })),
    );
  } else {
    const watchers = await db
      .select({ userId: forumWatches.userId })
      .from(forumWatches)
      .where(eq(forumWatches.topicId, topic.id));
    recipients.push(
      ...watchers.map((row) => ({
        userId: row.userId,
        kind: "reply" as const,
      })),
    );
  }

  // Mentions as the post links them (not in code, quotes' headings or links).
  const names = [
    ...new Set(
      [...post.html.matchAll(/data-mention="([a-z0-9-]+)"/g)].flatMap(
        (match) => (match[1] ? [match[1]] : []),
      ),
    ),
  ];
  if (names.length > 0) {
    const mentioned = await db
      .select({ id: users.id })
      .from(users)
      .where(inArray(users.username, names));
    recipients.push(
      ...mentioned.map((row) => ({ userId: row.id, kind: "mention" as const })),
    );
  }
  const quoted = quotedPostIds(post.body);
  if (quoted.length > 0) {
    const authors = await db
      .select({ authorId: forumPosts.authorId })
      .from(forumPosts)
      .where(inArray(forumPosts.id, quoted));
    recipients.push(
      ...authors.flatMap((row) =>
        row.authorId ? [{ userId: row.authorId, kind: "quote" as const }] : [],
      ),
    );
  }
  const [actor] = post.authorId ? await usersById(db, [post.authorId]) : [];
  return deliver(db, { recipients, actor, topic, post, now });
}

export async function notifyReaction(
  db: Database,
  post: ForumPost,
  actorId: string,
  reaction: string,
  now = new Date(),
): Promise<void> {
  if (!post.authorId || post.authorId === actorId) return;
  const [topic] = await db
    .select()
    .from(forumTopics)
    .where(eq(forumTopics.id, post.topicId))
    .limit(1);
  if (!topic) return;
  const [actor] = await usersById(db, [actorId]);
  await deliver(db, {
    recipients: [{ userId: post.authorId, kind: "reaction" }],
    actor,
    topic,
    post,
    detail: reaction,
    now,
  });
}

export async function notifyAccepted(
  db: Database,
  topic: ForumTopic,
  post: ForumPost,
  byId: string,
  now = new Date(),
): Promise<void> {
  if (!post.authorId) return;
  const [actor] = await usersById(db, [byId]);
  await deliver(db, {
    recipients: [{ userId: post.authorId, kind: "accepted" }],
    actor,
    topic,
    post,
    now,
  });
}

// ---------------------------------------------------------------------------
// The inbox

export const NOTIFICATIONS_SHOWN = 50;

export interface NotificationView {
  id: number;
  kind: NotificationKind;
  actor: string | null;
  topicTitle: string | null;
  href: string;
  detail: string;
  createdAt: Date;
  read: boolean;
}

export async function listNotifications(
  db: Database,
  userId: string,
  limit = NOTIFICATIONS_SHOWN,
): Promise<NotificationView[]> {
  const actors = alias(users, "actors");
  const rows = await db
    .select({
      notification: forumNotifications,
      actor: actors.username,
      topic: {
        id: forumTopics.id,
        slug: forumTopics.slug,
        title: forumTopics.title,
      },
      forumSlug: forums.slug,
    })
    .from(forumNotifications)
    .leftJoin(actors, eq(actors.id, forumNotifications.actorId))
    .leftJoin(forumTopics, eq(forumTopics.id, forumNotifications.topicId))
    .leftJoin(forums, eq(forums.id, forumTopics.forumId))
    .where(eq(forumNotifications.userId, userId))
    .orderBy(desc(forumNotifications.createdAt), desc(forumNotifications.id))
    .limit(limit);
  return rows.map(({ notification, actor, topic, forumSlug }) => ({
    id: notification.id,
    kind: Object.hasOwn(NOTIFICATION_KINDS, notification.kind)
      ? (notification.kind as NotificationKind)
      : "reply",
    actor,
    topicTitle: topic?.title ?? null,
    href:
      notification.postId !== null
        ? postPath({ id: notification.postId })
        : topic && forumSlug
          ? topicPath({ slug: forumSlug }, topic)
          : "/forum/",
    detail:
      REACTIONS.find((reaction) => reaction.key === notification.detail)
        ?.emoji ?? "",
    createdAt: notification.createdAt,
    read: notification.readAt !== null,
  }));
}

export async function unreadNotifications(
  db: Database,
  userId: string,
): Promise<number> {
  const [row] = await db
    .select({ total: count() })
    .from(forumNotifications)
    .where(
      and(
        eq(forumNotifications.userId, userId),
        isNull(forumNotifications.readAt),
      ),
    );
  return row?.total ?? 0;
}

export async function markNotificationsRead(
  db: Database,
  userId: string,
  now = new Date(),
): Promise<void> {
  await db
    .update(forumNotifications)
    .set({ readAt: now })
    .where(
      and(
        eq(forumNotifications.userId, userId),
        isNull(forumNotifications.readAt),
      ),
    );
}

// ---------------------------------------------------------------------------
// Digests

/**
 * Sends the digests that are due: one email per person on a daily or weekly
 * digest, whose last one went out long enough ago, listing what they haven't been
 * emailed about yet. Returns how many were queued.
 */
export async function sendForumDigests(
  db: Database,
  now = new Date(),
): Promise<number> {
  const due = await db
    .select()
    .from(forumUserSettings)
    .where(inArray(forumUserSettings.email, ["daily", "weekly"]));
  let sent = 0;
  for (const settings of due) {
    const gap = DIGEST_GAP_MS[settings.email as "daily" | "weekly"];
    if (
      settings.digestSentAt &&
      now.getTime() - settings.digestSentAt.getTime() < gap
    )
      continue;
    const pending = await db
      .select({
        id: forumNotifications.id,
        kind: forumNotifications.kind,
        postId: forumNotifications.postId,
        title: forumTopics.title,
      })
      .from(forumNotifications)
      .innerJoin(forumTopics, eq(forumTopics.id, forumNotifications.topicId))
      .where(
        and(
          eq(forumNotifications.userId, settings.userId),
          isNull(forumNotifications.emailedAt),
          inArray(forumNotifications.kind, [...EMAILED_KINDS]),
          isNull(forumTopics.deletedAt),
        ),
      )
      .orderBy(desc(forumNotifications.createdAt))
      .limit(100);
    await db
      .update(forumUserSettings)
      .set({ digestSentAt: now })
      .where(eq(forumUserSettings.userId, settings.userId));
    if (pending.length === 0) continue;
    const [person] = await usersById(db, [settings.userId]);
    const queued = await notifyUser(
      db,
      person,
      "forum-digest",
      {
        subject:
          pending.length === 1
            ? "1 thing happened in the forum"
            : `${String(pending.length)} things happened in the forum`,
        body: {
          label: "Forum",
          title:
            settings.email === "daily"
              ? "Your daily digest"
              : "Your weekly digest",
          blocks: [
            { type: "text", text: "Since your last digest:" },
            {
              type: "list",
              items: pending.map((row) => ({
                text: `${row.title}: ${NOTIFICATION_KINDS[row.kind as NotificationKind]}`,
                ...(row.postId !== null
                  ? { href: absoluteUrl(postPath({ id: row.postId })) }
                  : {}),
              })),
            },
            {
              type: "button",
              label: "Open your notifications",
              href: absoluteUrl("/account/notifications/"),
            },
          ],
        },
        ref: `forum-digest:${settings.userId}`,
      },
      now,
    );
    await db
      .update(forumNotifications)
      .set({ emailedAt: now })
      .where(
        inArray(
          forumNotifications.id,
          pending.map((row) => row.id),
        ),
      );
    if (queued) sent += 1;
  }
  return sent;
}

/** Notifications older than this are cleared (read or not). */
export const NOTIFICATION_RETENTION_DAYS = 90;

export async function purgeNotifications(
  db: Database,
  now = new Date(),
): Promise<void> {
  await db
    .delete(forumNotifications)
    .where(
      lt(
        forumNotifications.createdAt,
        new Date(now.getTime() - NOTIFICATION_RETENTION_DAYS * 86_400_000),
      ),
    );
}

/** For the account export: settings, watches and notifications. */
export async function notificationExport(db: Database, userId: string) {
  const [settings, watches, notifications] = await Promise.all([
    settingsOf(db, userId),
    watchesOf(db, userId),
    listNotifications(db, userId, 1000),
  ]);
  return {
    settings,
    watching: watches.map((row) =>
      row.topic?.id
        ? { topic: row.topic.title }
        : { forum: row.forum?.name ?? null },
    ),
    notifications: notifications.map((row) => ({
      kind: row.kind,
      by: row.actor,
      topic: row.topicTitle,
      at: row.createdAt,
      read: row.read,
    })),
  };
}
