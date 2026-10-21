/**
 * Private messages: conversations of 2–10 people. Only their members read them; the
 * admin sees a message only when someone reports it (with the few before it, for
 * context). Who may send: trusted members, moderators and the admin, when not
 * blocked or banned. Who may be reached: each person's setting (everyone, people
 * they've talked to, nobody) and blocks, except by staff (moderators everywhere,
 * the admin).
 */
import {
  forumBlocks,
  forumConversationMembers,
  forumConversations,
  forumMessages,
  forumReports,
  forumUserSettings,
  users,
  type Database,
  type ForumConversation,
  type ForumMessage,
  type User,
} from "@trilleo/db";
import {
  FORUM_RENDER_VERSION,
  MESSAGE_LIMITS,
  isMessagePrivacy,
  mayMessage,
  normalizeBody,
  type MessagePrivacy,
  type ReportReason,
} from "@trilleo/forum";
import {
  and,
  asc,
  count,
  desc,
  eq,
  gt,
  inArray,
  isNull,
  ne,
  or,
  sql,
} from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { normalizeUsername } from "../auth/usernames";
import { alertAdmin } from "../mail/alerts";
import { safely } from "../mail/notify";
import { characterCount, displayName } from "../profile/profile";
import { forumViewer, moderatesEverywhere } from "./access";
import { deleteDraft, draftKey } from "./drafts";
import { notifyMessage } from "./notifications";
import { renderBody } from "./store";
import type { ForumTree } from "./tree";

export type MessageError =
  | "not-allowed"
  | "banned"
  | "no-recipients"
  | "too-many"
  | "unknown-user"
  | "cannot-reach"
  | "empty"
  | "too-long"
  | "subject"
  | "rate-limited"
  | "not-member";

export const MESSAGE_ERRORS: Readonly<Record<MessageError, string>> = {
  "not-allowed":
    "You can send messages once one of your posts or comments has been approved.",
  banned: "You’re banned from the forum, which includes messages.",
  "no-recipients": "Say who it’s for.",
  "too-many": `A conversation can have up to ${String(MESSAGE_LIMITS.members)} people.`,
  "unknown-user": "There’s no account with that username.",
  "cannot-reach": "That person doesn’t take messages from you.",
  empty: "Your message is empty.",
  "too-long": `Messages can be up to ${String(MESSAGE_LIMITS.body)} characters.`,
  subject: `Give it a subject, up to ${String(MESSAGE_LIMITS.subject)} characters.`,
  "rate-limited":
    "You’ve sent a lot of messages lately. Wait a while and try again.",
  "not-member": "You’re not in that conversation.",
};

export type MessageResult<T> =
  { ok: true; value: T } | { ok: false; error: MessageError };

// ---------------------------------------------------------------------------
// Who may send, and to whom

/** Whether someone may send messages at all, and whether they're staff. */
export async function messagingRole(
  db: Database,
  tree: ForumTree,
  user: User,
): Promise<{ staff: boolean; problem: MessageError | null }> {
  const viewer = await forumViewer(db, tree, user);
  const staff = moderatesEverywhere(tree, viewer);
  if (!viewer || viewer.blocked)
    return { staff: false, problem: "not-allowed" };
  if (viewer.banned && !staff) return { staff, problem: "banned" };
  if (!staff && !viewer.trusted) return { staff, problem: "not-allowed" };
  return { staff, problem: null };
}

export async function privacyOf(
  db: Database,
  userId: string,
): Promise<MessagePrivacy> {
  const [row] = await db
    .select({ messages: forumUserSettings.messages })
    .from(forumUserSettings)
    .where(eq(forumUserSettings.userId, userId))
    .limit(1);
  return row && isMessagePrivacy(row.messages) ? row.messages : "everyone";
}

/** Either has blocked the other. */
async function blockedBetween(
  db: Database,
  a: string,
  b: string,
): Promise<boolean> {
  const [row] = await db
    .select({ userId: forumBlocks.userId })
    .from(forumBlocks)
    .where(
      or(
        and(eq(forumBlocks.userId, a), eq(forumBlocks.blockedId, b)),
        and(eq(forumBlocks.userId, b), eq(forumBlocks.blockedId, a)),
      ),
    )
    .limit(1);
  return row !== undefined;
}

