/**
 * SkyBlock event reminders by email. People switch on each event themselves (an
 * event and a lead: sb_reminders); nothing is on by default. A pass every
 * TICK_MS finds what's due (@trilleo/skyblock/events' `dueOccurrence`), and each
 * person gets one email per pass listing theirs, through the outbox (topic
 * "skyblock", so the email settings' switch and one-click unsubscribe apply).
 *
 * The rate guard: at most their daily cap (REMINDER_LIMITS) reminders in any 24
 * hours, none in their quiet hours (their time zone), none while the admin has paused
 * them. Every reminder is logged once per start (sb_reminder_sends: sent or why
 * not), so a pass never sends one twice, even two passes at once; the log is purged
 * after REMINDER_LOG_DAYS. Perk events count only while someone in office holds the
 * perk (the election feed).
 */
import {
  EVENTS,
  PERK_EVENTS,
  REMINDER_LIMITS,
  dueOccurrence,
  formatDuration,
  formatLead,
  formatSkyblockDate,
  inQuietHours,
  isReminderLead,
  isTimeZone,
  leadsFor,
  mayorEvents,
  reminderSubject,
  skyblockDate,
  type Occurrence,
  type SkyBlockEvent,
} from "@trilleo/skyblock/events";
import { eventPath } from "@trilleo/tool-skyblock/meta";
import {
  sbReminderSends,
  sbReminderSettings,
  sbReminders,
  users,
  type Database,
  type User,
} from "@trilleo/db";
import type { EmailBlock } from "@trilleo/mail";
import { and, asc, count, desc, eq, gte, inArray, lt, sql } from "drizzle-orm";
import { notificationsOf } from "../mail/addresses";
import { absoluteUrl } from "../mail/compose";
import { notifyUser } from "../mail/notify";
import { liveFeeds } from "./feeds";

export const REMINDERS_PATH = "/tools/skyblock/events/reminders/";
/** How often a pass looks for what's due. */
export const TICK_MS = 30 * 1000;
/** The send log is kept this long. */
export const REMINDER_LOG_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

export type SendStatus = "sent" | "cap" | "quiet" | "off";
export const SEND_STATUSES: Record<SendStatus, string> = {
  sent: "Sent",
  cap: "Over the daily cap",
  quiet: "In quiet hours",
  off: "Email off",
};

/** Any event a reminder may name: the calendar's and the perks'. */
export function reminderEvent(slug: string): SkyBlockEvent | undefined {
  return (
    EVENTS.find((event) => event.slug === slug) ??
    PERK_EVENTS.find((event) => event.slug === slug)
  );
}

export interface ReminderSettings {
  timeZone: string;
  dailyCap: number;
  quietStart: number | null;
  quietEnd: number | null;
  pausedAt: Date | null;
}

export const DEFAULT_SETTINGS: ReminderSettings = {
  timeZone: "UTC",
  dailyCap: REMINDER_LIMITS.dailyCap,
  quietStart: null,
  quietEnd: null,
  pausedAt: null,
};

export async function reminderSettings(
  db: Database,
  userId: string,
): Promise<ReminderSettings> {
  const [row] = await db
    .select()
    .from(sbReminderSettings)
    .where(eq(sbReminderSettings.userId, userId));
  return row
    ? {
        timeZone: row.timeZone,
        dailyCap: row.dailyCap,
        quietStart: row.quietStart,
        quietEnd: row.quietEnd,
        pausedAt: row.pausedAt,
      }
    : DEFAULT_SETTINGS;
}

export type SettingsError = "time-zone" | "cap" | "quiet";

export async function saveReminderSettings(
  db: Database,
  userId: string,
  input: {
    timeZone: string;
    dailyCap: number;
    quietStart: number | null;
    quietEnd: number | null;
  },
  now = new Date(),
): Promise<{ ok: true } | { ok: false; error: SettingsError }> {
  if (!isTimeZone(input.timeZone)) return { ok: false, error: "time-zone" };
  if (
    !Number.isInteger(input.dailyCap) ||
    input.dailyCap < 1 ||
    input.dailyCap > REMINDER_LIMITS.dailyCapMax
  )
    return { ok: false, error: "cap" };
  const inDay = (n: number | null) =>
    n === null || (Number.isInteger(n) && n >= 0 && n < 24 * 60);
  if (
    (input.quietStart === null) !== (input.quietEnd === null) ||
    !inDay(input.quietStart) ||
    !inDay(input.quietEnd)
  )
    return { ok: false, error: "quiet" };
  const values = {
    timeZone: input.timeZone,
    dailyCap: input.dailyCap,
    quietStart: input.quietStart,
    quietEnd: input.quietEnd,
    updatedAt: now,
  };
  await db
    .insert(sbReminderSettings)
    .values({ userId, ...values })
    .onConflictDoUpdate({ target: sbReminderSettings.userId, set: values });
  return { ok: true };
}

