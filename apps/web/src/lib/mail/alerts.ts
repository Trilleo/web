/**
 * Admin alerts: things the admin should look at (a contact message, a file waiting
 * for review, a report, an appeal, a newcomer's comment). Each is a row in
 * admin_alerts; delivery bundles whatever has gathered into one email, at most one
 * per ADMIN_ALERT_GAP_MS, so a burst of reports is one message, not twenty.
 *
 * Recipients: MAIL_ADMIN_TO when set, else the admins' own verified addresses (with
 * "Admin alerts" on). With nobody to tell, alerts are marked done and only shown on
 * /admin/mail/.
 */
import {
  adminAlerts,
  mailMessages,
  users,
  type AdminAlert,
  type Database,
} from "@trilleo/db";
import { and, asc, desc, eq, gt, inArray, isNull, lt, or } from "drizzle-orm";
import type { AuthConfig } from "../auth/config";
import { SITE_NAME } from "../site";
import { notificationsOf } from "./addresses";
import { absoluteUrl, composeDirect, composeNotification } from "./compose";
import { queueMail } from "./outbox";

const MINUTE_MS = 60 * 1000;

/** At most one alert email per this long. */
export const ADMIN_ALERT_GAP_MS = 10 * MINUTE_MS;
/** Alerts are listed on /admin/mail/ for this long. */
export const ADMIN_ALERT_DAYS = 30;
/** The most items one email lists; the rest are counted. */
const LISTED = 25;

export const ALERT_KINDS = {
  contact: "Contact message",
  "file-review": "File waiting for review",
  "file-report": "File reported",
  appeal: "Appeal",
  comment: "Comment waiting",
  "project-report": "Project reported",
} as const;
export type AlertKind = keyof typeof ALERT_KINDS;

export function alertKindLabel(kind: string): string {
  return Object.hasOwn(ALERT_KINDS, kind)
    ? ALERT_KINDS[kind as AlertKind]
    : kind;
}

/** Something to wake delivery when an alert arrives (set with the outbox hook). */
let afterAlert: (() => void) | null = null;

export function onAdminAlert(hook: (() => void) | null): void {
  afterAlert = hook;
}

export async function alertAdmin(
  db: Database,
  alert: { kind: AlertKind; summary: string; path: string },
  now = new Date(),
): Promise<void> {
  await db.insert(adminAlerts).values({ ...alert, createdAt: now });
  afterAlert?.();
}

/** The accounts that count as the admin (see lib/auth/config.ts). */
type AdminAccounts = Pick<AuthConfig, "adminEmails" | "adminGithubIds">;

/** Who gets alerts, with each one's unsubscribe token (null for MAIL_ADMIN_TO). */
async function recipients(
  db: Database,
  adminTo: readonly string[],
  admins: AdminAccounts,
): Promise<{ address: string; userId: string | null; token: string | null }[]> {
  if (adminTo.length > 0)
    return adminTo.map((address) => ({ address, userId: null, token: null }));
  const who = [
    ...(admins.adminEmails.size > 0
      ? [inArray(users.email, [...admins.adminEmails])]
      : []),
    ...(admins.adminGithubIds.size > 0
      ? [inArray(users.githubId, [...admins.adminGithubIds])]
      : []),
  ];
  if (who.length === 0) return [];
  const found = await db
    .select()
    .from(users)
    .where(or(...who));
  return found
    .filter(
      (admin) =>
        admin.email && admin.emailToken && notificationsOf(admin).admin,
    )
    .map((admin) => ({
      address: admin.email ?? "",
      userId: admin.id,
      token: admin.emailToken,
    }));
}

function subjectFor(alerts: readonly AdminAlert[]): string {
  const [first] = alerts;
  if (alerts.length === 1 && first) return `${SITE_NAME}: ${first.summary}`;
  return `${SITE_NAME}: ${String(alerts.length)} things to look at`;
}

/**
 * Mails what has gathered, if the last alert email was long enough ago. Returns
 * how many alerts it covered.
 */
export async function flushAdminAlerts(
  db: Database,
  input: { adminTo: readonly string[]; admins: AdminAccounts },
  now = new Date(),
): Promise<number> {
  const waiting = await db
    .select()
    .from(adminAlerts)
    .where(isNull(adminAlerts.mailedAt))
    .orderBy(asc(adminAlerts.createdAt), asc(adminAlerts.id));
  if (waiting.length === 0) return 0;
  const [recent] = await db
    .select({ id: mailMessages.id })
    .from(mailMessages)
    .where(
      and(
        eq(mailMessages.kind, "admin-alert"),
        gt(
          mailMessages.createdAt,
          new Date(now.getTime() - ADMIN_ALERT_GAP_MS),
        ),
      ),
    )
    .limit(1);
  if (recent) return 0;

  // Claim them first, so two passes never mail the same alerts.
  const claimed = await db
    .update(adminAlerts)
    .set({ mailedAt: now })
    .where(
      and(
        isNull(adminAlerts.mailedAt),
        inArray(
          adminAlerts.id,
          waiting.map((alert) => alert.id),
        ),
      ),
    )
    .returning();
  if (claimed.length === 0) return 0;
  claimed.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

  const people = await recipients(db, input.adminTo, input.admins);
  if (people.length === 0) return claimed.length;

  const kinds = new Map<string, number>();
  for (const alert of claimed)
    kinds.set(alert.kind, (kinds.get(alert.kind) ?? 0) + 1);
  const summary = [...kinds]
    .map(([kind, n]) => `${alertKindLabel(kind)}: ${String(n)}`)
    .join(" · ");
  const listed = claimed.slice(0, LISTED);
  const body = {
    preheader: summary,
    label: "Admin",
    title:
      claimed.length === 1
        ? "Something to look at"
        : `${String(claimed.length)} things to look at`,
    blocks: [
      { type: "text" as const, text: summary },
      {
        type: "list" as const,
        items: listed.map((alert) => ({
          text: alert.summary,
          href: absoluteUrl(alert.path),
        })),
      },
      ...(claimed.length > listed.length
        ? [
            {
              type: "text" as const,
              text: `…and ${String(claimed.length - listed.length)} more.`,
            },
          ]
        : []),
      {
        type: "button" as const,
        label: "Open the admin",
        href: absoluteUrl("/admin/"),
      },
    ],
  };
  const subject = subjectFor(claimed);
  for (const person of people) {
    const mail = person.token
      ? composeNotification(subject, body, {
          emailToken: person.token,
          topic: "admin",
        })
      : composeDirect(subject, body, [
          "Sent to MAIL_ADMIN_TO. Change who gets these in the server’s settings.",
        ]);
    await queueMail(
      db,
      {
        kind: "admin-alert",
        to: person.address,
        userId: person.userId,
        subject: mail.subject,
        text: mail.text,
        html: mail.html,
        headers: mail.headers,
      },
      now,
    );
  }
  return claimed.length;
}

/** Recent alerts, for /admin/mail/; older ones are deleted. */
export async function recentAlerts(db: Database, now = new Date(), limit = 30) {
  await db
    .delete(adminAlerts)
    .where(
      lt(
        adminAlerts.createdAt,
        new Date(now.getTime() - ADMIN_ALERT_DAYS * 24 * 60 * MINUTE_MS),
      ),
    );
  return db
    .select()
    .from(adminAlerts)
    .orderBy(desc(adminAlerts.createdAt), desc(adminAlerts.id))
    .limit(limit);
}