/** They've been in a conversation together. */
async function talkedBefore(
  db: Database,
  a: string,
  b: string,
): Promise<boolean> {
  const other = alias(forumConversationMembers, "other_members");
  const [row] = await db
    .select({ id: forumConversationMembers.conversationId })
    .from(forumConversationMembers)
    .innerJoin(
      other,
      and(
        eq(other.conversationId, forumConversationMembers.conversationId),
        eq(other.userId, b),
      ),
    )
    .where(eq(forumConversationMembers.userId, a))
    .limit(1);
  return row !== undefined;
}

/** Whether `sender` may bring `recipient` into a conversation. */
export async function canReach(
  db: Database,
  sender: { id: string; staff: boolean },
  recipient: Pick<User, "id" | "blockedAt">,
): Promise<boolean> {
  if (recipient.blockedAt || recipient.id === sender.id) return false;
  return mayMessage({
    staff: sender.staff,
    privacy: await privacyOf(db, recipient.id),
    talkedBefore: await talkedBefore(db, sender.id, recipient.id),
    blocked: await blockedBetween(db, sender.id, recipient.id),
  });
}

async function checkPace(
  db: Database,
  userId: string,
  now: Date,
  starting: boolean,
): Promise<boolean> {
  const since = (ms: number) => new Date(now.getTime() - ms);
  const [usage] = await db
    .select({
      burst:
        sql<number>`count(*) filter (where ${gt(forumMessages.createdAt, since(MESSAGE_LIMITS.burst.windowMs))})`.mapWith(
          Number,
        ),
      daily:
        sql<number>`count(*) filter (where ${gt(forumMessages.createdAt, since(MESSAGE_LIMITS.daily.windowMs))})`.mapWith(
          Number,
        ),
    })
    .from(forumMessages)
    .where(eq(forumMessages.authorId, userId));
  if ((usage?.burst ?? 0) >= MESSAGE_LIMITS.burst.count) return false;
  if ((usage?.daily ?? 0) >= MESSAGE_LIMITS.daily.count) return false;
  if (starting) {
    const [started] = await db
      .select({ total: count() })
      .from(forumConversations)
      .where(
        and(
          eq(forumConversations.startedById, userId),
          gt(forumConversations.createdAt, since(24 * 60 * 60_000)),
        ),
      );
    if ((started?.total ?? 0) >= MESSAGE_LIMITS.newPerDay) return false;
  }
  return true;
}

function checkBody(body: string): MessageError | null {
  if (!body) return "empty";
  if (characterCount(body) > MESSAGE_LIMITS.body) return "too-long";
  return null;
}

/** Usernames typed as "a, @b c" → each once. */
export function parseRecipients(value: string): string[] {
  return [
    ...new Set(
      value
        .split(/[,\s]+/)
        .map((part) => normalizeUsername(part.replace(/^@/, "")))
        .filter((part) => part !== ""),
    ),
  ];
}

// ---------------------------------------------------------------------------
// Writing

async function insertMessage(
  db: Database,
  conversationId: number,
  authorId: string,
  body: string,
  now: Date,
): Promise<ForumMessage> {
  const html = await renderBody(db, body);
  const [message] = await db
    .insert(forumMessages)
    .values({
      conversationId,
      authorId,
      body,
      html,
      renderVersion: FORUM_RENDER_VERSION,
      createdAt: now,
    })
    .returning();
  if (!message) throw new Error("Saving the message returned nothing");
  await db
    .update(forumConversations)
    .set({ lastMessageAt: now })
    .where(eq(forumConversations.id, conversationId));
  await db
    .update(forumConversationMembers)
    .set({ lastReadAt: now })
    .where(
      and(
        eq(forumConversationMembers.conversationId, conversationId),
        eq(forumConversationMembers.userId, authorId),
      ),
    );
  return message;
}

async function tellMembers(
  db: Database,
  conversation: ForumConversation,
  message: ForumMessage,
  sender: User,
  now: Date,
): Promise<void> {
  const members = await db
    .select({
      userId: forumConversationMembers.userId,
      muted: forumConversationMembers.muted,
    })
    .from(forumConversationMembers)
    .where(
      and(
        eq(forumConversationMembers.conversationId, conversation.id),
        isNull(forumConversationMembers.leftAt),
        ne(forumConversationMembers.userId, sender.id),
      ),
    );
  const blockedBy = await db
    .select({ userId: forumBlocks.userId })
    .from(forumBlocks)
    .where(eq(forumBlocks.blockedId, sender.id));
  const blockers = new Set(blockedBy.map((row) => row.userId));
  const recipients = members
    .filter((member) => !member.muted && !blockers.has(member.userId))
    .map((member) => member.userId);
  await safely("message notifications", () =>
    notifyMessage(db, {
      conversation,
      message,
      sender,
      recipientIds: recipients,
      now,
    }),
  );
}

