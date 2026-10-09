/**
 * Stored files in the database: rows, status changes (always logged, always
 * guarded by the status they expect), usage and listings. No storage calls here;
 * service.ts pairs these with the bucket.
 */
import {
  blockedHashes,
  fileAppeals,
  fileReports,
  files,
  storageEvents,
  users,
  type Database,
  type StoredFile,
} from "@trilleo/db";
import type { FileStatus, FileVisibility } from "@trilleo/storage";
import {
  and,
  asc,
  count,
  desc,
  eq,
  gt,
  ilike,
  inArray,
  isNull,
  lt,
  ne,
  or,
  sql,
  sum,
  type SQL,
} from "drizzle-orm";
import { alertAdmin } from "../mail/alerts";
import { notifyFileChange, safely } from "../mail/notify";
import { isMinecraftPurpose, syncFile } from "../minecraft/sync";

export async function getFile(
  db: Database,
  id: string,
): Promise<StoredFile | undefined> {
  const [row] = await db.select().from(files).where(eq(files.id, id)).limit(1);
  return row;
}

export async function insertFile(
  db: Database,
  row: typeof files.$inferInsert,
  actorId: string | null,
): Promise<StoredFile> {
  const [inserted] = await db.insert(files).values(row).returning();
  if (!inserted) throw new Error("The file row wasn't saved.");
  await logEvent(db, {
    fileId: inserted.id,
    actorId,
    action: "upload",
    toStatus: inserted.status,
    createdAt: inserted.createdAt,
  });
  return inserted;
}

export async function logEvent(
  db: Database,
  event: typeof storageEvents.$inferInsert,
): Promise<void> {
  await db.insert(storageEvents).values(event);
}

/**
 * Moves a file from `from` to `to`, only if it's still in `from` (so two requests
 * can't both act on it). Returns the updated row, or undefined if it had moved on.
 */
export async function changeStatus(
  db: Database,
  input: {
    id: string;
    from: FileStatus;
    to: FileStatus;
    action: string;
    actorId: string | null;
    reason?: string | null;
    /** Other columns to set at the same time. */
    set?: Partial<typeof files.$inferInsert>;
    now?: Date;
    /** False: don’t email the uploader (the caller sends its own message). */
    notify?: boolean;
  },
): Promise<StoredFile | undefined> {
  const now = input.now ?? new Date();
  const [row] = await db
    .update(files)
    .set({
      ...input.set,
      status: input.to,
      statusChangedAt: now,
      // The reason the owner sees: why it was refused, taken down or hidden.
      ...(input.to === "rejected" ||
      input.to === "removed" ||
      input.to === "pending_review"
        ? { statusReason: input.reason ?? null }
        : input.to === "published"
          ? { statusReason: null }
          : {}),
    })
    .where(and(eq(files.id, input.id), eq(files.status, input.from)))
    .returning();
  if (!row) return undefined;
  await logEvent(db, {
    fileId: row.id,
    actorId: input.actorId,
    action: input.action,
    fromStatus: input.from,
    toStatus: input.to,
    reason: input.reason ?? null,
    createdAt: now,
  });
  // Features whose pages depend on their files going live (or away).
  if (isMinecraftPurpose(row.purpose)) {
    try {
      await syncFile(db, row, now);
    } catch (error) {
      console.error("Couldn’t update the Minecraft project for a file:", error);
    }
  }
  if (input.notify !== false)
    await safely("file", () =>
      notifyFileChange(
        db,
        row,
        {
          action: input.action,
          from: input.from,
          to: input.to,
          reason: input.reason ?? null,
          actorId: input.actorId,
        },
        now,
      ),
    );
  if (input.action === "processed" && input.to === "pending_review")
    await safely("admin alert", () =>
      alertAdmin(
        db,
        {
          kind: "file-review",
          summary: `“${row.name}” is waiting for review`,
          path: "/admin/files/review?tab=waiting",
        },
        now,
      ),
    );
  return row;
}

