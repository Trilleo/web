/**
 * What can be done with stored files, pairing the database (store.ts) with the
 * bucket (a StorageDriver). Each operation checks who's asking and returns either
 * the result or an HTTP status with a message for people; the API routes and admin
 * pages are thin wrappers around these.
 */
import { createHash } from "node:crypto";
import type { Database, FileDetails, StoredFile, User } from "@trilleo/db";
import {
  MAX_PART_URLS,
  ROLE_LIMITS,
  availableActions,
  cleanName,
  describeName,
  extensionOf,
  isProgramName,
  isServedPublicly,
  listZip,
  needsReview,
  newFileId,
  objectKey,
  partRange,
  planParts,
  serveHeaders,
  transition,
  verifyContent,
  type FileAction,
  type FileVisibility,
  type PartPlan,
  type StoredFileSummary,
  type StoragePurpose,
  type UploadRequest,
  type UploaderRole,
} from "@trilleo/storage";
import { readBytes, type StorageDriver } from "@trilleo/storage/server";
import { SNIFF_BYTES, formatBytes } from "@trilleo/tool-kit/files";
import { findPurpose } from "./purposes";
import {
  addStrike,
  grantTrustIfEarned,
  setTrust,
  standingOf,
  uploaderRole,
} from "./standing";
import {
  blockHash,
  changeStatus,
  getFile,
  insertFile,
  isBlockedHash,
  logEvent,
  quotaOverride,
  resolveReports,
  updateFile,
  usageOf,
} from "./store";

export type Result<T> =
  { ok: true; value: T } | { ok: false; status: number; error: string };

const ok = <T>(value: T): Result<T> => ({ ok: true, value });
const fail = <T>(status: number, error: string): Result<T> => ({
  ok: false,
  status,
  error,
});

/** Signed part URLs last an hour; the client asks again for parts it hasn't sent. */
export const PART_URL_SECONDS = 60 * 60;
/** Private downloads get a link this short-lived. */
export const SIGNED_DOWNLOAD_SECONDS = 5 * 60;

export interface Requester {
  user: User;
  isAdmin: boolean;
}

export interface StorageDeps {
  db: Database;
  storage: StorageDriver;
  /** Whether a file's owner is an admin (their uploads skip review). */
  isAdminId?: (userId: string) => Promise<boolean>;
  /** The purpose registry (tests pass their own). */
  purposes?: readonly StoragePurpose[];
  now?: () => Date;
}

/** The file as the API shows it. */
export function toSummary(
  row: StoredFile,
  storage: StorageDriver,
): StoredFileSummary {
  const status = row.status;
  const visibility = row.visibility;
  return {
    id: row.id,
    name: row.name,
    size: row.size,
    kind: describeKind(row.kind),
    label: row.label,
    status,
    visibility,
    statusReason: row.statusReason,
    pageUrl: filePagePath(row.id),
    publicUrl: isServedPublicly(status, visibility)
      ? storage.publicUrl(row.key)
      : null,
  };
}

function describeKind(kind: string): StoredFileSummary["kind"] {
  const kinds: readonly string[] = [
    "image",
    "audio",
    "video",
    "archive",
    "document",
    "font",
    "executable",
    "text",
    "data",
  ];
  return kinds.includes(kind) ? (kind as StoredFileSummary["kind"]) : "data";
}

export function filePagePath(id: string): string {
  return `/files/${id}/`;
}

export function downloadPath(id: string): string {
  return `/d/${id}`;
}

/** Whether `requester` may see a file that isn't public (its owner, or the admin). */
export function canManage(
  row: StoredFile,
  requester: Requester | null,
): boolean {
  return (
    requester !== null &&
    (requester.isAdmin ||
      (row.ownerId !== null && row.ownerId === requester.user.id))
  );
}

function plannedParts(row: StoredFile): PartPlan {
  return planParts(row.size);
}

