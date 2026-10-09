/**
 * The security log: what happened to an account (sign-ins and how, address
 * changes, linked accounts, passkeys, sign-outs), shown on /account/security/ and in
 * the export, and the "new sign-in" alert that comes from it. Only a rough browser
 * name is kept (describeUserAgent), never an IP. Purged after SECURITY_LOG_DAYS.
 */
import { securityEvents, type Database, type User } from "@trilleo/db";
import { and, desc, eq, inArray, lt } from "drizzle-orm";
import { absoluteUrl } from "../mail/compose";
import { notifyUser, safely } from "../mail/notify";
import { SITE_NAME } from "../site";
import { describeUserAgent } from "./devices";

const DAY_MS = 24 * 60 * 60 * 1000;

/** Events are deleted this long after they happened. */
export const SECURITY_LOG_DAYS = 365;
/** A browser not seen signing in for this long counts as new again. */
export const NEW_DEVICE_DAYS = 90;
/** How many events /account/security/ lists. */
export const RECENT_EVENTS = 20;

export type SignInMethod = "email" | "github" | "passkey";

export const SIGN_IN_METHODS: Readonly<Record<SignInMethod, string>> = {
  email: "an email code",
  github: "GitHub",
  passkey: "a passkey",
};

export const SECURITY_EVENTS = {
  "sign-up": "Account created",
  "sign-in": "Signed in",
  "email-changed": "Email address changed",
  "email-restored": "Email address change undone",
  linked: "Account linked",
  unlinked: "Account unlinked",
  "passkey-added": "Passkey added",
  "passkey-removed": "Passkey removed",
  "username-changed": "Username changed",
  "signed-out-others": "Other browsers signed out",
  "signed-out-everywhere": "Signed out everywhere",
} as const;

export type SecurityEventKind = keyof typeof SECURITY_EVENTS;

/** Records one event. Never throws: the log must not break what it records. */
export async function logEvent(
  db: Database,
  userId: string,
  kind: SecurityEventKind,
  options: {
    detail?: string | null;
    userAgent?: string | null;
    now?: Date;
  } = {},
): Promise<void> {
  await safely("security log", () =>
    db.insert(securityEvents).values({
      userId,
      kind,
      detail: options.detail ?? null,
      device:
        options.userAgent === undefined
          ? null
          : describeUserAgent(options.userAgent),
      at: options.now ?? new Date(),
    }),
  );
}

/** The newest events first, for /account/security/. */
export async function recentEvents(
  db: Database,
  userId: string,
  limit = RECENT_EVENTS,
) {
  return db
    .select()
    .from(securityEvents)
    .where(eq(securityEvents.userId, userId))
    .orderBy(desc(securityEvents.at), desc(securityEvents.id))
    .limit(limit);
}

/** All of them, for the export. */
export async function eventsOf(db: Database, userId: string) {
  return db
    .select({
      kind: securityEvents.kind,
      detail: securityEvents.detail,
      device: securityEvents.device,
      at: securityEvents.at,
    })
    .from(securityEvents)
    .where(eq(securityEvents.userId, userId))
    .orderBy(desc(securityEvents.at));
}

export async function purgeSecurityEvents(
  db: Database,
  now = new Date(),
): Promise<void> {
  await db
    .delete(securityEvents)
    .where(
      lt(
        securityEvents.at,
        new Date(now.getTime() - SECURITY_LOG_DAYS * DAY_MS),
      ),
    );
}

/**
 * Whether a sign-in from `device` deserves an alert: the account has signed in
 * before (so neither a new account nor the first sign-in since this log began), but
 * not from this browser in the last NEW_DEVICE_DAYS.
 */
export async function isNewDevice(
  db: Database,
  userId: string,
  device: string,
  now = new Date(),
): Promise<boolean> {
  const before = await db
    .select({ device: securityEvents.device, at: securityEvents.at })
    .from(securityEvents)
    .where(
      and(
        eq(securityEvents.userId, userId),
        inArray(securityEvents.kind, ["sign-in", "sign-up"]),
      ),
    );
  if (before.length === 0) return false;
  const since = now.getTime() - NEW_DEVICE_DAYS * DAY_MS;
  return !before.some(
    (event) => event.device === device && event.at.getTime() > since,
  );
}

const dateTime = new Intl.DateTimeFormat("en-GB", {
  dateStyle: "long",
  timeStyle: "short",
  timeZone: "UTC",
});

/**
 * Logs a sign-in (or the sign-up that made the account) and, from a browser the
 * account hasn't used lately, emails its owner (topic "security").
 */
export async function recordSignIn(
  db: Database,
  user: User,
  input: {
    method: SignInMethod;
    created?: boolean;
    userAgent: string | null;
    now?: Date;
  },
): Promise<void> {
  const now = input.now ?? new Date();
  const device = describeUserAgent(input.userAgent);
  const alert = !input.created && (await isNewDevice(db, user.id, device, now));
  await logEvent(db, user.id, input.created ? "sign-up" : "sign-in", {
    detail: input.method,
    userAgent: input.userAgent,
    now,
  });
  if (!alert) return;
  await safely("new sign-in", () =>
    notifyUser(
      db,
      user,
      "new-sign-in",
      {
        subject: `New sign-in to your ${SITE_NAME} account`,
        body: {
          preheader: `${device}, with ${SIGN_IN_METHODS[input.method]}.`,
          label: "Account",
          title: "A new sign-in",
          blocks: [
            {
              type: "text",
              text: `Your account @${user.username} was just signed in to from a browser it hasn’t used lately.`,
            },
            {
              type: "facts",
              rows: [
                ["Browser", device],
                ["With", SIGN_IN_METHODS[input.method]],
                ["When", `${dateTime.format(now)} UTC`],
              ],
            },
            {
              type: "text",
              text: "If this was you, there’s nothing to do. If it wasn’t, sign out everywhere, then check your email address, linked accounts and passkeys.",
            },
            {
              type: "button",
              label: "Review your account’s security",
              href: absoluteUrl("/account/security/"),
            },
          ],
        },
      },
      now,
    ),
  );
}