/** Starts a conversation with some people (by username) and its first message. */
export async function startConversation(
  db: Database,
  input: {
    tree: ForumTree;
    sender: User;
    to: readonly string[];
    subject: string;
    body: string;
    now?: Date;
  },
): Promise<MessageResult<ForumConversation>> {
  const now = input.now ?? new Date();
  const role = await messagingRole(db, input.tree, input.sender);
  if (role.problem) return { ok: false, error: role.problem };
  const names = input.to.filter((name) => name !== input.sender.username);
  if (names.length === 0) return { ok: false, error: "no-recipients" };
  if (names.length + 1 > MESSAGE_LIMITS.members)
    return { ok: false, error: "too-many" };
  const subject = input.subject.replace(/\s+/g, " ").trim();
  if (!subject || characterCount(subject) > MESSAGE_LIMITS.subject)
    return { ok: false, error: "subject" };
  const body = normalizeBody(input.body);
  const problem = checkBody(body);
  if (problem) return { ok: false, error: problem };
  const people = await db
    .select()
    .from(users)
    .where(inArray(users.username, names));
  if (people.length !== names.length)
    return { ok: false, error: "unknown-user" };
  for (const person of people)
    if (
      !(await canReach(db, { id: input.sender.id, staff: role.staff }, person))
    )
      return { ok: false, error: "cannot-reach" };
  if (!role.staff && !(await checkPace(db, input.sender.id, now, true)))
    return { ok: false, error: "rate-limited" };

  const [conversation] = await db
    .insert(forumConversations)
    .values({
      subject,
      startedById: input.sender.id,
      createdAt: now,
      lastMessageAt: now,
    })
    .returning();
  if (!conversation)
    throw new Error("Saving the conversation returned nothing");
  await db.insert(forumConversationMembers).values(
    [input.sender, ...people].map((person) => ({
      conversationId: conversation.id,
      userId: person.id,
      joinedAt: now,
      lastReadAt: person.id === input.sender.id ? now : null,
    })),
  );
  const message = await insertMessage(
    db,
    conversation.id,
    input.sender.id,
    body,
    now,
  );
  await tellMembers(db, conversation, message, input.sender, now);
  return { ok: true, value: conversation };
}

export interface Membership {
  conversation: ForumConversation;
  member: typeof forumConversationMembers.$inferSelect;
}

/** The conversation, if this person is (or was) in it. */
export async function membershipOf(
  db: Database,
  conversationId: number,
  userId: string,
): Promise<Membership | undefined> {
  const [row] = await db
    .select({
      conversation: forumConversations,
      member: forumConversationMembers,
    })
    .from(forumConversations)
    .innerJoin(
      forumConversationMembers,
      and(
        eq(forumConversationMembers.conversationId, forumConversations.id),
        eq(forumConversationMembers.userId, userId),
      ),
    )
    .where(eq(forumConversations.id, conversationId))
    .limit(1);
  return row;
}

/** Replies in a conversation the sender is still in. */
export async function sendMessage(
  db: Database,
  input: {
    tree: ForumTree;
    sender: User;
    conversationId: number;
    body: string;
    now?: Date;
  },
): Promise<MessageResult<ForumMessage>> {
  const now = input.now ?? new Date();
  const membership = await membershipOf(
    db,
    input.conversationId,
    input.sender.id,
  );
  if (!membership || membership.member.leftAt)
    return { ok: false, error: "not-member" };
  const role = await messagingRole(db, input.tree, input.sender);
  if (role.problem) return { ok: false, error: role.problem };
  const body = normalizeBody(input.body);
  const problem = checkBody(body);
  if (problem) return { ok: false, error: problem };
  if (!role.staff && !(await checkPace(db, input.sender.id, now, false)))
    return { ok: false, error: "rate-limited" };
  const message = await insertMessage(
    db,
    input.conversationId,
    input.sender.id,
    body,
    now,
  );
  await deleteDraft(
    db,
    input.sender.id,
    draftKey.message(input.conversationId),
  );
  await tellMembers(db, membership.conversation, message, input.sender, now);
  return { ok: true, value: message };
}

