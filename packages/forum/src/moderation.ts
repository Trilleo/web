/** Moderation's fixed lists: why people report, how long bans last, what the log says. */

export const REPORT_REASONS = {
  spam: "Spam or advertising",
  harassment: "Harassment or hate",
  inappropriate: "Inappropriate or illegal",
  "off-topic": "Off-topic or in the wrong place",
  other: "Something else",
} as const;

export type ReportReason = keyof typeof REPORT_REASONS;

export function isReportReason(value: string): value is ReportReason {
  return Object.hasOwn(REPORT_REASONS, value);
}

/** A report's note, at most this long. */
export const REPORT_NOTE_MAX = 1000;
/** A ban's or a moderator's reason, at most this long. */
export const REASON_MAX = 500;

const DAY_MS = 24 * 60 * 60_000;

export const BAN_LENGTHS = {
  "1d": { label: "1 day", ms: DAY_MS },
  "7d": { label: "7 days", ms: 7 * DAY_MS },
  "30d": { label: "30 days", ms: 30 * DAY_MS },
  forever: { label: "Permanently", ms: null },
} as const;

export type BanLength = keyof typeof BAN_LENGTHS;

export function isBanLength(value: string): value is BanLength {
  return Object.hasOwn(BAN_LENGTHS, value);
}

/** When a ban of this length, starting now, ends (null: never). */
export function banEnds(length: BanLength, now: Date): Date | null {
  const { ms } = BAN_LENGTHS[length];
  return ms === null ? null : new Date(now.getTime() + ms);
}

/** What the moderation log records, and how it reads. */
export const LOG_ACTIONS = {
  approve: "approved a post",
  hide: "hid a post",
  unhide: "showed a post again",
  delete: "deleted a post",
  "delete-topic": "deleted a topic",
  lock: "locked a topic",
  unlock: "unlocked a topic",
  pin: "changed a topic’s pin",
  move: "moved a topic",
  merge: "merged a topic",
  split: "split posts into a new topic",
  edit: "edited someone’s post",
  ban: "banned someone",
  unban: "lifted a ban",
  "auto-hide": "hid a post after reports",
  "report-dismissed": "dismissed reports",
  "report-actioned": "acted on reports",
  "avatar-removed": "removed a profile picture",
  accept: "accepted an answer for the asker",
  labels: "changed a topic’s prefix or tags",
  solved: "changed whether a topic is solved",
} as const;

export type LogAction = keyof typeof LOG_ACTIONS;
