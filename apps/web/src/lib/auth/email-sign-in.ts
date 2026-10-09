/**
 * Signing in by email: a 6-digit code to the address (/sign-in → /sign-in/code),
 * then a session. An address without an account gets a sign-up ticket instead,
 * which /sign-up exchanges for a new account once they've chosen a username.
 *
 * The pages look the same whether or not an address has an account, so nobody can
 * use them to find out who has one; only the email itself differs.
 */
import { createHash } from "node:crypto";
import { emailCodes, type Database, type User } from "@trilleo/db";
import { normalizeEmail } from "@trilleo/mail";
import { and, count, desc, eq, gt, isNull } from "drizzle-orm";
import {
  CODE_LIMITS,
  cleanCode,
  generateCode,
  hashCode,
  sameHash,
} from "../mail/addresses";
import { composeDirect } from "../mail/compose";
import { queueMail } from "../mail/outbox";
import { SITE_NAME } from "../site";
import { createAccount, userByEmail } from "./accounts";
import { hashToken, randomToken } from "./crypto";
import { checkNewUsername, type UsernameProblem } from "./usernames";

const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

export const SIGN_IN_LIMITS = {
  /** A sign-in code works for this long. */
  ttlMs: 10 * MINUTE_MS,
  /** Between two codes to one address. */
  resendMs: MINUTE_MS,
  /** Time to choose a username once the address is proved. */
  ticketMs: 30 * MINUTE_MS,
  /** Codes asked for from one network address. */
  perVisitorHourly: 10,
  perVisitorDaily: 30,
} as const;

/**
 * Codes asked for by each visitor, by a hash of their IP, kept in memory for a day
 * at most (a restart forgets them, which is fine for a limit).
 */
export class SignInLimiter {
  private readonly asked = new Map<string, number[]>();

  constructor(private readonly maxVisitors = 10_000) {}

  static key(ip: string): string {
    return createHash("sha256").update(`sign-in\n${ip}`).digest("base64url");
  }

  take(key: string, now: Date): boolean {
    const at = now.getTime();
    const recent = (this.asked.get(key) ?? []).filter((t) => at - t < DAY_MS);
    const lastHour = recent.filter((t) => at - t < HOUR_MS).length;
    if (
      lastHour >= SIGN_IN_LIMITS.perVisitorHourly ||
      recent.length >= SIGN_IN_LIMITS.perVisitorDaily
    ) {
      this.asked.set(key, recent);
      return false;
    }
    if (!this.asked.has(key) && this.asked.size >= this.maxVisitors)
      this.asked.clear();
    this.asked.set(key, [...recent, at]);
    return true;
  }
}

const visitors = new SignInLimiter();

export type SignInCodeError = "invalid" | "wait" | "too-many" | "unavailable";

export const SIGN_IN_CODE_ERRORS: Readonly<Record<SignInCodeError, string>> = {
  invalid: "That doesn’t look like an email address.",
  wait: "A code is on its way. Wait a minute before asking for another.",
  "too-many": "That’s a lot of codes. Try again later.",
  unavailable:
    "Email isn’t working on the site right now, so codes can’t be sent. Try again later, or sign in with GitHub.",
};

/**
 * Sends a sign-in code to `input`, whether or not it has an account (the email
 * says which). The newest code replaces older ones. The caller sends it right away.
 */
export async function requestSignInCode(
  db: Database,
  input: string,
  options: {
    available: boolean;
    ip: string;
    now?: Date;
    limiter?: SignInLimiter;
  },
): Promise<
  | { ok: true; email: string; messageId: number }
  | { ok: false; error: SignInCodeError }