/** Adds people to a conversation (its starter, or staff). */
export async function addMembers(
  db: Database,
  input: {
    tree: ForumTree;
    by: User;
    conversationId: number;
    to: readonly string[];
    now?: Date;
  },
): Promise<MessageError | null> {
  const now = input.now ?? new Date();
  const membership = await membershipOf(db, input.conversationId, input.by.id);
  if (!membership || membership.member.leftAt) return "not-member";
  const role = await messagingRole(db, input.tree, input.by);
  if (role.problem) return role.problem;
  if (membership.conversation.startedById !== input.by.id && !role.staff)
    return "not-member";
  const current = await db
    .select({ userId: forumConversationMembers.userId })
    .from(forumConversationMembers)
    .where(eq(forumConversationMembers.conversationId, input.conversationId));
  const people = await db
    .select()
    .from(users)
    .where(inArray(users.username, [...input.to]));
  if (people.length !== input.to.length) return "unknown-user";
  const adding = people.filter(
    (person) => !current.some((row) => row.userId === person.id),
  );
  if (current.length + adding.length > MESSAGE_LIMITS.members)
    return "too-many";
  for (const person of adding)
    if (!(await canReach(db, { id: input.by.id, staff: role.staff }, person)))
      return "cannot-reach";
  if (adding.length > 0)
    await db
      .insert(forumConversationMembers)
      .values(
        adding.map((person) => ({
          conversationId: input.conversationId,
          userId: person.id,
          joinedAt: now,
        })),
      )
      .onConflictDoNothing();
  return null;
}

export async function leaveConversation(
  db: Database,
  conversationId: number,
  userId: string,
  now = new Date(),
): Promise<void> {
  await db
    .update(forumConversationMembers)
    .set({ leftAt: now })
    .where(
      and(
        eq(forumConversationMembers.conversationId, conversationId),
        eq(forumConversationMembers.userId, userId),
      ),
    );
}

export async function setMuted(
  db: Database,
  conversationId: number,
  userId: string,
  muted: boolean,
): Promise<void> {
  await db
    .update(forumConversationMembers)
    .set({ muted })
    .where(
      and(
        eq(forumConversationMembers.conversationId, conversationId),
        eq(forumConversationMembers.userId, userId),
      ),
    );
}

export async function markConversationRead(
  db: Database,
  conversationId: number,
  userId: string,
  now = new Date(),
): Promise<void> {
  await db
    .update(forumConversationMembers)
    .set({ lastReadAt: now })
    .where(
      and(
        eq(forumConversationMembers.conversationId, conversationId),
        eq(forumConversationMembers.userId, userId),
      ),
    );
}

// ---------------------------------------------------------------------------
// Reading

export interface ConversationRow {
  conversation: ForumConversation;
  /** The other people in it (still in it), by username. */
  people: string[];
  unread: boolean;
  muted: boolean;
}

/** Someone's conversations, newest activity first (the ones they haven't left). */
export async function listConversations(
  db: Database,
  userId: string,
): Promise<ConversationRow[]> {
  const rows = await db
    .select({
      conversation: forumConversations,
      member: forumConversationMembers,
    })
    .from(forumConversationMembers)
    .innerJoin(
      forumConversations,
      eq(forumConversations.id, forumConversationMembers.conversationId),
    )
    .where(
      and(
        eq(forumConversationMembers.userId, userId),
        isNull(forumConversationMembers.leftAt),
      ),
    )
    .orderBy(desc(forumConversations.lastMessageAt))
    .limit(200);
  const ids = rows.map((row) => row.conversation.id);
  const others =
    ids.length === 0
      ? []
      : await db
          .select({
            conversationId: forumConversationMembers.conversationId,
            username: users.username,
          })
          .from(forumConversationMembers)
          .innerJoin(users, eq(users.id, forumConversationMembers.userId))
          .where(
            and(
              inArray(forumConversationMembers.conversationId, ids),
              ne(forumConversationMembers.userId, userId),
              isNull(forumConversationMembers.leftAt),
            ),
          );
  return rows.map(({ conversation, member }) => ({
    conversation,
    people: others
      .filter((row) => row.conversationId === conversation.id)
      .map((row) => row.username),
    unread:
      member.lastReadAt === null ||
      conversation.lastMessageAt > member.lastReadAt,
    muted: member.muted,
  }));
}