/** Looks up a file the requester may act on as uploader or admin. */
async function ownFile(
  deps: StorageDeps,
  requester: Requester,
  id: string,
): Promise<Result<StoredFile>> {
  const row = await getFile(deps.db, id);
  if (!row || !canManage(row, requester))
    return fail(404, "There’s no such file.");
  return ok(row);
}

export interface UploadPlan {
  file: StoredFile;
  plan: PartPlan;
}

/** Checks an upload against the rules and starts it in storage. */
export async function startUpload(
  deps: StorageDeps,
  requester: Requester,
  input: UploadRequest,
): Promise<Result<UploadPlan>> {
  const { db, storage } = deps;
  const { user } = requester;
  const purpose = findPurpose(input.purpose, deps.purposes);
  if (!purpose) return fail(404, "There’s nowhere to upload that to.");
  if (purpose.uploaders === "admin" && !requester.isAdmin)
    return fail(403, "Only the site owner can upload here.");
  if (purpose.enabled === false)
    return fail(404, "There’s nowhere to upload that to.");
  if (user.blockedAt) return fail(403, "This account can’t upload files.");
  if (!requester.isAdmin) {
    const standing = await standingOf(db, user.id, deps.now?.());
    if (standing.bannedAt)
      return fail(
        403,
        "You can’t upload files at the moment (see Your files in your account).",
      );
  }

  const role: UploaderRole = await uploaderRole(
    db,
    user.id,
    requester.isAdmin,
    deps.now?.(),
  );
  const limits = ROLE_LIMITS[role];
  const name = cleanName(input.name);
  const size = input.size;
  if (!Number.isSafeInteger(size) || size < 0)
    return fail(400, "That file’s size isn’t valid.");
  if (size === 0) return fail(400, "That file is empty.");
  const maxBytes = Math.min(
    limits.maxFileBytes,
    purpose.maxFileBytes ?? Infinity,
  );
  if (size > maxBytes)
    return fail(413, `Files can be up to ${formatBytes(maxBytes)} here.`);
  if (purpose.extensions && !purpose.extensions.includes(extensionOf(name))) {
    return fail(
      415,
      `Only ${purpose.extensions.map((ext) => `.${ext}`).join(", ")} files can be uploaded here.`,
    );
  }
  if (!requester.isAdmin && isProgramName(name))
    return fail(415, "Programs (like .exe or .apk files) can’t be uploaded.");

  const visibility = input.visibility ?? purpose.defaultVisibility;
  if (!purpose.visibilities.includes(visibility))
    return fail(400, "That visibility isn’t available here.");

  const quota = (await quotaOverride(db, user.id)) ?? limits.quotaBytes;
  if (
    quota !== null ||
    limits.uploadsPerDay !== null ||
    limits.maxPending !== null
  ) {
    const usage = await usageOf(db, user.id, deps.now?.());
    if (quota !== null && usage.bytes + size > quota) {
      const left = Math.max(0, quota - usage.bytes);
      return fail(
        413,
        `That’s more than your storage has room for (${formatBytes(left)} left of ${formatBytes(quota)}).`,
      );
    }
    if (
      limits.uploadsPerDay !== null &&
      usage.uploadsToday >= limits.uploadsPerDay
    )
      return fail(429, "You’ve uploaded a lot today. Try again tomorrow.");
    if (
      limits.maxPending !== null &&
      needsReview(purpose, role, visibility) &&
      usage.pending >= limits.maxPending
    )
      return fail(
        429,
        "You have many files waiting for review. Try again once they’ve been looked at.",
      );
  }

  const id = newFileId();
  const key = objectKey(id, name);
  const headers = serveHeaders(name);
  const description = describeName(name);
  const uploadId = await storage.startUpload(key, headers);
  const file = await insertFile(
    db,
    {
      id,
      ownerId: user.id,
      purpose: purpose.slug,
      name,
      key,
      size,
      contentType: headers.contentType,
      kind: description.kind,
      label: description.label,
      visibility,
      status: "uploading",
      uploadId,
      createdAt: deps.now?.(),
    },
    user.id,
  );
  return ok({ file, plan: planParts(size) });
}