export async function updateFile(
  db: Database,
  id: string,
  set: Partial<typeof files.$inferInsert>,
): Promise<StoredFile | undefined> {
  const [row] = await db
    .update(files)
    .set(set)
    .where(eq(files.id, id))
    .returning();
  return row;
}

export interface Usage {
  /** Bytes kept, including uploads in progress (they're reserved). */
  bytes: number;
  uploadsToday: number;
  pending: number;
}

export async function usageOf(
  db: Database,
  ownerId: string,
  now = new Date(),
): Promise<Usage> {
  const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const [row] = await db
    .select({
      bytes: sum(files.size).mapWith(Number),
      uploadsToday:
        sql<number>`count(*) filter (where ${gt(files.createdAt, dayAgo)})`.mapWith(
          Number,
        ),
      pending:
        sql<number>`count(*) filter (where ${eq(files.status, "pending_review")})`.mapWith(
          Number,
        ),
    })
    .from(files)
    .where(and(eq(files.ownerId, ownerId), ne(files.status, "deleted")));
  return {
    bytes: row?.bytes ?? 0,
    uploadsToday: row?.uploadsToday ?? 0,
    pending: row?.pending ?? 0,
  };
}

/** The admin's per-person allowance, if set. */
export async function quotaOverride(
  db: Database,
  userId: string,
): Promise<number | null> {
  const [row] = await db
    .select({ quota: users.storageQuotaBytes })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  return row?.quota ?? null;
}

export interface FileFilter {
  status?: FileStatus;
  purpose?: string;
  ownerId?: string;
  /** Part of the name. */
  query?: string;
  visibility?: FileVisibility;
}

function filterWhere(filter: FileFilter): SQL | undefined {
  const conditions: SQL[] = [];
  if (filter.status) conditions.push(eq(files.status, filter.status));
  if (filter.purpose) conditions.push(eq(files.purpose, filter.purpose));
  if (filter.ownerId) conditions.push(eq(files.ownerId, filter.ownerId));
  if (filter.visibility)
    conditions.push(eq(files.visibility, filter.visibility));
  if (filter.query) {
    const escaped = filter.query.replace(/[\\%_]/g, (c) => `\\${c}`);
    const byName = ilike(files.name, `%${escaped}%`);
    // A file's id finds it too (the file page's "Manage in admin" link).
    conditions.push(or(byName, eq(files.id, filter.query)) ?? byName);
  }
  return conditions.length > 0 ? and(...conditions) : undefined;
}

export interface FileListItem extends StoredFile {
  ownerLogin: string | null;
}

/** Newest first, with the uploader's GitHub login. */
export async function listFiles(
  db: Database,
  filter: FileFilter,
  { limit = 50, offset = 0 }: { limit?: number; offset?: number } = {},
): Promise<{ items: FileListItem[]; total: number }> {
  const where = filterWhere(filter);
  const rows = await db
    .select({ file: files, ownerLogin: users.githubLogin })
    .from(files)
    .leftJoin(users, eq(users.id, files.ownerId))
    .where(where)
    .orderBy(desc(files.createdAt), desc(files.id))
    .limit(limit)
    .offset(offset);
  const [totals] = await db.select({ total: count() }).from(files).where(where);
  return {
    items: rows.map((row) => ({ ...row.file, ownerLogin: row.ownerLogin })),
    total: totals?.total ?? 0,
  };
}

/** Files and stored bytes per status, for the admin's overview. */
export async function statusTotals(
  db: Database,
): Promise<Partial<Record<FileStatus, { files: number; bytes: number }>>> {
  const rows = await db
    .select({
      status: files.status,
      files: count(),
      // Only bytes still in the bucket.
      bytes:
        sql<number>`coalesce(sum(${files.size}) filter (where ${isNull(files.purgedAt)}), 0)`.mapWith(
          Number,
        ),
    })
    .from(files)
    .groupBy(files.status);
  return Object.fromEntries(
    rows.map((row) => [row.status, { files: row.files, bytes: row.bytes }]),
  );
}