/** How many conversations have something new (the account menu's count). */
export async function unreadConversations(
  db: Database,
  userId: string,
): Promise<number> {
  const [row] = await db
    .select({ total: count() })
    .from(forumConversationMembers)
    .innerJoin(
      forumConversations,
      eq(forumConversations.id, forumConversationMembers.conversationId),
    )
    .where(
      and(
        eq(forumConversationMembers.userId, userId),
        isNull(forumConversationMembers.leftAt),
        or(
          isNull(forumConversationMembers.lastReadAt),
          gt(
            forumConversations.lastMessageAt,
            forumConversationMembers.lastReadAt,
          ),
        ),
      ),
    );
  return row?.total ?? 0;
}

export interface MessageView {
  message: ForumMessage;
  author: {
    id: string;
    username: string;
    name: string;
    avatarHash: string | null;
    displayName: string | null;
    linkedName: string | null;
  } | null;
  mine: boolean;
}

/**
 * A conversation's messages for one member, oldest first: none from before they
 * joined or after they left, none removed, and none from people they've blocked.
 */
export async function listMessages(
  db: Database,
  membership: Membership,
  viewerId: string,
): Promise<MessageView[]> {
  const blocked = await db
    .select({ id: forumBlocks.blockedId })
    .from(forumBlocks)
    .where(eq(forumBlocks.userId, viewerId));
  const hidden = blocked.map((row) => row.id);
  const rows = await db
    .select({
      message: forumMessages,
      author: {
        id: users.id,
        username: users.username,
        displayName: users.displayName,
        name: users.name,
        avatarHash: users.avatarHash,
        blockedAt: users.blockedAt,
      },
    })
    .from(forumMessages)
    .leftJoin(users, eq(users.id, forumMessages.authorId))
    .where(
      and(
        eq(forumMessages.conversationId, membership.conversation.id),
        isNull(forumMessages.deletedAt),
        sql`${forumMessages.createdAt} >= ${membership.member.joinedAt}`,
        membership.member.leftAt
          ? sql`${forumMessages.createdAt} <= ${membership.member.leftAt}`
          : undefined,
        hidden.length > 0
          ? or(
              isNull(forumMessages.authorId),
              sql`${forumMessages.authorId} not in ${hidden}`,
            )
          : undefined,
      ),
    )
    .orderBy(asc(forumMessages.createdAt), asc(forumMessages.id))
    .limit(1000);
  return rows
    .filter((row) => !row.author?.blockedAt)
    .map((row) => ({
      message: row.message,
      author: row.author
        ? {
            id: row.author.id,
            username: row.author.username,
            name: displayName(row.author),
            avatarHash: row.author.avatarHash,
            displayName: row.author.displayName,
            linkedName: row.author.name,
          }
        : null,
      mine: row.message.authorId === viewerId,
    }));
}

/** Everyone in a conversation, with whether they've left. */
export async function membersOf(db: Database, conversationId: number) {
  return db
    .select({
      id: users.id,
      username: users.username,
      leftAt: forumConversationMembers.leftAt,
    })
    .from(forumConversationMembers)
    .innerJoin(users, eq(users.id, forumConversationMembers.userId))
    .where(eq(forumConversationMembers.conversationId, conversationId))
    .orderBy(asc(forumConversationMembers.joinedAt));
}

// ---------------------------------------------------------------------------
// Blocks

export async function block(
  db: Database,
  userId: string,
  blockedId: string,
): Promise<void> {
  if (userId === blockedId) return;
  await db
    .insert(forumBlocks)
    .values({ userId, blockedId })
    .onConflictDoNothing();
}

export async function unblock(
  db: Database,
  userId: string,
  blockedId: string,
): Promise<void> {
  await db
    .delete(forumBlocks)
    .where(
      and(eq(forumBlocks.userId, userId), eq(forumBlocks.blockedId, blockedId)),
    );
}

export async function blocksOf(db: Database, userId: string) {
  return db
    .select({
      id: users.id,
      username: users.username,
      since: forumBlocks.createdAt,
    })
    .from(forumBlocks)
    .innerJoin(users, eq(users.id, forumBlocks.blockedId))
    .where(eq(forumBlocks.userId, userId))
    .orderBy(asc(users.username));
}