/** Signed URLs for some of an upload's parts. */
export async function partUrls(
  deps: StorageDeps,
  requester: Requester,
  id: string,
  parts: unknown,
): Promise<Result<Record<string, string>>> {
  const found = await ownFile(deps, requester, id);
  if (!found.ok) return found;
  const row = found.value;
  if (row.status !== "uploading" || !row.uploadId)
    return fail(409, "That upload has already finished.");
  const { partCount } = plannedParts(row);
  if (
    !Array.isArray(parts) ||
    parts.length === 0 ||
    parts.length > MAX_PART_URLS ||
    !parts.every(
      (n): n is number => Number.isInteger(n) && n >= 1 && n <= partCount,
    )
  ) {
    return fail(400, "Those parts aren’t part of this upload.");
  }
  const urls: Record<string, string> = {};
  for (const n of new Set(parts)) {
    urls[String(n)] = await deps.storage.partUrl(
      row.key,
      row.uploadId,
      n,
      PART_URL_SECONDS,
    );
  }
  return ok(urls);
}

/** How long `completeUpload` waits for processing before answering "processing". */
const PROCESS_WAIT_MS = 20_000;

/**
 * Joins the parts, checks the file really is what its name says, and processes it
 * (hash, then published or off to review). Big files may still be processing when
 * this answers; the background finishes them.
 */
export async function completeUpload(
  deps: StorageDeps,
  requester: Requester,
  id: string,
): Promise<Result<StoredFile>> {
  const { db, storage } = deps;
  const found = await ownFile(deps, requester, id);
  if (!found.ok) return found;
  const row = found.value;
  if (row.status !== "uploading" || !row.uploadId)
    return fail(409, "That upload has already finished.");

  const plan = plannedParts(row);
  const parts = await storage.listParts(row.key, row.uploadId);
  const byNumber = new Map(parts.map((part) => [part.partNumber, part]));
  for (let n = 1; n <= plan.partCount; n++) {
    const part = byNumber.get(n);
    const { start, end } = partRange(plan, row.size, n);
    if (part?.size !== end - start)
      return fail(409, "Some of the file hasn’t arrived yet. Try again.");
  }
  if (parts.length !== plan.partCount)
    return fail(409, "The upload has parts it shouldn’t. Start again.");

  await storage.finishUpload(row.key, row.uploadId, parts);
  const moved = await changeStatus(db, {
    id,
    from: "uploading",
    to: "processing",
    action: "complete",
    actorId: requester.user.id,
    set: { uploadId: null, uploadedAt: deps.now?.() ?? new Date() },
    now: deps.now?.(),
  });
  if (!moved) return fail(409, "That upload has already finished.");

  const checked = await checkContent(deps, moved, requester.isAdmin);
  if (!checked.ok) return checked;

  const processed = await Promise.race([
    processFile(deps, id),
    new Promise<undefined>((resolve) =>
      setTimeout(() => {
        resolve(undefined);
      }, PROCESS_WAIT_MS),
    ),
  ]);
  return ok(processed ?? (await getFile(db, id)) ?? checked.value);
}

const MISMATCH_MESSAGES = {
  mismatch: "That file isn’t what its name says it is.",
  program: "Programs (like .exe or .apk files) can’t be uploaded.",
} as const;