export interface ReminderRow {
  id: number;
  eventSlug: string;
  leadMinutes: number;
  createdAt: Date;
  lastSentAt: Date | null;
}

export async function listReminders(
  db: Database,
  userId: string,
): Promise<ReminderRow[]> {
  return db
    .select({
      id: sbReminders.id,
      eventSlug: sbReminders.eventSlug,
      leadMinutes: sbReminders.leadMinutes,
      createdAt: sbReminders.createdAt,
      lastSentAt: sbReminders.lastSentAt,
    })
    .from(sbReminders)
    .where(eq(sbReminders.userId, userId))
    .orderBy(asc(sbReminders.eventSlug), asc(sbReminders.leadMinutes));
}

export type AddError = "unknown-event" | "bad-lead" | "too-many" | "exists";

export async function addReminder(
  db: Database,
  userId: string,
  slug: string,
  lead: number,
  now = new Date(),
): Promise<{ ok: true } | { ok: false; error: AddError }> {
  const event = reminderEvent(slug);
  if (!event) return { ok: false, error: "unknown-event" };
  if (!isReminderLead(lead) || !leadsFor(event).includes(lead))
    return { ok: false, error: "bad-lead" };
  const [row] = await db
    .select({ n: count() })
    .from(sbReminders)
    .where(eq(sbReminders.userId, userId));
  if ((row?.n ?? 0) >= REMINDER_LIMITS.perUser)
    return { ok: false, error: "too-many" };
  const added = await db
    .insert(sbReminders)
    .values({ userId, eventSlug: slug, leadMinutes: lead, createdAt: now })
    .onConflictDoNothing()
    .returning({ id: sbReminders.id });
  return added.length > 0 ? { ok: true } : { ok: false, error: "exists" };
}

/** Removes one of someone's reminders (or anyone's, with no user: the admin). */
export async function removeReminder(
  db: Database,
  id: number,
  userId: string | null,
): Promise<boolean> {
  const removed = await db
    .delete(sbReminders)
    .where(
      userId === null
        ? eq(sbReminders.id, id)
        : and(eq(sbReminders.id, id), eq(sbReminders.userId, userId)),
    )
    .returning({ id: sbReminders.id });
  return removed.length > 0;
}

/** The admin's pause: no reminders go out to someone while it's set. */
export async function setPaused(
  db: Database,
  userId: string,
  paused: boolean,
  now = new Date(),
): Promise<void> {
  await db
    .insert(sbReminderSettings)
    .values({
      userId,
      dailyCap: REMINDER_LIMITS.dailyCap,
      pausedAt: paused ? now : null,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: sbReminderSettings.userId,
      set: { pausedAt: paused ? now : null, updatedAt: now },
    });
}

interface Due {
  reminder: typeof sbReminders.$inferSelect;
  event: SkyBlockEvent;
  occurrence: Occurrence;
}

function when(ms: number, timeZone: string): string {
  return `${new Date(ms).toLocaleString("en-GB", {
    timeZone,
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  })} (${timeZone})`;
}

/** One email for everything due to someone in a pass. */
export function reminderEmail(
  items: readonly Due[],
  timeZone: string,
  now: number,
): { subject: string; blocks: EmailBlock[] } {
  const sorted = [...items].sort(
    (a, b) => a.occurrence.start - b.occurrence.start,
  );
  const first = sorted[0];
  if (!first) throw new Error("Nothing to remind about.");
  const subject =
    sorted.length === 1
      ? reminderSubject(first.event.name, first.occurrence.start, now)
      : `${reminderSubject(first.event.name, first.occurrence.start, now)}, and ${String(sorted.length - 1)} more`;
  const blocks: EmailBlock[] = [];
  for (const { event, occurrence } of sorted) {
    blocks.push(
      {
        type: "text",
        text: reminderSubject(event.name, occurrence.start, now) + ".",
      },
      {
        type: "facts",
        rows: [
          ["Starts", when(occurrence.start, timeZone)],
          ["SkyBlock date", formatSkyblockDate(skyblockDate(occurrence.start))],
          ...(occurrence.end > occurrence.start
            ? [
                [
                  "Lasts",
                  formatDuration(occurrence.end - occurrence.start),
                ] as const,
              ]
            : []),
          ["Where", event.where],
          ...(event.warp ? [["Warp", event.warp] as const] : []),
        ],
      },
    );
  }
  blocks.push(
    {
      type: "button",
      label: "Open the event timer",
      href: absoluteUrl(
        sorted.length === 1
          ? eventPath(first.event.slug)
          : "/tools/skyblock/events/",
      ),
    },
    {
      type: "list",
      items: [
        { text: "Change your reminders", href: absoluteUrl(REMINDERS_PATH) },
      ],
    },
  );
  return { subject, blocks };
}

