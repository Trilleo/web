/**
 * The outbox (mail_messages): every email is written here first, then sent in the
 * background, so a slow or failing mail server never holds up a page, and nothing
 * is lost when it's down. Failed sends are retried with backoff; a refusal for good
 * (an address that doesn't exist) or too many tries marks the message failed.
 *
 * Code emails are secret: once the provider has them, their bodies are cleared, so
 * the database never holds a code that still works. Captured messages (dev, e2e)
 * keep everything: reading them is the point.
 */
import {
  mailMessages,
  type Database,
  type MailMessage,
  type MailMessageStatus,
} from "@trilleo/db";
import {
  MAIL_KINDS,
  isMailKind,
  type MailKind,
  type MailStatus,
} from "@trilleo/mail";
import { MailError, type MailDriver } from "@trilleo/mail/server";
import {
  and,
  count,
  desc,
  eq,
  inArray,
  isNull,
  lt,
  lte,
  or,
  sql,
} from "drizzle-orm";
import type { MailConfig } from "./config";

const MINUTE_MS = 60 * 1000;
const DAY_MS = 24 * 60 * MINUTE_MS;

/** Waits before each retry: 1 minute, 5, 30, 2 hours, 6 hours; then it has failed. */
export const RETRY_DELAYS_MS = [
  1 * MINUTE_MS,
  5 * MINUTE_MS,
  30 * MINUTE_MS,
  120 * MINUTE_MS,
  360 * MINUTE_MS,
] as const;
export const MAX_ATTEMPTS = RETRY_DELAYS_MS.length + 1;
/** Bodies (text and HTML) are cleared this long after a message was written. */
export const MAIL_RETENTION_DAYS = 30;
/** The rest of the row (to, subject, kind, status) goes after this. */
export const MAIL_LOG_DAYS = 180;
/** A message "sending" for longer than this was cut off (a restart): try again. */
const STUCK_MS = 10 * MINUTE_MS;
/** How many due messages one delivery pass sends. */
const BATCH = 20;

export interface MailDeps {
  db: Database;
  driver: MailDriver;
  config: MailConfig;
  now?: () => Date;
}

export interface QueueInput {
  kind: MailKind;
  to: string;
  subject: string;
  text: string;
  html: string | null;
  userId?: string | null;
  replyTo?: string | null;
  headers?: Record<string, string>;
  ref?: string | null;
  /** False: the caller sends it itself (sendNow), so no background pass races it. */
  wake?: boolean;
}

/** Something to call after a message is queued (the server starts delivery). */
let afterQueue: (() => void) | null = null;

/** Set by the middleware: tests and scripts leave it unset, so nothing runs behind them. */
export function onMailQueued(hook: (() => void) | null): void {
  afterQueue = hook;
}

/** Writes a message to the outbox. Delivery starts in the background. */
export async function queueMail(
  db: Database,
  input: QueueInput,
  now = new Date(),
): Promise<MailMessage> {
  const [row] = await db
    .insert(mailMessages)
    .values({
      kind: input.kind,
      toAddress: input.to,
      subject: input.subject,
      textBody: input.text,
      htmlBody: input.html,
      userId: input.userId ?? null,
      replyTo: input.replyTo ?? null,
      headers: input.headers ?? {},
      ref: input.ref ?? null,
      createdAt: now,
      nextAttemptAt: now,
    })
    .returning();
  if (!row) throw new Error("Queueing the message returned nothing");
  if (input.wake !== false) afterQueue?.();
  return row;
}

function trimError(message: string): string {
  return message.length > 500 ? `${message.slice(0, 497)}…` : message;
}