/** The size check and the first-bytes check. A file that fails is refused and deleted. */
async function checkContent(
  deps: StorageDeps,
  row: StoredFile,
  allowPrograms: boolean,
): Promise<Result<StoredFile>> {
  const { db, storage } = deps;
  const refuse = async (reason: string, status: number) => {
    await storage.remove(row.key);
    await changeStatus(db, {
      id: row.id,
      from: "processing",
      to: "rejected",
      action: "fail",
      actorId: null,
      reason,
      set: { purgedAt: deps.now?.() ?? new Date() },
      now: deps.now?.(),
    });
    return fail<StoredFile>(status, reason);
  };

  const info = await storage.head(row.key);
  if (info?.size !== row.size)
    return refuse("The file that arrived isn’t the size it should be.", 422);

  const head = await readBytes(
    await storage.read(row.key, {
      start: 0,
      end: Math.min(row.size, SNIFF_BYTES),
    }),
  );
  const verdict = verifyContent(row.name, head, { allowPrograms });
  if (!verdict.ok) return refuse(MISMATCH_MESSAGES[verdict.reason], 422);

  const updated = await updateFile(db, row.id, {
    kind: verdict.description.kind,
    label: verdict.description.label,
  });
  return ok(updated ?? row);
}

/** Files being processed in this server process, so none is processed twice. */
const inFlight = new Map<string, Promise<StoredFile | undefined>>();

/**
 * Hashes a processing file and moves it on: published (and made public), or to
 * review. Safe to call again (e.g. after a restart); a file that has moved on is
 * left alone.
 */
export function processFile(
  deps: StorageDeps,
  id: string,
): Promise<StoredFile | undefined> {
  let job = inFlight.get(id);
  if (!job) {
    job = runProcessing(deps, id).finally(() => {
      inFlight.delete(id);
    });
    inFlight.set(id, job);
  }
  return job;
}

async function runProcessing(
  deps: StorageDeps,
  id: string,
): Promise<StoredFile | undefined> {
  const { db, storage } = deps;
  const row = await getFile(db, id);
  if (row?.status !== "processing") return row;

  const hash = createHash("sha256");
  const reader = (await storage.read(row.key)).getReader();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    hash.update(value);
  }
  const sha256 = hash.digest("hex");
  const now = deps.now?.() ?? new Date();

  const ownerIsAdmin =
    row.ownerId !== null && (await deps.isAdminId?.(row.ownerId)) === true;
  // Bytes taken down before stay down (the admin may upload anything).
  if (!ownerIsAdmin && (await isBlockedHash(db, sha256))) {
    await storage.remove(row.key);
    return (
      (await changeStatus(db, {
        id,
        from: "processing",
        to: "rejected",
        action: "fail",
        actorId: null,
        reason: "This file was taken down from the site before.",
        set: { sha256, purgedAt: now },
        now,
      })) ?? (await getFile(db, id))
    );
  }

  const details = await describeContents(storage, row);
  const purpose = findPurpose(row.purpose, deps.purposes);
  const role: UploaderRole = ownerIsAdmin
    ? "admin"
    : row.ownerId
      ? await uploaderRole(db, row.ownerId, false, now)
      : "user";
  const visibility = row.visibility;
  const review = purpose
    ? needsReview(purpose, role, visibility)
    : !ownerIsAdmin;
  const step = transition("processing", "processed", "system", {
    needsReview: review,
  });
  if (!step.ok) return row;

  const goesPublic = isServedPublicly(step.to, visibility);
  if (goesPublic) await storage.setPublic(row.key, true);
  const moved = await changeStatus(db, {
    id,
    from: "processing",
    to: step.to,
    action: "processed",
    actorId: null,
    set: {
      sha256,
      details,
      // The admin's own files need no second look.
      ...(ownerIsAdmin ? { reviewedAt: now } : {}),
      ...(step.to === "published"
        ? { publishedAt: row.publishedAt ?? now }
        : {}),
    },
    now,
  });
  if (!moved && goesPublic) await storage.setPublic(row.key, false);
  return moved ?? (await getFile(db, id));
}