export async function fileEvents(db: Database, fileId: string) {
  return db
    .select({
      id: storageEvents.id,
      action: storageEvents.action,
      fromStatus: storageEvents.fromStatus,
      toStatus: storageEvents.toStatus,
      reason: storageEvents.reason,
      createdAt: storageEvents.createdAt,
      actorLogin: users.githubLogin,
    })
    .from(storageEvents)
    .leftJoin(users, eq(users.id, storageEvents.actorId))
    .where(eq(storageEvents.fileId, fileId))
    .orderBy(desc(storageEvents.createdAt), desc(storageEvents.id));
}

/** Who uploaded a file, as the file page shows them. */
export async function fileOwner(db: Database, ownerId: string) {
  const [owner] = await db
    .select({ login: users.githubLogin, profilePublic: users.profilePublic })
    .from(users)
    .where(and(eq(users.id, ownerId), isNull(users.blockedAt)))
    .limit(1);
  return owner;
}

export async function addDownload(db: Database, id: string): Promise<void> {
  await db
    .update(files)
    .set({ downloads: sql`${files.downloads} + 1` })
    .where(eq(files.id, id));
}

/** Uploads started before `before` that never finished. */
export async function staleUploads(db: Database, before: Date) {
  return db
    .select()
    .from(files)
    .where(and(eq(files.status, "uploading"), lt(files.createdAt, before)));
}

/** Files that couldn't be scanned, last tried before `before`, oldest first. */
export async function unscannedFiles(
  db: Database,
  before: Date,
  limit: number,
) {
  return db
    .select()
    .from(files)
    .where(
      and(
        eq(files.scanStatus, "unscanned"),
        isNull(files.purgedAt),
        inArray(files.status, ["pending_review", "published"]),
        lt(files.scannedAt, before),
      ),
    )
    .orderBy(asc(files.scannedAt))
    .limit(limit);
}

/** Files stuck in processing since before `before` (e.g. the server restarted). */
export async function stuckProcessing(db: Database, before: Date) {
  return db
    .select()
    .from(files)
    .where(
      and(eq(files.status, "processing"), lt(files.statusChangedAt, before)),
    );
}

/**
 * Files out of circulation whose bytes are still stored. Files with an open appeal
 * are kept until it's decided.
 */
export async function purgeCandidates(db: Database) {
  const rows = await db
    .select({ file: files })
    .from(files)
    .leftJoin(
      fileAppeals,
      and(eq(fileAppeals.fileId, files.id), eq(fileAppeals.status, "open")),
    )
    .where(
      and(
        inArray(files.status, ["deleted", "rejected", "removed"]),
        isNull(files.purgedAt),
        isNull(fileAppeals.id),
      ),
    );
  return rows.map((row) => row.file);
}

/** Closes a file's open reports (dismissed: nothing wrong; actioned: taken down). */
export async function resolveReports(
  db: Database,
  fileId: string,
  status: "dismissed" | "actioned",
  now = new Date(),
): Promise<number> {
  const closed = await db
    .update(fileReports)
    .set({ status, resolvedAt: now })
    .where(and(eq(fileReports.fileId, fileId), eq(fileReports.status, "open")))
    .returning({ id: fileReports.id });
  return closed.length;
}

export async function isBlockedHash(
  db: Database,
  sha256: string,
): Promise<boolean> {
  const [row] = await db
    .select({ sha256: blockedHashes.sha256 })
    .from(blockedHashes)
    .where(eq(blockedHashes.sha256, sha256))
    .limit(1);
  return row !== undefined;
}

export async function blockHash(
  db: Database,
  sha256: string,
  fileId: string,
  reason: string,
  now = new Date(),
): Promise<void> {
  await db
    .insert(blockedHashes)
    .values({ sha256, fileId, reason, createdAt: now })
    .onConflictDoNothing({ target: blockedHashes.sha256 });
}

/** Lets a file's bytes be uploaded again (its takedown was reversed). */
export async function unblockFile(db: Database, fileId: string): Promise<void> {
  await db.delete(blockedHashes).where(eq(blockedHashes.fileId, fileId));
}
