/**
 * Messages from /contact/: checking what was typed, limits that keep the form from
 * becoming a spam pipe, and the admin's inbox (/admin/messages/).
 *
 * Anyone can write. Signed-in senders are limited by what's in the database;
 * signed-out ones by a hash of their address kept only in this process's memory
 * (like download counting), plus a cap on all signed-out messages per day. A filled
 * honeypot field is accepted and dropped, so bots learn nothing.
 */
import { createHash } from "node:crypto";
import {
  contactMessages,
  users,
  type ContactMessage,
  type Database,
  type User,
} from "@trilleo/db";
import { and, count, desc, eq, gt, isNull, lt, sql } from "drizzle-orm";
import { alertAdmin } from "../mail/alerts";
import { safely } from "../mail/notify";

const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

export const CONTACT_TOPICS = [
  "general",
  "feedback",
  "privacy",
  "copyright",
  "security",
  "account",
] as const;

export type ContactTopic = (typeof CONTACT_TOPICS)[number];

export const CONTACT_TOPIC_LABELS: Readonly<Record<ContactTopic, string>> = {
  general: "A question or hello",
  feedback: "Feedback or a bug",
  privacy: "My data and privacy",
  copyright: "Copyright or a takedown",
  security: "A security problem",
  account: "My account or a moderation decision",
};

export const CONTACT_FIELD_LIMITS = {
  name: 100,
  email: 254,
  body: { min: 10, max: 5000 },
} as const;

export const CONTACT_LIMITS = {
  /** Per signed-in account, or per signed-out visitor. */
  hourly: 3,
  daily: 10,
  /** All signed-out messages together, per rolling day. */
  anonymousDaily: 50,
} as const;

/** Messages are deleted this long after they arrive. */
export const CONTACT_RETENTION_DAYS = 365;

export type ContactStatus = ContactMessage["status"];

export interface ContactInput {
  topic: string;
  name: string;
  email: string;
  body: string;
  /** The honeypot: hidden from people, filled in by bots. */
  website: string;
}

export interface ContactDraft {
  topic: ContactTopic;
  name: string;
  email: string | null;
  body: string;
}

export type ContactField = "topic" | "name" | "email" | "body";

export type ContactCheck =
  | { ok: true; draft: ContactDraft }
  | { ok: false; errors: Partial<Record<ContactField, string>> };

// Deliberately loose: one @, something on each side, a dot in the domain, no spaces.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isTopic(value: string): value is ContactTopic {
  return (CONTACT_TOPICS as readonly string[]).includes(value);
}

/** Trims what was typed and says what's wrong with it, field by field. */
export function checkContact(input: ContactInput): ContactCheck {
  const errors: Partial<Record<ContactField, string>> = {};
  const topic = input.topic.trim();
  const name = input.name.replace(/\s+/g, " ").trim();
  const email = input.email.trim();
  const body = input.body.replace(/\r\n?/g, "\n").trim();

  if (!isTopic(topic)) errors.topic = "Choose what your message is about.";
  if (name === "") errors.name = "Tell me what to call you.";
  else if (name.length > CONTACT_FIELD_LIMITS.name)
    errors.name = `Keep your name under ${String(CONTACT_FIELD_LIMITS.name)} characters.`;
  if (email !== "") {
    if (email.length > CONTACT_FIELD_LIMITS.email || !EMAIL_PATTERN.test(email))
      errors.email = "That doesn’t look like an email address.";
  }
  if (body.length < CONTACT_FIELD_LIMITS.body.min)
    errors.body = "Write a little more, so I know what you need.";
  else if (body.length > CONTACT_FIELD_LIMITS.body.max)
    errors.body = `Keep it under ${CONTACT_FIELD_LIMITS.body.max.toLocaleString("en")} characters, or send it by email.`;

  if (Object.keys(errors).length > 0 || !isTopic(topic))
    return { ok: false, errors };
  return { ok: true, draft: { topic, name, email: email || null, body } };
}

/**
 * Remembers when each signed-out visitor wrote, by a hash of their address, for a
 * day at most. Lives in memory: a restart forgets everyone, which is fine for a
 * limit.
 */
export class VisitorLimiter {
  private readonly sent = new Map<string, number[]>();

  constructor(private readonly maxVisitors = 10_000) {}

  static key(ip: string): string {
    return createHash("sha256").update(`contact\n${ip}`).digest("base64url");
  }

  /** Whether this visitor may send one more now; records it if so. */
  take(key: string, now: Date): boolean {
    const at = now.getTime();
    const recent = (this.sent.get(key) ?? []).filter((t) => at - t < DAY_MS);
    const lastHour = recent.filter((t) => at - t < HOUR_MS).length;
    if (
      lastHour >= CONTACT_LIMITS.hourly ||
      recent.length >= CONTACT_LIMITS.daily
    ) {
      this.sent.set(key, recent);
      return false;
    }
    if (!this.sent.has(key) && this.sent.size >= this.maxVisitors)
      this.sent.clear();
    this.sent.set(key, [...recent, at]);
    return true;
  }
}

const visitors = new VisitorLimiter();

export type SendError = "invalid" | "too-many" | "busy";

export type SendResult =
  | { ok: true; message: ContactMessage | null }
  | {
      ok: false;
      error: "invalid";
      errors: Partial<Record<ContactField, string>>;
    }
  | { ok: false; error: Exclude<SendError, "invalid"> };