/** Archives get their contents listed for reviewers (two small ranged reads). */
async function describeContents(
  storage: StorageDriver,
  row: StoredFile,
): Promise<FileDetails | null> {
  if (row.kind !== "archive" && row.contentType !== "application/zip")
    return null;
  try {
    const listing = await listZip(row.size, async (start, end) =>
      readBytes(await storage.read(row.key, { start, end })),
    );
    if (!listing) return null;
    return {
      archive: {
        entries: listing.entries.map(({ name, size, directory }) => ({
          name,
          size,
          directory,
        })),
        total: listing.total,
        uncompressed: listing.uncompressed,
        truncated: listing.truncated,
      },
    };
  } catch {
    // A damaged archive is still a file; reviewers just see no listing.
    return null;
  }
}

/** Cancels an unfinished upload: its parts are thrown away and the row closed. */
export async function cancelUpload(
  deps: StorageDeps,
  requester: Requester,
  id: string,
): Promise<Result<StoredFile>> {
  const found = await ownFile(deps, requester, id);
  if (!found.ok) return found;
  const row = found.value;
  if (row.status !== "uploading")
    return fail(409, "That upload has already finished.");
  if (row.uploadId) await deps.storage.abortUpload(row.key, row.uploadId);
  const moved = await changeStatus(deps.db, {
    id,
    from: "uploading",
    to: "deleted",
    action: "abandon",
    actorId: requester.user.id,
    set: { uploadId: null, purgedAt: deps.now?.() ?? new Date() },
    now: deps.now?.(),
  });
  return moved ? ok(moved) : fail(409, "That upload has already finished.");
}

const ACTION_ERRORS = {
  "not-allowed": "You can’t do that to this file.",
  "wrong-status": "That can’t be done to the file as it is now.",
  "needs-reason": "Say why (the uploader will see it).",
} as const;

/**
 * A moderation or owner action (approve, reject, remove, restore, delete). The
 * object's public access follows the new status.
 */
export interface ActOptions {
  /**
   * reject / remove: count a strike against the uploader and block the bytes from
   * coming back (default). False for honest mistakes.
   */
  strike?: boolean;
  /** approve: also trust the uploader from now on. */
  trust?: boolean;
}

export async function actOnFile(
  deps: StorageDeps,
  requester: Requester,
  id: string,
  action: FileAction,
  reason?: string | null,
  options: ActOptions = {},
): Promise<Result<StoredFile>> {
  const found = await ownFile(deps, requester, id);
  if (!found.ok) return found;
  const row = found.value;
  const status = row.status;
  const actor = requester.isAdmin ? "admin" : "owner";
  if (!availableActions(status, actor).includes(action))
    return fail(
      403,
      ACTION_ERRORS[
        availableActions(status, "admin").includes(action)
          ? "not-allowed"
          : "wrong-status"
      ],
    );
  const step = transition(status, action, actor, { reason });
  if (!step.ok)
    return fail(
      step.error === "needs-reason" ? 400 : 403,
      ACTION_ERRORS[step.error],
    );
  if (step.to === "published" && row.purgedAt)
    return fail(409, "That file’s bytes have already been deleted.");

  const visibility = row.visibility;
  const wasPublic = isServedPublicly(status, visibility);
  const willBePublic = isServedPublicly(step.to, visibility);
  if (willBePublic && !wasPublic) await deps.storage.setPublic(row.key, true);
  if (wasPublic && !willBePublic) await deps.storage.setPublic(row.key, false);

  const now = deps.now?.() ?? new Date();
  const moved = await changeStatus(deps.db, {
    id,
    from: status,
    to: step.to,
    action,
    actorId: requester.user.id,
    reason: reason?.trim() ? reason.trim() : null,
    set:
      action === "approve"
        ? { publishedAt: row.publishedAt ?? now, reviewedAt: now }
        : step.to === "published"
          ? { publishedAt: row.publishedAt ?? now }
          : {},
    now,
  });
  if (!moved) {
    // Someone else got there first: put access back as it was.
    if (willBePublic !== wasPublic)
      await deps.storage.setPublic(row.key, wasPublic);
    return fail(409, "The file changed meanwhile. Reload and try again.");
  }
  await afterAction(deps, requester, moved, action, reason ?? "", options, now);
  return ok(moved);
}