export async function hasBlocked(
  db: Database,
  userId: string,
  blockedId: string,
): Promise<boolean> {
  const [row] = await db
    .select({ id: forumBlocks.userId })
    .from(forumBlocks)
    .where(
      and(eq(forumBlocks.userId, userId), eq(forumBlocks.blockedId, blockedId)),
    )
    .limit(1);
  return row !== undefined;
}

// ---------------------------------------------------------------------------
// Reports

/** Messages shown with a reported one, for context. */
export const REPORT_CONTEXT = 5;

/**
 * Reports a message (the reporter must be in the conversation, and it isn't
 * theirs). The admin sees it, with the REPORT_CONTEXT before it.
 */
export async function reportMessage(
  db: Database,
  input: {
    reporter: User;
    messageId: number;
    reason: ReportReason;
    note: string;
    now?: Date;
  },
): Promise<"ok" | "not-found" | "own" | "already"> {
  const now = input.now ?? new Date();
  const [message] = await db
    .select()
    .from(forumMessages)
    .where(
      and(
        eq(forumMessages.id, input.messageId),
        isNull(forumMessages.deletedAt),
      ),
    )
    .limit(1);
  if (!message) return "not-found";
  const membership = await membershipOf(
    db,
    message.conversationId,
    input.reporter.id,
  );
  if (!membership) return "not-found";
  if (message.authorId === input.reporter.id) return "own";
  const [already] = await db
    .select({ id: forumReports.id })
    .from(forumReports)
    .where(
      and(
        eq(forumReports.messageId, message.id),
        eq(forumReports.reporterId, input.reporter.id),
        eq(forumReports.status, "open"),
      ),
    )
    .limit(1);
  if (already) return "already";
  await db.insert(forumReports).values({
    kind: "message",
    messageId: message.id,
    userId: message.authorId,
    reporterId: input.reporter.id,
    reason: input.reason,
    note: input.note.trim().slice(0, 1000),
    createdAt: now,
  });
  await safely("admin alert", () =>
    alertAdmin(
      db,
      {
        kind: "forum-report",
        summary: `A private message was reported (${input.reason})`,
        path: "/forum/moderate/?tab=reports",
      },
      now,
    ),
  );
  return "ok";
}

/** A reported message and the ones before it, for the admin. */
export async function messageContext(db: Database, messageId: number) {
  const [message] = await db
    .select()
    .from(forumMessages)
    .where(eq(forumMessages.id, messageId))
    .limit(1);
  if (!message) return null;
  const before = await db
    .select({
      id: forumMessages.id,
      html: forumMessages.html,
      createdAt: forumMessages.createdAt,
      author: users.username,
    })
    .from(forumMessages)
    .leftJoin(users, eq(users.id, forumMessages.authorId))
    .where(
      and(
        eq(forumMessages.conversationId, message.conversationId),
        sql`${forumMessages.id} <= ${message.id}`,
      ),
    )
    .orderBy(desc(forumMessages.id))
    .limit(REPORT_CONTEXT + 1);
  return { message, thread: before.reverse() };
}

export async function deleteMessage(
  db: Database,
  messageId: number,
  now = new Date(),
): Promise<void> {
  await db
    .update(forumMessages)
    .set({ deletedAt: now })
    .where(eq(forumMessages.id, messageId));
}

// ---------------------------------------------------------------------------
// Accounts

/** For the export: conversations someone is in, and the messages they wrote. */
export async function messagesExport(db: Database, userId: string) {
  const [conversations, written, blocks] = await Promise.all([
    db
      .select({
        subject: forumConversations.subject,
        joinedAt: forumConversationMembers.joinedAt,
        leftAt: forumConversationMembers.leftAt,
      })
      .from(forumConversationMembers)
      .innerJoin(
        forumConversations,
        eq(forumConversations.id, forumConversationMembers.conversationId),
      )
      .where(eq(forumConversationMembers.userId, userId)),
    db
      .select({
        conversation: forumConversations.subject,
        body: forumMessages.body,
        at: forumMessages.createdAt,
      })
      .from(forumMessages)
      .innerJoin(
        forumConversations,
        eq(forumConversations.id, forumMessages.conversationId),
      )
      .where(eq(forumMessages.authorId, userId))
      .orderBy(asc(forumMessages.createdAt)),
    blocksOf(db, userId),
  ]);
  return {
    privacy: await privacyOf(db, userId),
    conversations,
    messages: written,
    blocked: blocks.map((row) => row.username),
  };
}
