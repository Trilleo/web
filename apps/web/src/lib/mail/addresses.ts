/**
 * People's email addresses: adding or changing one (a 6-digit code sent to it,
 * typed back on /account/email/), choosing notifications, and unsubscribing from a
 * link. An account's `email` is only ever an address it proved, and it's what they
 * sign in with, so it can be changed but not removed (deleting the account does).
 *
 * The code machinery (generateCode, hashCode, sameHash) is shared with signing in
 * by email (src/lib/auth/email-sign-in.ts), which uses its own purposes.
 */
import { createHash, randomInt, timingSafeEqual } from "node:crypto";
import { emailCodes, users, type Database, type User } from "@trilleo/db";
import {
  isNotificationTopic,
  normalizeEmail,
  parseNotificationSettings,
  type NotificationSettings,
  type NotificationTopic,
} from "@trilleo/mail";
import { and, count, desc, eq, gt, isNull, lt, ne } from "drizzle-orm";
import { randomToken } from "../auth/crypto";
import { SITE_NAME } from "../site";
import { composeDirect } from "./compose";
import { cancelMailTo, queueMail } from "./outbox";

const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

export const CODE_DIGITS = 6;
export const CODE_LIMITS = {
  /** A code works for this long. */
  ttlMs: 15 * MINUTE_MS,
  /** Wrong guesses before a code stops working. */
  attempts: 5,
  /** Between two codes for the same account. */
  resendMs: MINUTE_MS,
  /** Codes per account. */
  hourly: 5,
  daily: 10,
  /** Codes to one address, whoever asks: stops the form being used to pester someone. */
  perAddressDaily: 5,
} as const;

/** Codes (only their hashes) are deleted this long after they were made. */
export const CODE_RETENTION_DAYS = 2;

/** Deletes codes past CODE_RETENTION_DAYS (the daily limits only look back one day). */
export async function purgeCodes(
  db: Database,
  now = new Date(),
): Promise<number> {
  const gone = await db
    .delete(emailCodes)
    .where(
      lt(
        emailCodes.createdAt,
        new Date(now.getTime() - CODE_RETENTION_DAYS * DAY_MS),
      ),
    )
    .returning({ id: emailCodes.id });
  return gone.length;
}

export function generateCode(): string {
  return String(randomInt(0, 10 ** CODE_DIGITS)).padStart(CODE_DIGITS, "0");
}

export function hashCode(purpose: string, email: string, code: string): string {
  return createHash("sha256")
    .update(`${purpose}\n${email}\n${code}`)
    .digest("hex");
}

export function sameHash(a: string, b: string): boolean {
  const left = Buffer.from(a, "hex");
  const right = Buffer.from(b, "hex");
  return left.length === right.length && timingSafeEqual(left, right);
}

/** Only digits count: "123 456" and "123-456" are fine to type. */
export function cleanCode(input: string): string {
  return input.replace(/[\s-]/g, "");
}

export type CodeRequestError =
  "invalid" | "same" | "wait" | "too-many" | "unavailable";

export const CODE_REQUEST_ERRORS: Readonly<Record<CodeRequestError, string>> = {
  invalid: "That doesn’t look like an email address.",
  same: "That’s already your address.",
  wait: "A code is on its way. Wait a minute before asking for another.",
  "too-many": "That’s a lot of codes today. Try again tomorrow.",
  unavailable: "Email isn’t working on the site right now. Try again later.",
};

export type CodeRequestResult =
  | { ok: true; email: string; messageId: number }
  | { ok: false; error: CodeRequestError };

/** The code that's waiting to be typed, if any. */
export async function pendingCode(
  db: Database,
  userId: string,
  now = new Date(),
) {
  const [row] = await db
    .select()
    .from(emailCodes)
    .where(
      and(
        eq(emailCodes.userId, userId),
        eq(emailCodes.purpose, "verify-email"),
        isNull(emailCodes.usedAt),
        gt(emailCodes.expiresAt, now),
      ),
    )
    .orderBy(desc(emailCodes.createdAt))
    .limit(1);
  return row && row.attempts < CODE_LIMITS.attempts ? row : undefined;
}

/**
 * Sends a code to `input` for `user` to type back. A new code replaces any older
 * one. The caller delivers the queued message right away (see the action route), so
 * the page can say whether it went.
 */