/** Sends one claimed message and records how it went. */
async function sendClaimed(
  deps: MailDeps,
  row: MailMessage,
  now: Date,
): Promise<MailMessage> {
  const { db, driver, config } = deps;
  const secret = isMailKind(row.kind) && MAIL_KINDS[row.kind].secret;
  try {
    if (row.textBody === null)
      throw new MailError("The body was already cleared.", true);
    const { messageId } = await driver.send({
      from: config.from,
      to: row.toAddress,
      replyTo: row.replyTo,
      subject: row.subject,
      text: row.textBody,
      html: row.htmlBody,
      headers: row.headers,
    });
    const captured = driver.kind === "capture";
    const [done] = await db
      .update(mailMessages)
      .set({
        status: captured ? "captured" : "sent",
        attempts: row.attempts + 1,
        sentAt: now,
        providerMessageId: messageId,
        lastError: captured && !config.available ? config.problem : null,
        ...(secret && !captured
          ? { textBody: null, htmlBody: null, bodyPurgedAt: now }
          : {}),
      })
      .where(eq(mailMessages.id, row.id))
      .returning();
    return done ?? row;
  } catch (error) {
    const failure =
      error instanceof MailError ? error : new MailError(String(error), false);
    const attempts = row.attempts + 1;
    const giveUp = failure.permanent || attempts >= MAX_ATTEMPTS;
    const delay = RETRY_DELAYS_MS[attempts - 1] ?? RETRY_DELAYS_MS[0];
    const [done] = await db
      .update(mailMessages)
      .set({
        status: giveUp ? "failed" : "queued",
        attempts,
        lastError: trimError(failure.message),
        nextAttemptAt: new Date(now.getTime() + delay),
        // A code that never arrived is no use to anyone later either.
        ...(giveUp && secret
          ? { textBody: null, htmlBody: null, bodyPurgedAt: now }
          : {}),
      })
      .where(eq(mailMessages.id, row.id))
      .returning();
    return done ?? row;
  }
}

/** Claims a queued message (so two passes never send it twice). */
async function claim(
  db: Database,
  id: number,
  now: Date,
): Promise<MailMessage | undefined> {
  // Stamped, so a send cut off midway (a restart) is recognised as stuck later.
  const [row] = await db
    .update(mailMessages)
    .set({ status: "sending", nextAttemptAt: now })
    .where(and(eq(mailMessages.id, id), eq(mailMessages.status, "queued")))
    .returning();
  return row;
}

/** Sends one message now, if it's still queued. Returns it as it ends up. */
export async function deliverMessage(
  deps: MailDeps,
  id: number,
): Promise<MailMessage | undefined> {
  const now = deps.now?.() ?? new Date();
  const row = await claim(deps.db, id, now);
  if (!row) return getMail(deps.db, id);
  return sendClaimed(deps, row, now);
}

/** Sends what's due (oldest first). Returns how many were handed over. */
export async function deliverDue(deps: MailDeps): Promise<number> {
  const { db } = deps;
  const now = deps.now?.() ?? new Date();
  await db
    .update(mailMessages)
    .set({ status: "queued" })
    .where(
      and(
        eq(mailMessages.status, "sending"),
        lt(mailMessages.nextAttemptAt, new Date(now.getTime() - STUCK_MS)),
      ),
    );
  const due = await db
    .select({ id: mailMessages.id })
    .from(mailMessages)
    .where(
      and(
        eq(mailMessages.status, "queued"),
        lte(mailMessages.nextAttemptAt, now),
      ),
    )
    .orderBy(mailMessages.nextAttemptAt, mailMessages.id)
    .limit(BATCH);
  let sent = 0;
  for (const { id } of due) {
    const row = await claim(db, id, now);
    if (!row) continue;
    const done = await sendClaimed(deps, row, deps.now?.() ?? new Date());
    if (done.status === "sent" || done.status === "captured") sent += 1;
  }
  return sent;
}

/** Clears bodies past MAIL_RETENTION_DAYS and deletes rows past MAIL_LOG_DAYS. */
export async function purgeMail(
  db: Database,
  now = new Date(),
): Promise<{ cleared: number; deleted: number }> {
  const bodyCutoff = new Date(now.getTime() - MAIL_RETENTION_DAYS * DAY_MS);
  const rowCutoff = new Date(now.getTime() - MAIL_LOG_DAYS * DAY_MS);
  const deleted = await db
    .delete(mailMessages)
    .where(lt(mailMessages.createdAt, rowCutoff))
    .returning({ id: mailMessages.id });
  const cleared = await db
    .update(mailMessages)
    .set({ textBody: null, htmlBody: null, bodyPurgedAt: now })
    .where(
      and(
        lt(mailMessages.createdAt, bodyCutoff),
        isNull(mailMessages.bodyPurgedAt),
        // Still waiting to go out: keep it until it's sent or given up.
        inArray(mailMessages.status, [
          "sent",
          "failed",
          "captured",
          "cancelled",
        ]),
      ),
    )
    .returning({ id: mailMessages.id });
  return { cleared: cleared.length, deleted: deleted.length };
}

