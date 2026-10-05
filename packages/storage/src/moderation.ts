/**
 * A stored file's life, as a state machine. Every change of status goes through
 * `transition`, so the rules (who may do what, from where) live in one place:
 *
 *   uploading ──complete──▶ processing ──processed──▶ published
 *       │                       │                 └─▶ pending_review ─approve─▶ published
 *       │                       └──fail──▶ rejected        └──reject──▶ rejected
 *       └──abandon──▶ deleted
 *   published ──flag──▶ pending_review   (hidden after several reports, until reviewed)
 *   pending_review ──clear──▶ published   (held only for a malware scan, now clean)
 *   pending_review ──fail──▶ rejected   (a later scan found malware)
 *   published / pending_review ──remove──▶ removed   (a takedown, by the admin)
 *   removed / rejected / deleted ──restore──▶ published   (the admin changed their mind)
 *   most states ──delete──▶ deleted   (the owner or the admin)
 *
 * Files in `deleted`, `rejected` and `removed` keep their bytes for a while
 * (RETENTION_DAYS), then the bytes are purged and only the row remains.
 */

export const FILE_STATUSES = [
  "uploading",
  "processing",
  "pending_review",
  "published",
  "rejected",
  "removed",
  "deleted",
] as const;

export type FileStatus = (typeof FILE_STATUSES)[number];

/**
 * public: listed and downloadable by anyone; unlisted: anyone with the link;
 * private: only its owner and the admin (served through short-lived signed links).
 */
export const FILE_VISIBILITIES = ["public", "unlisted", "private"] as const;

export type FileVisibility = (typeof FILE_VISIBILITIES)[number];

export type FileAction =
  | "complete"
  | "processed"
  | "fail"
  | "abandon"
  | "flag"
  | "clear"
  | "approve"
  | "reject"
  | "remove"
  | "restore"
  | "delete";

/** Who is acting: the uploader, the site's admin, or the server itself. */
export type Actor = "owner" | "admin" | "system";

interface Rule {
  from: readonly FileStatus[];
  by: readonly Actor[];
  /** A reason must be given (shown to the owner). */
  reason?: boolean;
}

const RULES: Readonly<Record<FileAction, Rule>> = {
  complete: { from: ["uploading"], by: ["owner", "admin"] },
  processed: { from: ["processing"], by: ["system"] },
  fail: {
    from: ["uploading", "processing", "pending_review"],
    by: ["system"],
    reason: true,
  },
  abandon: { from: ["uploading"], by: ["owner", "admin", "system"] },
  flag: { from: ["published"], by: ["system"], reason: true },
  clear: { from: ["pending_review"], by: ["system"] },
  approve: { from: ["pending_review"], by: ["admin"] },
  reject: { from: ["pending_review"], by: ["admin"], reason: true },
  remove: {
    from: ["published", "pending_review"],
    by: ["admin"],
    reason: true,
  },
  restore: { from: ["removed", "rejected", "deleted"], by: ["admin"] },
  delete: {
    from: ["processing", "pending_review", "published", "rejected"],
    by: ["owner", "admin"],
  },
};

export type TransitionError = "not-allowed" | "wrong-status" | "needs-reason";

export type TransitionResult =
  { ok: true; to: FileStatus } | { ok: false; error: TransitionError };

/**
 * Where `action` takes a file in `from`, or why it can't. `processed` needs to know
 * whether the file goes to review.
 */
export function transition(
  from: FileStatus,
  action: FileAction,
  actor: Actor,
  options: { reason?: string | null; needsReview?: boolean } = {},
): TransitionResult {
  const rule = RULES[action];
  if (!rule.by.includes(actor)) return { ok: false, error: "not-allowed" };
  if (!rule.from.includes(from)) return { ok: false, error: "wrong-status" };
  if (rule.reason && !options.reason?.trim())
    return { ok: false, error: "needs-reason" };
  return { ok: true, to: target(action, options.needsReview ?? false) };
}

function target(action: FileAction, needsReview: boolean): FileStatus {
  switch (action) {
    case "complete":
      return "processing";
    case "processed":
      return needsReview ? "pending_review" : "published";
    case "flag":
      return "pending_review";
    case "fail":
    case "reject":
      return "rejected";
    case "abandon":
    case "delete":
      return "deleted";
    case "approve":
    case "clear":
    case "restore":
      return "published";
    case "remove":
      return "removed";
  }
}

/** The actions `actor` could take on a file in `status` (for showing buttons). */
export function availableActions(
  status: FileStatus,
  actor: Actor,
): FileAction[] {
  return (Object.keys(RULES) as FileAction[]).filter((action) => {
    const rule = RULES[action];
    return rule.from.includes(status) && rule.by.includes(actor);
  });
}

/** Whether anyone may download the object straight from the files domain. */
export function isServedPublicly(
  status: FileStatus,
  visibility: FileVisibility,
): boolean {
  return status === "published" && visibility !== "private";
}

/** Statuses whose bytes still count against the owner's quota. */
export function countsTowardQuota(status: FileStatus): boolean {
  return status !== "deleted";
}

/** How long bytes are kept after a file leaves circulation, before purging. */
export const RETENTION_DAYS: Readonly<Partial<Record<FileStatus, number>>> = {
  // Undo window for the owner (and the admin).
  deleted: 7,
  rejected: 7,
  // Evidence, and time for an appeal.
  removed: 30,
};

/** When a file's bytes may be purged, or null if they're kept. */
export function purgeAfter(status: FileStatus, since: Date): Date | null {
  const days = RETENTION_DAYS[status];
  return days === undefined
    ? null
    : new Date(since.getTime() + days * 24 * 60 * 60 * 1000);
}
