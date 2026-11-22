/**
 * What the reminder forms (pages/tools/skyblock/events/remind.ts) send back in
 * ?reminder=, as the toast each page shows. Kept apart from reminders.ts so pages
 * can read it without the sender.
 */
import { REMINDER_LIMITS } from "@trilleo/skyblock/events";

export const REMINDER_ANSWERS: Record<
  string,
  { message: string; error: boolean }
> = {
  added: { message: "Reminder added.", error: false },
  removed: { message: "Reminder removed.", error: false },
  saved: { message: "Settings saved.", error: false },
  exists: { message: "You already have that reminder.", error: true },
  "too-many": {
    message: `You can have up to ${String(REMINDER_LIMITS.perUser)} reminders.`,
    error: true,
  },
  "bad-lead": {
    message: "That event comes round too often for that lead.",
    error: true,
  },
  "unknown-event": { message: "There's no such event.", error: true },
  missing: { message: "That reminder was already gone.", error: true },
  "time-zone": { message: "That isn't a time zone.", error: true },
  cap: {
    message: `The daily cap is 1 to ${String(REMINDER_LIMITS.dailyCapMax)}.`,
    error: true,
  },
  quiet: { message: "Quiet hours need a start and an end.", error: true },
  unknown: { message: "Couldn't do that.", error: true },
};
