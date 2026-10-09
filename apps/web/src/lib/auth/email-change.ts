/**
 * Changing the address an account signs in with is the one change that could lock
 * its owner out, so the old address hears about it, with a link that undoes it for
 * UNDO_EMAIL_DAYS (/account/email/undo/<token>/, no sign-in needed). Undoing puts the
 * old address back, signs every browser out, and removes the passkeys and linked
 * accounts added since the change, so whoever made it can't simply sign back in.
 */
import {
  emailCodes,
  passkeys,
  userIdentities,
  users,
  type Database,
  type User,
} from "@trilleo/db";
import { maskEmail } from "@trilleo/mail";
import { and, eq, gt, gte, isNull } from "drizzle-orm";
import { absoluteUrl, composeDirect } from "../mail/compose";
import { cancelMailTo, queueMail } from "../mail/outbox";
import { SITE_NAME } from "../site";
import { logEvent } from "./activity";
import { hashToken, randomToken } from "./crypto";
import { invalidateUserSessions } from "./sessions";

const DAY_MS = 24 * 60 * 60 * 1000;

/** How long the old address can undo a change. */
export const UNDO_EMAIL_DAYS = 7;

export function undoPath(token: string): string {
  return `/account/email/undo/${token}/`;
}

const dateTime = new Intl.DateTimeFormat("en-GB", {
  dateStyle: "long",
  timeStyle: "short",
  timeZone: "UTC",
});

/**
 * After `before` (the account as it was) moved to `newEmail`: logs it and, if it had
 * an address, tells that address how to undo it. Returns the queued message's id.
 */
export async function afterEmailChange(
  db: Database,
  before: User,
  newEmail: string,
  options: { userAgent: string | null; now?: Date },
): Promise<number | null> {
  const now = options.now ?? new Date();
  const old = before.email;
  await logEvent(db, before.id, "email-changed", {
    detail: old
      ? `${maskEmail(old)} → ${maskEmail(newEmail)}`
      : maskEmail(newEmail),
    userAgent: options.userAgent,
    now,
  });
  if (!old || old === newEmail) return null;

  const token = randomToken();
  await db.insert(emailCodes).values({
    userId: before.id,
    email: old,
    purpose: "undo-email",
    codeHash: hashToken(token),
    createdAt: now,
    expiresAt: new Date(now.getTime() + UNDO_EMAIL_DAYS * DAY_MS),
  });
  const mail = composeDirect(
    `Your ${SITE_NAME} sign-in address was changed`,
    {
      preheader: `It’s now ${maskEmail(newEmail)}. Not you? You can undo it.`,
      label: "Account",
      title: "Your address was changed",
      blocks: [
        {
          type: "text",
          text: `The account @${before.username} now signs in with ${maskEmail(newEmail)} instead of this address. Notifications go there too.`,
        },
        {
          type: "facts",
          rows: [["When", `${dateTime.format(now)} UTC`]],
        },
        {
          type: "text",
          text: `If that was you, there’s nothing to do. If it wasn’t, undo it within ${String(UNDO_EMAIL_DAYS)} days: this address comes back, every browser is signed out, and passkeys and linked accounts added since are removed.`,
        },
        {
          type: "button",
          label: "Undo this change",
          href: absoluteUrl(undoPath(token)),
        },
      ],
    },
    ["This message went to the address the account used before the change."],
  );
  const message = await queueMail(
    db,
    {
      kind: "email-changed",
      to: old,
      userId: before.id,
      subject: mail.subject,
      text: mail.text,
      html: mail.html,
    },
    now,
  );
  return message.id;
}

/** The change an undo link is for, while it still works. */
export async function undoTicket(
  db: Database,
  token: string,
  now = new Date(),
): Promise<{ id: number; email: string; user: User; changedAt: Date } | null> {
  if (!/^[A-Za-z0-9_-]{20,100}$/.test(token)) return null;
  const [row] = await db
    .select({ code: emailCodes, user: users })
    .from(emailCodes)
    .innerJoin(users, eq(users.id, emailCodes.userId))
    .where(
      and(
        eq(emailCodes.codeHash, hashToken(token)),
        eq(emailCodes.purpose, "undo-email"),
        isNull(emailCodes.usedAt),
        gt(emailCodes.expiresAt, now),
      ),
    )
    .limit(1);
  if (!row) return null;
  return {
    id: row.code.id,
    email: row.code.email,
    user: row.user,
    changedAt: row.code.createdAt,
  };
}

export type UndoError = "expired" | "taken";

export const UNDO_ERRORS: Readonly<Record<UndoError, string>> = {
  expired:
    "That link has expired or was already used. If someone else has your account, get in touch.",
  taken:
    "Another account uses this address now, so it can’t come back. Please get in touch.",
};

/** Undoes a change from its link: see the module comment. */
export async function undoEmailChange(
  db: Database,
  token: string,
  now = new Date(),
): Promise<{ ok: true; email: string } | { ok: false; error: UndoError }> {
  const ticket = await undoTicket(db, token, now);
  if (!ticket) return { ok: false, error: "expired" };
  const [other] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, ticket.email))
    .limit(1);
  if (other && other.id !== ticket.user.id)
    return { ok: false, error: "taken" };

  const [used] = await db
    .update(emailCodes)
    .set({ usedAt: now })
    .where(and(eq(emailCodes.id, ticket.id), isNull(emailCodes.usedAt)))
    .returning({ id: emailCodes.id });
  if (!used) return { ok: false, error: "expired" };

  const { user, email, changedAt } = ticket;
  try {
    await db
      .update(users)
      .set({ email, emailVerifiedAt: now, emailToken: randomToken() })
      .where(eq(users.id, user.id));
  } catch {
    return { ok: false, error: "taken" };
  }
  // Whatever was added since the change could be how someone else gets back in.
  await db
    .delete(passkeys)
    .where(
      and(eq(passkeys.userId, user.id), gte(passkeys.createdAt, changedAt)),
    );
  const unlinked = await db
    .delete(userIdentities)
    .where(
      and(
        eq(userIdentities.userId, user.id),
        gte(userIdentities.linkedAt, changedAt),
      ),
    )
    .returning({ id: userIdentities.id });
  // users.github_id mirrors the GitHub link (the only provider so far).
  if (unlinked.length > 0)
    await db.update(users).set({ githubId: null }).where(eq(users.id, user.id));
  await invalidateUserSessions(db, user.id);
  if (user.email && user.email !== email)
    await cancelMailTo(db, { userId: user.id, address: user.email });
  await logEvent(db, user.id, "email-restored", {
    detail: maskEmail(email),
    now,
  });
  return { ok: true, email };
}
