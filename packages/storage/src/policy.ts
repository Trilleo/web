/**
 * The moderation policy for uploaders: when they're trusted, when strikes add up to
 * a ban, and when reports hide a file. Pure numbers and decisions; the site stores
 * the facts and asks these functions.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

/** Active strikes that stop someone uploading. */
export const STRIKE_LIMIT = 3;
/** How long a strike counts. */
export const STRIKE_DAYS = 90;
/** Approved uploads (with no active strikes) that make an uploader trusted. */
export const TRUST_AFTER_APPROVALS = 3;
/** Reports from different, established accounts that hide a published file. */
export const REPORTS_TO_HIDE = 3;
/** Accounts younger than this can report, but don't count toward hiding. */
export const REPORTER_MIN_AGE_DAYS = 7;
/** Reports one person can file per rolling day. */
export const REPORTS_PER_DAY = 20;
/** Longest report details and appeal messages. */
export const MAX_MESSAGE_LENGTH = 2000;

export const REPORT_REASONS = [
  "copyright",
  "malware",
  "illegal",
  "sexual",
  "harassment",
  "spam",
  "other",
] as const;

export type ReportReason = (typeof REPORT_REASONS)[number];

export const REPORT_REASON_LABELS: Readonly<Record<ReportReason, string>> = {
  copyright: "It’s mine (or someone else’s) and was shared without permission",
  malware: "It contains malware or harms computers",
  illegal: "It’s illegal",
  sexual: "Sexual content",
  harassment: "Harassment or hate",
  spam: "Spam or misleading",
  other: "Something else",
};

/**
 * auto: trusted once earned (TRUST_AFTER_APPROVALS); trusted / untrusted: set by the
 * admin, whatever the history says.
 */
export const UPLOAD_TRUST_MODES = ["auto", "trusted", "untrusted"] as const;

export type UploadTrustMode = (typeof UPLOAD_TRUST_MODES)[number];

export interface UploaderStanding {
  trust: UploadTrustMode;
  /** When automatic trust was earned (cleared by a strike). */
  trustedAt: Date | null;
  activeStrikes: number;
  bannedAt: Date | null;
}

/** Whether this uploader's public uploads skip review. */
export function isTrustedUploader(standing: UploaderStanding): boolean {
  if (standing.bannedAt) return false;
  if (standing.trust === "trusted") return true;
  if (standing.trust === "untrusted") return false;
  return standing.trustedAt !== null && standing.activeStrikes === 0;
}

/** Whether automatic trust should be granted now. */
export function earnsTrust(
  standing: UploaderStanding,
  approvedUploads: number,
): boolean {
  return (
    standing.trust === "auto" &&
    standing.trustedAt === null &&
    standing.bannedAt === null &&
    standing.activeStrikes === 0 &&
    approvedUploads >= TRUST_AFTER_APPROVALS
  );
}

/** Whether this many active strikes means an automatic upload ban. */
export function strikesBan(activeStrikes: number): boolean {
  return activeStrikes >= STRIKE_LIMIT;
}

/** When a strike given at `at` stops counting. */
export function strikeExpiry(at: Date): Date {
  return new Date(at.getTime() + STRIKE_DAYS * DAY_MS);
}

/** Whether a reporter's account is old enough to count toward hiding a file. */
export function reporterCounts(accountCreated: Date, now: Date): boolean {
  return (
    now.getTime() - accountCreated.getTime() >= REPORTER_MIN_AGE_DAYS * DAY_MS
  );
}

/** Whether a file's open reports (one per established reporter) should hide it. */
export function reportsHide(countingReporters: number): boolean {
  return countingReporters >= REPORTS_TO_HIDE;
}
