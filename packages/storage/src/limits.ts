/**
 * How much people may store, and how uploads are cut into parts. Every upload is a
 * multipart upload (one part for small files), so the browser only ever sends plain
 * PUTs of bytes to signed URLs and the server sets everything else.
 */
import { extensionOf } from "./files";
import type { FileVisibility } from "./moderation";

const MiB = 1024 * 1024;
const GiB = 1024 * MiB;

/** The largest file anyone can upload. */
export const MAX_FILE_BYTES = GiB;

/**
 * user: anyone signed in; trusted: an uploader the admin trusts (moderation, later);
 * admin: the site's owner.
 */
export type UploaderRole = "user" | "trusted" | "admin";

export interface RoleLimits {
  /** Total bytes kept (null: no limit). */
  quotaBytes: number | null;
  maxFileBytes: number;
  /** Uploads started per rolling day (null: no limit). */
  uploadsPerDay: number | null;
  /** Files waiting for review at once (null: no limit). */
  maxPending: number | null;
}

export const ROLE_LIMITS: Readonly<Record<UploaderRole, RoleLimits>> = {
  user: {
    quotaBytes: 2 * GiB,
    maxFileBytes: 200 * MiB,
    uploadsPerDay: 50,
    maxPending: 20,
  },
  trusted: {
    quotaBytes: 10 * GiB,
    maxFileBytes: GiB,
    uploadsPerDay: 200,
    maxPending: null,
  },
  admin: {
    quotaBytes: null,
    maxFileBytes: MAX_FILE_BYTES,
    uploadsPerDay: null,
    maxPending: null,
  },
};

/**
 * What a feature stores files for, and its rules. Features register theirs in the
 * site's purpose registry; uploads name one.
 */
export interface StoragePurpose {
  /** "site", "creator", … (lowercase letters, digits and dashes). */
  slug: string;
  /** For the admin's lists ("Site files"). */
  label: string;
  /**
   * False keeps the purpose's rules in place but refuses uploads (a feature that
   * isn't live yet). Defaults to true.
   */
  enabled?: boolean;
  /** Who may upload: only the admin, or anyone signed in. */
  uploaders: "admin" | "users";
  /** A lower size cap than the uploader's role allows. */
  maxFileBytes?: number;
  /** Allowed extensions (lowercase, no dot); every type when left out. */
  extensions?: readonly string[];
  visibilities: readonly FileVisibility[];
  defaultVisibility: FileVisibility;
  /**
   * Whether non-admin uploads wait for the admin before anyone else sees them:
   * always, only for uploaders who aren't trusted yet, or never (private files).
   */
  review: "always" | "untrusted" | "never";
  /**
   * Extensions (lowercase, no dot) whose non-admin public uploads always wait for
   * review, whoever uploads them: programs other people will run, like mods (.jar).
   */
  alwaysReview?: readonly string[];
}

/**
 * Whether an upload by someone in `role` waits for review. Admins never wait. `name`
 * (the file name) is checked against the purpose's `alwaysReview` extensions.
 */
export function needsReview(
  purpose: StoragePurpose,
  role: UploaderRole,
  visibility: FileVisibility,
  name = "",
): boolean {
  if (role === "admin" || visibility === "private") return false;
  if (purpose.review === "always") return true;
  if (purpose.alwaysReview?.includes(extensionOf(name))) return true;
  if (purpose.review === "untrusted") return role !== "trusted";
  return false;
}

/** Single-part uploads up to this size; bigger files go up in PART_BYTES parts. */
export const SINGLE_PART_MAX = 16 * MiB;
export const PART_BYTES = 8 * MiB;
/** S3 and OBS stop at 10 000 parts; staying far below keeps one ListParts page. */
export const MAX_PARTS = 1000;

export interface PartPlan {
  partSize: number;
  partCount: number;
}

/** How a file of `size` bytes is cut up: equal parts, the last one shorter. */
export function planParts(size: number): PartPlan {
  if (size <= SINGLE_PART_MAX)
    return { partSize: Math.max(size, 1), partCount: 1 };
  const partSize = Math.max(PART_BYTES, Math.ceil(size / MAX_PARTS));
  return { partSize, partCount: Math.ceil(size / partSize) };
}

/** The byte range [start, end) of part `n` (1-based). */
export function partRange(
  plan: PartPlan,
  size: number,
  n: number,
): { start: number; end: number } {
  const start = (n - 1) * plan.partSize;
  return { start, end: Math.min(start + plan.partSize, size) };
}