let lastPurge = 0;

/** One pass: logs and sends every reminder due at `now`. Returns emails queued. */
export async function sendDueReminders(
  db: Database,
  now = new Date(),
): Promise<number> {
  const at = now.getTime();
  const reminders = await db.select().from(sbReminders);
  if (reminders.length > 0) {
    const perks = reminders.some((r) =>
      PERK_EVENTS.some((event) => event.slug === r.eventSlug),
    )
      ? mayorEvents((await liveFeeds(db, at)).election)
      : [];
    const due: Due[] = [];
    for (const reminder of reminders) {
      const base = reminderEvent(reminder.eventSlug);
      if (!base) continue;
      // A perk's event counts only while someone in office holds the perk.
      const event = base.perk ? perks.find((e) => e.slug === base.slug) : base;
      if (!event) continue;
      const occurrence = dueOccurrence(event, reminder.leadMinutes, at);
      if (occurrence) due.push({ reminder, event, occurrence });
    }
    if (due.length > 0) return sendTo(db, due, now);
  }
  if (at - lastPurge >= 60 * 60 * 1000) {
    lastPurge = at;
    await db
      .delete(sbReminderSends)
      .where(lt(sbReminderSends.at, new Date(at - REMINDER_LOG_DAYS * DAY_MS)));
  }
  return 0;
}

async function sendTo(db: Database, due: Due[], now: Date): Promise<number> {
  const at = now.getTime();
  const userIds = [...new Set(due.map((d) => d.reminder.userId))];
  const people = new Map(
    (await db.select().from(users).where(inArray(users.id, userIds))).map(
      (user) => [user.id, user],
    ),
  );
  const settings = new Map(
    (
      await db
        .select()
        .from(sbReminderSettings)
        .where(inArray(sbReminderSettings.userId, userIds))
    ).map((row) => [row.userId, row]),
  );
  let queued = 0;
  for (const userId of userIds) {
    const user = people.get(userId);
    if (!user) continue;
    const mine = due.filter((d) => d.reminder.userId === userId);
    const setting = settings.get(userId) ?? DEFAULT_SETTINGS;
    if (setting.pausedAt) continue;
    const [sentRow] = await db
      .select({ n: count() })
      .from(sbReminderSends)
      .where(
        and(
          eq(sbReminderSends.userId, userId),
          eq(sbReminderSends.status, "sent"),
          gte(sbReminderSends.at, new Date(at - DAY_MS)),
        ),
      );
    let budget = setting.dailyCap - (sentRow?.n ?? 0);
    const reachable = canEmail(user);
    const quiet = inQuietHours(
      at,
      setting.timeZone,
      setting.quietStart,
      setting.quietEnd,
    );
    const toSend: Due[] = [];
    for (const item of mine.sort(
      (a, b) => a.occurrence.start - b.occurrence.start,
    )) {
      const status: SendStatus = !reachable
        ? "off"
        : quiet
          ? "quiet"
          : budget <= 0
            ? "cap"
            : "sent";
      // The log's key makes this the only pass that handles it.
      const logged = await db
        .insert(sbReminderSends)
        .values({
          reminderId: item.reminder.id,
          startsAt: new Date(item.occurrence.start),
          userId,
          status,
          at: now,
        })
        .onConflictDoNothing()
        .returning({ id: sbReminderSends.reminderId });
      if (logged.length === 0 || status !== "sent") continue;
      budget -= 1;
      toSend.push(item);
    }
    if (toSend.length === 0) continue;
    const { subject, blocks } = reminderEmail(toSend, setting.timeZone, at);
    const sent = await notifyUser(
      db,
      user,
      "skyblock-reminder",
      {
        subject,
        body: { label: "SkyBlock", title: subject, blocks },
        ref: `skyblock:${userId}`,
      },
      now,
    );
    if (!sent) continue;
    queued += 1;
    await db
      .update(sbReminders)
      .set({ lastSentAt: now })
      .where(
        inArray(
          sbReminders.id,
          toSend.map((item) => item.reminder.id),
        ),
      );
  }
  return queued;
}