> {
  const now = options.now ?? new Date();
  const email = normalizeEmail(input);
  if (!email) return { ok: false, error: "invalid" };
  if (!options.available) return { ok: false, error: "unavailable" };

  const since = (ms: number) => new Date(now.getTime() - ms);
  const [latest] = await db
    .select({ createdAt: emailCodes.createdAt })
    .from(emailCodes)
    .where(and(eq(emailCodes.email, email), eq(emailCodes.purpose, "sign-in")))
    .orderBy(desc(emailCodes.createdAt))
    .limit(1);
  if (
    latest &&
    now.getTime() - latest.createdAt.getTime() < SIGN_IN_LIMITS.resendMs
  )
    return { ok: false, error: "wait" };
  const [toAddress] = await db
    .select({ n: count() })
    .from(emailCodes)
    .where(
      and(
        eq(emailCodes.email, email),
        eq(emailCodes.purpose, "sign-in"),
        gt(emailCodes.createdAt, since(DAY_MS)),
      ),
    );
  if ((toAddress?.n ?? 0) >= CODE_LIMITS.perAddressDaily)
    return { ok: false, error: "too-many" };
  const limiter = options.limiter ?? visitors;
  if (!limiter.take(SignInLimiter.key(options.ip), now))
    return { ok: false, error: "too-many" };

  // Older codes stop working: only the newest one counts.
  await db
    .update(emailCodes)
    .set({ expiresAt: now })
    .where(
      and(
        eq(emailCodes.email, email),
        eq(emailCodes.purpose, "sign-in"),
        isNull(emailCodes.usedAt),
        gt(emailCodes.expiresAt, now),
      ),
    );
  const user = await userByEmail(db, email);
  const code = generateCode();
  await db.insert(emailCodes).values({
    userId: user?.id ?? null,
    email,
    purpose: "sign-in",
    codeHash: hashCode("sign-in", email, code),
    createdAt: now,
    expiresAt: new Date(now.getTime() + SIGN_IN_LIMITS.ttlMs),
  });

  const minutes = String(SIGN_IN_LIMITS.ttlMs / MINUTE_MS);
  const mail = composeDirect(
    `${code} is your ${SITE_NAME} sign-in code`,
    {
      preheader: `Type it on the site within ${minutes} minutes.`,
      label: "Account",
      title: user ? "Sign in" : "Create your account",
      blocks: [
        {
          type: "text",
          text: user
            ? `Someone (hopefully you) is signing in to ${SITE_NAME} as @${user.username}. Type this code on the sign-in page:`
            : `Someone (hopefully you) is creating a ${SITE_NAME} account with this address. Type this code on the sign-in page:`,
        },
        { type: "code", text: code },
        {
          type: "text",
          text: `It works once, for ${minutes} minutes. Nobody from the site will ever ask you for it.`,
        },
      ],
    },
    ["Didn’t ask for this? Ignore it: without the code, nobody can sign in."],
  );
  const message = await queueMail(
    db,
    {
      kind: "email-code",
      to: email,
      userId: user?.id ?? null,
      subject: mail.subject,
      text: mail.text,
      html: mail.html,
      wake: false,
    },
    now,
  );
  return { ok: true, email, messageId: message.id };
}

export type SignInVerifyError = "none" | "wrong" | "not-allowed";

export const SIGN_IN_VERIFY_ERRORS: Readonly<
  Record<SignInVerifyError, string>
> = {
  none: "That code has expired or was used up. Ask for a new one.",
  wrong: "That isn’t the code. Check the email and try again.",
  "not-allowed": "That account can’t sign in here.",
};

/** The sign-in code waiting to be typed for `email`, if any. */
async function pendingSignInCode(db: Database, email: string, now: Date) {
  const [row] = await db
    .select()
    .from(emailCodes)
    .where(
      and(
        eq(emailCodes.email, email),
        eq(emailCodes.purpose, "sign-in"),
        isNull(emailCodes.usedAt),
        gt(emailCodes.expiresAt, now),
      ),
    )
    .orderBy(desc(emailCodes.createdAt))
    .limit(1);
  return row && row.attempts < CODE_LIMITS.attempts ? row : undefined;
}

/**
 * Checks a typed code. The right one signs in the address's account, or, for an
 * address without one, hands out a sign-up ticket (its hash kept as a "sign-up"
 * row) for choosing a username.
 */
export async function verifySignInCode(
  db: Database,
  email: string,
  input: string,
  now = new Date(),
): Promise<
  | { ok: true; user: User }
  | { ok: true; ticket: string }
  | { ok: false; error: SignInVerifyError }