export async function requestEmailCode(
  db: Database,
  user: User,
  input: string,
  options: { available: boolean; now?: Date },
): Promise<CodeRequestResult> {
  const now = options.now ?? new Date();
  const email = normalizeEmail(input);
  if (!email) return { ok: false, error: "invalid" };
  if (email === user.email) return { ok: false, error: "same" };
  if (!options.available) return { ok: false, error: "unavailable" };

  const since = (ms: number) => new Date(now.getTime() - ms);
  const mine = await db
    .select({ createdAt: emailCodes.createdAt })
    .from(emailCodes)
    .where(
      and(
        eq(emailCodes.userId, user.id),
        eq(emailCodes.purpose, "verify-email"),
        gt(emailCodes.createdAt, since(DAY_MS)),
      ),
    );
  const latest = Math.max(0, ...mine.map((row) => row.createdAt.getTime()));
  if (now.getTime() - latest < CODE_LIMITS.resendMs)
    return { ok: false, error: "wait" };
  const lastHour = mine.filter((row) => row.createdAt > since(HOUR_MS)).length;
  if (lastHour >= CODE_LIMITS.hourly || mine.length >= CODE_LIMITS.daily)
    return { ok: false, error: "too-many" };
  const [toAddress] = await db
    .select({ n: count() })
    .from(emailCodes)
    .where(
      and(eq(emailCodes.email, email), gt(emailCodes.createdAt, since(DAY_MS))),
    );
  if ((toAddress?.n ?? 0) >= CODE_LIMITS.perAddressDaily)
    return { ok: false, error: "too-many" };

  // Older codes stop working: only the newest one counts.
  await db
    .update(emailCodes)
    .set({ expiresAt: now })
    .where(
      and(
        eq(emailCodes.userId, user.id),
        eq(emailCodes.purpose, "verify-email"),
        isNull(emailCodes.usedAt),
        gt(emailCodes.expiresAt, now),
      ),
    );
  const code = generateCode();
  await db.insert(emailCodes).values({
    userId: user.id,
    email,
    purpose: "verify-email",
    codeHash: hashCode("verify-email", email, code),
    createdAt: now,
    expiresAt: new Date(now.getTime() + CODE_LIMITS.ttlMs),
  });

  const minutes = String(CODE_LIMITS.ttlMs / MINUTE_MS);
  const mail = composeDirect(
    `${code} is your ${SITE_NAME} code`,
    {
      preheader: `Type it on the site within ${minutes} minutes.`,
      label: "Account",
      title: "Confirm your email address",
      blocks: [
        {
          type: "text",
          text: `@${user.username} asked to use this address for their ${SITE_NAME} account: to sign in, and for any notifications they turn on. To confirm it’s yours, type this code on the page where you asked:`,
        },
        { type: "code", text: code },
        {
          type: "text",
          text: `It works once, for ${minutes} minutes. Nobody from the site will ever ask you for it.`,
        },
      ],
    },
    [
      "Didn’t ask for this? Ignore it: without the code, nothing is linked to your address.",
    ],
  );
  const message = await queueMail(
    db,
    {
      kind: "email-code",
      to: email,
      userId: user.id,
      subject: mail.subject,
      text: mail.text,
      html: mail.html,
      wake: false,
    },
    now,
  );
  return { ok: true, email, messageId: message.id };
}

export type VerifyError = "none" | "wrong" | "taken";

export const VERIFY_ERRORS: Readonly<Record<VerifyError, string>> = {
  none: "That code has expired or was used up. Ask for a new one.",
  wrong: "That isn’t the code. Check the email and try again.",
  taken:
    "That address belongs to another account here. Remove it there first, or use another one.",
};

export type VerifyResult =
  { ok: true; email: string } | { ok: false; error: VerifyError };

/** Checks a typed code; the right one makes its address the account's. */
export async function verifyEmailCode(
  db: Database,
  user: User,
  input: string,
  now = new Date(),
): Promise<VerifyResult> {
  const row = await pendingCode(db, user.id, now);
  if (!row) return { ok: false, error: "none" };
  const code = cleanCode(input);
  const [counted] = await db
    .update(emailCodes)
    .set({ attempts: row.attempts + 1 })
    .where(
      and(eq(emailCodes.id, row.id), eq(emailCodes.attempts, row.attempts)),
    )
    .returning({ id: emailCodes.id });
  // Another guess got there first: count this one against the fresh state.
  if (!counted) return { ok: false, error: "wrong" };
  if (
    !/^\d+$/.test(code) ||
    !sameHash(hashCode("verify-email", row.email, code), row.codeHash)
  )
    return { ok: false, error: "wrong" };

  const [owner] = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.email, row.email), ne(users.id, user.id)))
    .limit(1);
  if (owner) return { ok: false, error: "taken" };

  await db
    .update(emailCodes)
    .set({ usedAt: now })
    .where(eq(emailCodes.id, row.id));
  try {
    await db
      .update(users)
      .set({
        email: row.email,
        emailVerifiedAt: now,
        // New address, new unsubscribe links: old ones stop working.
        emailToken: randomToken(),
      })
      .where(eq(users.id, user.id));
  } catch {
    // The unique index: another account claimed it a moment ago.
    return { ok: false, error: "taken" };
  }
  if (user.email && user.email !== row.email)
    await cancelMailTo(db, { userId: user.id, address: user.email });
  return { ok: true, email: row.email };
}

export function notificationsOf(user: User): NotificationSettings {
  return parseNotificationSettings(user.emailNotifications);
}

/** Saves the switches (from the form: a ticked box is on). */
export async function saveNotifications(
  db: Database,
  userId: string,
  settings: NotificationSettings,
): Promise<void> {
  await db
    .update(users)
    .set({ emailNotifications: { ...settings } })
    .where(eq(users.id, userId));
}

/** The settings form: every topic shown, ticked boxes on. */
export function readNotificationForm(
  form: FormData,
  current: NotificationSettings,
  topics: readonly NotificationTopic[],
): NotificationSettings {
  const next = { ...current };
  for (const topic of topics)
    next[topic] = form.get(`notify-${topic}`) === "on";
  return next;
}

export type UnsubscribeResult =
  { ok: true; topic: NotificationTopic | "all"; user: User } | { ok: false };

/** The account an unsubscribe link belongs to, if the link still works. */
export async function userForToken(
  db: Database,
  token: string,
): Promise<User | undefined> {
  if (!/^[A-Za-z0-9_-]{20,100}$/.test(token)) return undefined;
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.emailToken, token))
    .limit(1);
  return user?.email ? user : undefined;
}

/** Turns a topic off (or every topic, for "all") from an unsubscribe link. */
export async function unsubscribe(
  db: Database,
  token: string,
  topic: string,
): Promise<UnsubscribeResult> {
  const user = await userForToken(db, token);
  if (!user) return { ok: false };
  const current = notificationsOf(user);
  const next: NotificationSettings = isNotificationTopic(topic)
    ? { ...current, [topic]: false }
    : { replies: false, comments: false, reviews: false, admin: false };
  await saveNotifications(db, user.id, next);
  return { ok: true, topic: isNotificationTopic(topic) ? topic : "all", user };
}