export const SEND_ERROR_MESSAGES: Readonly<
  Record<Exclude<SendError, "invalid">, string>
> = {
  "too-many":
    "You’ve sent several messages in a short time. Please wait a while, or write by email.",
  busy: "The form is taking a break from a lot of messages. Please write by email instead.",
};

/** Saves a message, unless it breaks a limit. */
export async function sendContactMessage(
  db: Database,
  input: ContactInput,
  from: { user: User | null; ip: string },
  now = new Date(),
  limiter: VisitorLimiter = visitors,
): Promise<SendResult> {
  const check = checkContact(input);
  if (!check.ok) return { ok: false, error: "invalid", errors: check.errors };
  // A bot filled the hidden field: say thanks, keep nothing.
  if (input.website.trim() !== "") return { ok: true, message: null };

  if (from.user) {
    const [usage] = await db
      .select({
        hourly:
          sql<number>`count(*) filter (where ${gt(contactMessages.createdAt, new Date(now.getTime() - HOUR_MS))})`.mapWith(
            Number,
          ),
        daily: count(),
      })
      .from(contactMessages)
      .where(
        and(
          eq(contactMessages.userId, from.user.id),
          gt(contactMessages.createdAt, new Date(now.getTime() - DAY_MS)),
        ),
      );
    if (
      (usage?.hourly ?? 0) >= CONTACT_LIMITS.hourly ||
      (usage?.daily ?? 0) >= CONTACT_LIMITS.daily
    )
      return { ok: false, error: "too-many" };
  } else {
    const [anonymous] = await db
      .select({ count: count() })
      .from(contactMessages)
      .where(
        and(
          isNull(contactMessages.userId),
          gt(contactMessages.createdAt, new Date(now.getTime() - DAY_MS)),
        ),
      );
    if ((anonymous?.count ?? 0) >= CONTACT_LIMITS.anonymousDaily)
      return { ok: false, error: "busy" };
    if (!limiter.take(VisitorLimiter.key(from.ip), now))
      return { ok: false, error: "too-many" };
  }

  const [message] = await db
    .insert(contactMessages)
    .values({ ...check.draft, userId: from.user?.id ?? null, createdAt: now })
    .returning();
  if (message)
    await safely("admin alert", () =>
      alertAdmin(
        db,
        {
          kind: "contact",
          summary: `Message from ${message.name}: ${CONTACT_TOPIC_LABELS[message.topic as ContactTopic]}`,
          path: `/admin/messages/#message-${String(message.id)}`,
        },
        now,
      ),
    );
  await purgeOldMessages(db, now);
  return { ok: true, message: message ?? null };
}

/** Deletes messages past CONTACT_RETENTION_DAYS. Returns how many went. */
export async function purgeOldMessages(
  db: Database,
  now = new Date(),
): Promise<number> {
  const cutoff = new Date(now.getTime() - CONTACT_RETENTION_DAYS * DAY_MS);
  const gone = await db
    .delete(contactMessages)
    .where(lt(contactMessages.createdAt, cutoff))
    .returning({ id: contactMessages.id });
  return gone.length;
}

export interface InboxMessage extends ContactMessage {
  /** The sender's username, when they were signed in. */
  login: string | null;
}

export const INBOX_VIEWS = ["new", "read", "archived"] as const;
export type InboxView = (typeof INBOX_VIEWS)[number];

/** The admin's inbox: one status at a time, newest first. */
export async function listMessages(
  db: Database,
  view: InboxView,
  limit = 100,
): Promise<InboxMessage[]> {
  const rows = await db
    .select({ message: contactMessages, login: users.username })
    .from(contactMessages)
    .leftJoin(users, eq(users.id, contactMessages.userId))
    .where(eq(contactMessages.status, view))
    .orderBy(desc(contactMessages.createdAt), desc(contactMessages.id))
    .limit(limit);
  return rows.map((row) => ({ ...row.message, login: row.login }));
}

/** How many messages each view holds. */
export async function inboxCounts(
  db: Database,
): Promise<Record<InboxView, number>> {
  const rows = await db
    .select({ status: contactMessages.status, count: count() })
    .from(contactMessages)
    .groupBy(contactMessages.status);
  const counts: Record<InboxView, number> = { new: 0, read: 0, archived: 0 };
  for (const row of rows) counts[row.status] = row.count;
  return counts;
}

/** Moves a message to another view. Returns whether it exists. */
export async function setMessageStatus(
  db: Database,
  id: number,
  status: ContactStatus,
): Promise<boolean> {
  const changed = await db
    .update(contactMessages)
    .set({ status })
    .where(eq(contactMessages.id, id))
    .returning({ id: contactMessages.id });
  return changed.length > 0;
}

export async function deleteMessage(
  db: Database,
  id: number,
): Promise<boolean> {
  const gone = await db
    .delete(contactMessages)
    .where(eq(contactMessages.id, id))
    .returning({ id: contactMessages.id });
  return gone.length > 0;
}

/** A signed-in person's own messages, for their data export. */
export async function messagesFrom(db: Database, userId: string) {
  return db
    .select({
      topic: contactMessages.topic,
      name: contactMessages.name,
      email: contactMessages.email,
      body: contactMessages.body,
      createdAt: contactMessages.createdAt,
    })
    .from(contactMessages)
    .where(eq(contactMessages.userId, userId))
    .orderBy(desc(contactMessages.createdAt));
}