> {
  const row = await pendingSignInCode(db, email, now);
  if (!row) return { ok: false, error: "none" };
  const [counted] = await db
    .update(emailCodes)
    .set({ attempts: row.attempts + 1 })
    .where(
      and(eq(emailCodes.id, row.id), eq(emailCodes.attempts, row.attempts)),
    )
    .returning({ id: emailCodes.id });
  // Another guess got there first: count this one against the fresh state.
  if (!counted) return { ok: false, error: "wrong" };
  const code = cleanCode(input);
  if (
    !/^\d+$/.test(code) ||
    !sameHash(hashCode("sign-in", row.email, code), row.codeHash)
  )
    return { ok: false, error: "wrong" };
  const [used] = await db
    .update(emailCodes)
    .set({ usedAt: now })
    .where(and(eq(emailCodes.id, row.id), isNull(emailCodes.usedAt)))
    .returning({ id: emailCodes.id });
  if (!used) return { ok: false, error: "none" };

  // Who has the address now, not when the code was sent.
  const user = await userByEmail(db, row.email);
  if (user) {
    return user.blockedAt
      ? { ok: false, error: "not-allowed" }
      : { ok: true, user };
  }
  const ticket = randomToken();
  await db.insert(emailCodes).values({
    email: row.email,
    purpose: "sign-up",
    codeHash: hashToken(ticket),
    createdAt: now,
    expiresAt: new Date(now.getTime() + SIGN_IN_LIMITS.ticketMs),
  });
  return { ok: true, ticket };
}

/** The address a sign-up ticket proved, while it still works. */
export async function signUpTicket(
  db: Database,
  ticket: string,
  now = new Date(),
): Promise<{ id: number; email: string } | undefined> {
  const [row] = await db
    .select({ id: emailCodes.id, email: emailCodes.email })
    .from(emailCodes)
    .where(
      and(
        eq(emailCodes.codeHash, hashToken(ticket)),
        eq(emailCodes.purpose, "sign-up"),
        isNull(emailCodes.usedAt),
        gt(emailCodes.expiresAt, now),
      ),
    )
    .limit(1);
  return row;
}

export type SignUpError = "expired" | "terms" | "email-taken" | UsernameProblem;

export const SIGN_UP_ERRORS: Readonly<
  Record<"expired" | "terms" | "email-taken", string>
> = {
  expired: "That took a while, and the confirmation expired. Start again.",
  terms:
    "To make an account, agree to the terms and confirm you’re 14 or older.",
  "email-taken":
    "An account was just made with that address. Sign in to it instead.",
};

/** Makes the account a sign-up ticket was for. */
export async function completeSignUp(
  db: Database,
  ticket: string,
  form: { username: string; agreed: boolean },
  now = new Date(),
): Promise<{ ok: true; user: User } | { ok: false; error: SignUpError }> {
  const row = await signUpTicket(db, ticket, now);
  if (!row) return { ok: false, error: "expired" };
  const username = await checkNewUsername(db, form.username, now);
  if (!username.ok) return { ok: false, error: username.problem };
  if (!form.agreed) return { ok: false, error: "terms" };
  if (await userByEmail(db, row.email))
    return { ok: false, error: "email-taken" };

  const [used] = await db
    .update(emailCodes)
    .set({ usedAt: now })
    .where(and(eq(emailCodes.id, row.id), isNull(emailCodes.usedAt)))
    .returning({ id: emailCodes.id });
  if (!used) return { ok: false, error: "expired" };
  try {
    const user = await createAccount(db, {
      username: username.username,
      email: row.email,
      now,
    });
    return { ok: true, user };
  } catch {
    // A unique index: the username or address was taken a moment ago.
    const again = await checkNewUsername(db, form.username, now);
    await db
      .update(emailCodes)
      .set({ usedAt: null })
      .where(eq(emailCodes.id, row.id));
    return { ok: false, error: again.ok ? "email-taken" : again.problem };
  }
}