/** Whether a reminder email could reach someone now. */
export function canEmail(user: User): boolean {
  return (
    user.email !== null &&
    user.emailToken !== null &&
    user.blockedAt === null &&
    notificationsOf(user).skyblock
  );
}

/** Someone's reminders and settings, for the account export. */
export async function reminderExport(db: Database, userId: string) {
  return {
    reminders: (await listReminders(db, userId)).map((row) => ({
      event: row.eventSlug,
      lead: formatLead(row.leadMinutes),
      createdAt: row.createdAt,
      lastSentAt: row.lastSentAt,
    })),
    settings: await reminderSettings(db, userId),
    sends: await db
      .select({
        event: sbReminders.eventSlug,
        startsAt: sbReminderSends.startsAt,
        status: sbReminderSends.status,
        at: sbReminderSends.at,
      })
      .from(sbReminderSends)
      .innerJoin(sbReminders, eq(sbReminders.id, sbReminderSends.reminderId))
      .where(eq(sbReminderSends.userId, userId))
      .orderBy(desc(sbReminderSends.at)),
  };
}

export interface AdminReminderRow {
  id: number;
  userId: string;
  username: string;
  email: string | null;
  eventSlug: string;
  leadMinutes: number;
  createdAt: Date;
  lastSentAt: Date | null;
  paused: boolean;
}

export const ADMIN_PAGE = 100;

/** Every subscription (filtered), the totals, and the last day's sends by status. */
export async function adminReminders(
  db: Database,
  filter: { event: string | null; username: string | null },
  now = new Date(),
) {
  const conditions = [
    filter.event ? eq(sbReminders.eventSlug, filter.event) : undefined,
    filter.username ? eq(users.username, filter.username) : undefined,
  ].filter((c) => c !== undefined);
  const rows = await db
    .select({
      id: sbReminders.id,
      userId: sbReminders.userId,
      username: users.username,
      email: users.email,
      eventSlug: sbReminders.eventSlug,
      leadMinutes: sbReminders.leadMinutes,
      createdAt: sbReminders.createdAt,
      lastSentAt: sbReminders.lastSentAt,
      pausedAt: sbReminderSettings.pausedAt,
    })
    .from(sbReminders)
    .innerJoin(users, eq(users.id, sbReminders.userId))
    .leftJoin(
      sbReminderSettings,
      eq(sbReminderSettings.userId, sbReminders.userId),
    )
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(sbReminders.createdAt))
    .limit(ADMIN_PAGE + 1);
  const byEvent = await db
    .select({ event: sbReminders.eventSlug, n: count() })
    .from(sbReminders)
    .groupBy(sbReminders.eventSlug)
    .orderBy(desc(count()));
  const [people] = await db
    .select({
      n: sql<number>`count(distinct ${sbReminders.userId})`.mapWith(Number),
    })
    .from(sbReminders);
  const sends = await db
    .select({ status: sbReminderSends.status, n: count() })
    .from(sbReminderSends)
    .where(gte(sbReminderSends.at, new Date(now.getTime() - DAY_MS)))
    .groupBy(sbReminderSends.status);
  return {
    rows: rows.slice(0, ADMIN_PAGE).map((row): AdminReminderRow => ({
      id: row.id,
      userId: row.userId,
      username: row.username,
      email: row.email,
      eventSlug: row.eventSlug,
      leadMinutes: row.leadMinutes,
      createdAt: row.createdAt,
      lastSentAt: row.lastSentAt,
      paused: row.pausedAt !== null,
    })),
    more: rows.length > ADMIN_PAGE,
    total: byEvent.reduce((sum, row) => sum + row.n, 0),
    people: people?.n ?? 0,
    byEvent,
    sends: Object.fromEntries(
      sends.map((row) => [row.status, row.n]),
    ) as Partial<Record<SendStatus, number>>,
  };
}

let running: Promise<unknown> | null = null;
let lastStart = 0;
let ticking = false;

/** A pass if one may be due (at most every TICK_MS). */
export function remindersInBackground(
  getDb: () => Promise<Database>,
  now = Date.now(),
): void {
  if (running || now - lastStart < TICK_MS) return;
  lastStart = now;
  running = getDb()
    .then((db) => sendDueReminders(db))
    .catch((error: unknown) => {
      console.warn("SkyBlock reminders failed:", error);
    })
    .finally(() => {
      running = null;
    });
}

/** A pass every TICK_MS from the first server-rendered request (like the other timers). */
export function startSkyblockReminders(getDb: () => Promise<Database>): void {
  if (ticking) return;
  ticking = true;
  const tick = () => {
    remindersInBackground(getDb);
  };
  setTimeout(tick, 5000).unref();
  setInterval(tick, TICK_MS).unref();
}