/** What a moderation decision means beyond the file: reports, strikes, trust. */
async function afterAction(
  deps: StorageDeps,
  requester: Requester,
  row: StoredFile,
  action: FileAction,
  reason: string,
  options: ActOptions,
  now: Date,
): Promise<void> {
  const { db } = deps;
  if (!requester.isAdmin) return;
  const ownerId = row.ownerId;
  const ownerIsAdmin =
    ownerId !== null && (await deps.isAdminId?.(ownerId)) === true;

  if (action === "approve") {
    await resolveReports(db, row.id, "dismissed", now);
    if (ownerId && !ownerIsAdmin) {
      if (options.trust)
        await setTrust(db, {
          userId: ownerId,
          mode: "trusted",
          actorId: requester.user.id,
          now,
        });
      else await grantTrustIfEarned(db, ownerId, now);
    }
  }
  if (action === "remove") await resolveReports(db, row.id, "actioned", now);
  if (
    (action === "reject" || action === "remove") &&
    options.strike !== false &&
    ownerId &&
    !ownerIsAdmin
  ) {
    await addStrike(db, {
      userId: ownerId,
      fileId: row.id,
      reason: reason.trim(),
      actorId: requester.user.id,
      now,
    });
    if (row.sha256) await blockHash(db, row.sha256, row.id, reason.trim(), now);
  }
}

/** Marks a published file as looked at (a spot check of a trusted upload). */
export async function markReviewed(
  deps: StorageDeps,
  requester: Requester,
  id: string,
): Promise<Result<StoredFile>> {
  if (!requester.isAdmin) return fail(403, "Only the site owner can do that.");
  const row = await getFile(deps.db, id);
  if (!row) return fail(404, "There’s no such file.");
  const now = deps.now?.() ?? new Date();
  const updated = await updateFile(deps.db, id, { reviewedAt: now });
  await logEvent(deps.db, {
    fileId: id,
    actorId: requester.user.id,
    action: "reviewed",
    createdAt: now,
  });
  return ok(updated ?? row);
}

/** Changes who can see a file (within what its purpose allows). */
export async function changeVisibility(
  deps: StorageDeps,
  requester: Requester,
  id: string,
  visibility: FileVisibility,
): Promise<Result<StoredFile>> {
  const found = await ownFile(deps, requester, id);
  if (!found.ok) return found;
  const row = found.value;
  const purpose: StoragePurpose | undefined = findPurpose(
    row.purpose,
    deps.purposes,
  );
  if (purpose && !purpose.visibilities.includes(visibility))
    return fail(400, "That visibility isn’t available here.");
  const status = row.status;
  if (status === "deleted" || status === "removed" || status === "rejected")
    return fail(409, "That file is no longer in use.");
  const before = row.visibility;
  if (before === visibility) return ok(row);

  const wasPublic = isServedPublicly(status, before);
  const willBePublic = isServedPublicly(status, visibility);
  if (willBePublic !== wasPublic)
    await deps.storage.setPublic(row.key, willBePublic);
  const updated = await updateFile(deps.db, id, { visibility });
  await logEvent(deps.db, {
    fileId: id,
    actorId: requester.user.id,
    action: "visibility",
    reason: `${before} → ${visibility}`,
    createdAt: deps.now?.(),
  });
  return ok(updated ?? row);
}

/** Where `requester` downloads a file from: the public URL, or a short signed link. */
export async function downloadUrl(
  storage: StorageDriver,
  row: StoredFile,
  requester: Requester | null,
): Promise<{ url: string; public: boolean } | null> {
  if (row.purgedAt) return null;
  const status = row.status;
  if (isServedPublicly(status, row.visibility))
    return { url: storage.publicUrl(row.key), public: true };
  if (!canManage(row, requester) || status === "uploading") return null;
  return {
    url: await storage.signedUrl(row.key, SIGNED_DOWNLOAD_SECONDS, {
      filename: row.name,
    }),
    public: false,
  };
}