export async function getMail(
  db: Database,
  id: number,
): Promise<MailMessage | undefined> {
  const [row] = await db
    .select()
    .from(mailMessages)
    .where(eq(mailMessages.id, id))
    .limit(1);
  return row;
}

export interface MailFilter {
  status?: MailStatus | null;
  kind?: MailKind | null;
  /** Part of the recipient's address. */
  to?: string | null;
}

export const MAIL_PAGE = 50;

/** The admin's list, newest first. */
export async function listMail(
  db: Database,
  filter: MailFilter,
  page = 0,
): Promise<MailMessage[]> {
  const conditions = [
    filter.status ? eq(mailMessages.status, filter.status) : undefined,
    filter.kind ? eq(mailMessages.kind, filter.kind) : undefined,
    filter.to
      ? sql`position(${filter.to.toLowerCase()} in ${mailMessages.toAddress}) > 0`
      : undefined,
  ].filter((condition) => condition !== undefined);
  return db
    .select()
    .from(mailMessages)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(mailMessages.createdAt), desc(mailMessages.id))
    .limit(MAIL_PAGE + 1)
    .offset(page * MAIL_PAGE);
}

/** How many messages are in each status. */
export async function mailCounts(
  db: Database,
): Promise<Record<MailMessageStatus, number>> {
  const rows = await db
    .select({ status: mailMessages.status, n: count() })
    .from(mailMessages)
    .groupBy(mailMessages.status);
  const counts: Record<MailMessageStatus, number> = {
    queued: 0,
    sending: 0,
    sent: 0,
    failed: 0,
    captured: 0,
    cancelled: 0,
  };
  for (const row of rows) counts[row.status] = row.n;
  return counts;
}

/** Queues a failed or cancelled message again, from the first try. */
export async function retryMail(
  db: Database,
  id: number,
  now = new Date(),
): Promise<boolean> {
  const changed = await db
    .update(mailMessages)
    .set({ status: "queued", attempts: 0, nextAttemptAt: now, lastError: null })
    .where(
      and(
        eq(mailMessages.id, id),
        inArray(mailMessages.status, ["failed", "cancelled"]),
        // A cleared body can't be sent.
        isNull(mailMessages.bodyPurgedAt),
      ),
    )
    .returning({ id: mailMessages.id });
  if (changed.length > 0) afterQueue?.();
  return changed.length > 0;
}

/** Stops a message that hasn't gone yet. */
export async function cancelMail(db: Database, id: number): Promise<boolean> {
  const changed = await db
    .update(mailMessages)
    .set({ status: "cancelled" })
    .where(and(eq(mailMessages.id, id), eq(mailMessages.status, "queued")))
    .returning({ id: mailMessages.id });
  return changed.length > 0;
}

/** Stops everything still waiting to go to someone (they removed their address). */
export async function cancelMailTo(
  db: Database,
  input: { userId: string; address?: string },
): Promise<number> {
  const changed = await db
    .update(mailMessages)
    .set({ status: "cancelled" })
    .where(
      and(
        eq(mailMessages.status, "queued"),
        input.address
          ? or(
              eq(mailMessages.userId, input.userId),
              eq(mailMessages.toAddress, input.address),
            )
          : eq(mailMessages.userId, input.userId),
      ),
    )
    .returning({ id: mailMessages.id });
  return changed.length;
}

/** Messages sent about something (e.g. "contact:12"), oldest first. */
export async function mailAbout(db: Database, refs: readonly string[]) {
  if (refs.length === 0) return [];
  return db
    .select()
    .from(mailMessages)
    .where(inArray(mailMessages.ref, [...refs]))
    .orderBy(mailMessages.createdAt);
}

/** What was sent to someone, for their data export (bodies while they're kept). */
export async function mailOf(db: Database, userId: string) {
  return db
    .select({
      kind: mailMessages.kind,
      to: mailMessages.toAddress,
      subject: mailMessages.subject,
      status: mailMessages.status,
      text: mailMessages.textBody,
      createdAt: mailMessages.createdAt,
      sentAt: mailMessages.sentAt,
    })
    .from(mailMessages)
    .where(eq(mailMessages.userId, userId))
    .orderBy(desc(mailMessages.createdAt));
}
