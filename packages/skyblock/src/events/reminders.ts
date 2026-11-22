/**
 * Event reminders, pure: which lead times an event offers, when a reminder is due,
 * quiet hours in someone's time zone, and the words for them. The site keeps the
 * subscriptions and sends the email (apps/web/src/lib/skyblock/reminders.ts); the
 * browser uses the same rules for its own notifications.
 */
import { SB_DAY_MS, SB_MONTH_MS, SB_YEAR_MS } from "./calendar";
import {
  nextOccurrences,
  occurrences,
  type Occurrence,
  type SkyBlockEvent,
} from "./events";

/** Minutes before the start a reminder may be set for. */
export const REMINDER_LEADS = [0, 5, 15, 30, 60, 1440] as const;
export type ReminderLead = (typeof REMINDER_LEADS)[number];

export function isReminderLead(value: unknown): value is ReminderLead {
  return (REMINDER_LEADS as readonly unknown[]).includes(value);
}

export const REMINDER_LIMITS = {
  /** Subscriptions per account. */
  perUser: 30,
  /** Emails in any 24 hours: the default, and the most someone may choose. */
  dailyCap: 12,
  dailyCapMax: 24,
  /** A reminder is still sent this long after the start (a late tick, a restart). */
  graceMs: 3 * 60_000,
} as const;

/** How long until an event comes round again, at the least. */
export function shortestGap(event: SkyBlockEvent): number {
  const schedule = event.schedule;
  if (schedule.kind === "cycle") return schedule.everyDays * SB_DAY_MS;
  if (schedule.kind === "monthly") {
    const days = [...schedule.days].sort((a, b) => a - b);
    const gaps = days.map((day, i) =>
      i === 0
        ? (days[0] ?? 1) + 31 - (days.at(-1) ?? 1)
        : day - (days[i - 1] ?? day),
    );
    return days.length === 1 ? SB_MONTH_MS : Math.min(...gaps) * SB_DAY_MS;
  }
  if (schedule.starts.length === 1) return SB_YEAR_MS;
  const days = schedule.starts
    .map((start) => (start.month - 1) * 31 + start.day - 1)
    .sort((a, b) => a - b);
  const gaps = days.map((day, i) =>
    i === 0
      ? (days[0] ?? 0) + 372 - (days.at(-1) ?? 0)
      : day - (days[i - 1] ?? 0),
  );
  return Math.min(...gaps) * SB_DAY_MS;
}

/** The leads that make sense for an event: shorter than the gap between its times. */
export function leadsFor(event: SkyBlockEvent): ReminderLead[] {
  const gap = shortestGap(event);
  return REMINDER_LEADS.filter((lead) => lead * 60_000 < gap);
}

/**
 * The time a reminder is due for at `now`: the occurrence whose start is at most
 * `lead` minutes away, or began less than the grace ago. Null when none is.
 */
export function dueOccurrence(
  event: SkyBlockEvent,
  lead: number,
  now: number,
): Occurrence | null {
  const leadMs = lead * 60_000;
  const found = occurrences(
    event,
    now - REMINDER_LIMITS.graceMs,
    now + leadMs + 1,
  ).find(
    (o) => o.start - leadMs <= now && o.start > now - REMINDER_LIMITS.graceMs,
  );
  return found ?? null;
}

/** The next time a reminder will be sent, for its event's page. */
export function nextReminderAt(
  event: SkyBlockEvent,
  lead: number,
  now: number,
): number | null {
  const next = nextOccurrences(event, now + lead * 60_000, 1)[0];
  return next ? next.start - lead * 60_000 : null;
}

export function formatLead(lead: number): string {
  if (lead === 0) return "When it starts";
  if (lead === 1440) return "A day before";
  if (lead === 60) return "An hour before";
  return `${String(lead)} minutes before`;
}

/** "Spooky Festival starts in 15 minutes" / "… has started". */
export function reminderSubject(
  name: string,
  start: number,
  now: number,
): string {
  const minutes = Math.round((start - now) / 60_000);
  if (minutes <= 0) return `${name} has started`;
  if (minutes >= 120) {
    const hours = Math.round(minutes / 60);
    return `${name} starts in ${String(hours)} hours`;
  }
  return `${name} starts in ${String(minutes)} minute${minutes === 1 ? "" : "s"}`;
}

/** Whether a time zone name is one this runtime knows. */
export function isTimeZone(value: string): boolean {
  if (!value || value.length > 64) return false;
  try {
    new Intl.DateTimeFormat("en", { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

/** Minutes since midnight at `now`, in a time zone. */
export function minuteOfDay(now: number, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(now));
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? 0);
  const minute = Number(parts.find((p) => p.type === "minute")?.value ?? 0);
  return (hour % 24) * 60 + minute;
}

/**
 * Whether `now` falls in quiet hours (minutes since midnight, from start up to end;
 * across midnight when end comes first). Equal or missing ends: no quiet hours.
 */
export function inQuietHours(
  now: number,
  timeZone: string,
  start: number | null,
  end: number | null,
): boolean {
  if (start === null || end === null || start === end) return false;
  const minute = minuteOfDay(now, timeZone);
  return start < end
    ? minute >= start && minute < end
    : minute >= start || minute < end;
}

/** "22:00" ↔ minutes since midnight. */
export function parseClock(value: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  return hour < 24 && minute < 60 ? hour * 60 + minute : null;
}

export function formatClock(minutes: number): string {
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}
