/**
 * Storage from the uploader's side: their files page (/account/files), what the
 * account export says about files, and deleting an account's files with it.
 */
import {
  fileAppeals,
  fileReports,
  files,
  uploadStrikes,
  type Database,
  type FileAppeal,
  type StoredFile,
  type UploadStrike,
} from "@trilleo/db";
import { ROLE_LIMITS, type UploaderRole } from "@trilleo/storage";
import type { StorageDriver } from "@trilleo/storage/server";
import { and, desc, eq, isNull, ne, or } from "drizzle-orm";
import { appealsOf } from "./appeals";
import { standingOf, strikesOf, uploaderRole, type Standing } from "./standing";
import { quotaOverride, usageOf, type Usage } from "./store";

export interface AccountStorage {
  files: StoredFile[];
  usage: Usage;
  /** Null: no limit. */
  quotaBytes: number | null;
  role: UploaderRole;
  standing: Standing;
  strikes: UploadStrike[];
  appeals: Map<string, FileAppeal>;
}

/** Someone's files (not counting deleted ones whose bytes are gone) and standing. */
export async function accountStorage(
  db: Database,
  userId: string,
  isAdmin: boolean,
  now = new Date(),
): Promise<AccountStorage> {
  const rows = await db
    .select()
    .from(files)
    .where(
      and(
        eq(files.ownerId, userId),
        ne(files.status, "uploading"),
        or(ne(files.status, "deleted"), isNull(files.purgedAt)),
      ),
    )
    .orderBy(desc(files.createdAt));
  const role = await uploaderRole(db, userId, isAdmin, now);
  return {
    files: rows,
    usage: await usageOf(db, userId, now),
    quotaBytes:
      (await quotaOverride(db, userId)) ?? ROLE_LIMITS[role].quotaBytes,
    role,
    standing: await standingOf(db, userId, now),
    strikes: await strikesOf(db, userId),
    appeals: await appealsOf(db, userId),
  };
}

/** What the account export lists about storage (no bytes: they're downloadable). */
export async function storageExport(db: Database, userId: string) {
  const own = await db
    .select({
      id: files.id,
      name: files.name,
      purpose: files.purpose,
      size: files.size,
      contentType: files.contentType,
      sha256: files.sha256,
      visibility: files.visibility,
      status: files.status,
      statusReason: files.statusReason,
      downloads: files.downloads,
      createdAt: files.createdAt,
      publishedAt: files.publishedAt,
      purgedAt: files.purgedAt,
    })
    .from(files)
    .where(eq(files.ownerId, userId))
    .orderBy(desc(files.createdAt));
  const reports = await db
    .select({
      fileId: fileReports.fileId,
      reason: fileReports.reason,
      details: fileReports.details,
      status: fileReports.status,
      createdAt: fileReports.createdAt,
    })
    .from(fileReports)
    .where(eq(fileReports.reporterId, userId));
  const appeals = await db
    .select({
      fileId: fileAppeals.fileId,
      message: fileAppeals.message,
      status: fileAppeals.status,
      response: fileAppeals.response,
      createdAt: fileAppeals.createdAt,
      decidedAt: fileAppeals.decidedAt,
    })
    .from(fileAppeals)
    .where(eq(fileAppeals.userId, userId));
  const strikes = await db
    .select({
      fileId: uploadStrikes.fileId,
      reason: uploadStrikes.reason,
      createdAt: uploadStrikes.createdAt,
      expiresAt: uploadStrikes.expiresAt,
      clearedAt: uploadStrikes.clearedAt,
    })
    .from(uploadStrikes)
    .where(eq(uploadStrikes.userId, userId));
  return { files: own, reports, appeals, strikes };
}

/**
 * Deletes everything an account stored: the bytes (unfinished uploads too), then
 * the rows. Called before the account itself is deleted.
 */
export async function deleteAccountFiles(
  db: Database,
  storage: StorageDriver | null,
  userId: string,
): Promise<void> {
  const rows = await db.select().from(files).where(eq(files.ownerId, userId));
  for (const row of rows) {
    if (!storage || row.purgedAt) continue;
    if (row.uploadId) await storage.abortUpload(row.key, row.uploadId);
    else await storage.remove(row.key);
  }
  await db.delete(files).where(eq(files.ownerId, userId));
}
