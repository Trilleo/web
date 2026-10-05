/**
 * Housekeeping that no request does by itself, run in the background from the
 * middleware at most every MAINTENANCE_INTERVAL_MS (like IndexNow's check):
 *   - uploads never finished within a day are aborted (OBS also drops their parts
 *     after a day by itself, through a lifecycle rule);
 *   - files stuck in processing (the server restarted mid-way) are processed again;
 *   - files that couldn't be scanned for malware are scanned again (a few per run);
 *   - bytes of deleted, rejected and removed files are purged after their retention.
 */
import type { Database, StoredFile } from "@trilleo/db";
import { purgeAfter } from "@trilleo/storage";
import type { StorageDriver } from "@trilleo/storage/server";
import {
  processFile,
  removeObjects,
  rescanFile,
  type StorageDeps,
} from "./service";
import {
  changeStatus,
  logEvent,
  purgeCandidates,
  staleUploads,
  stuckProcessing,
  unscannedFiles,
  updateFile,
} from "./store";

export const MAINTENANCE_INTERVAL_MS = 10 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
const STUCK_MS = 15 * 60 * 1000;
/** Scans are retried after this long, a few files per run (scanning is heavy). */
const RESCAN_AFTER_MS = 30 * 60 * 1000;
const RESCANS_PER_RUN = 5;

export interface MaintenanceReport {
  abandoned: number;
  reprocessed: number;
  rescanned: number;
  purged: number;
}

async function eachSafely(
  rows: readonly StoredFile[],
  work: (row: StoredFile) => Promise<boolean>,
): Promise<number> {
  let done = 0;
  for (const row of rows) {
    try {
      if (await work(row)) done++;
    } catch (error) {
      console.warn(`Storage maintenance failed for file ${row.id}:`, error);
    }
  }
  return done;
}

export async function runMaintenance(
  deps: StorageDeps,
): Promise<MaintenanceReport> {
  const { db, storage } = deps;
  const now = deps.now?.() ?? new Date();

  const abandoned = await eachSafely(
    await staleUploads(db, new Date(now.getTime() - DAY_MS)),
    async (row) => {
      if (row.uploadId) await storage.abortUpload(row.key, row.uploadId);
      return Boolean(
        await changeStatus(db, {
          id: row.id,
          from: "uploading",
          to: "deleted",
          action: "abandon",
          actorId: null,
          reason: "The upload never finished.",
          set: { uploadId: null, purgedAt: now },
          now,
        }),
      );
    },
  );

  const reprocessed = await eachSafely(
    await stuckProcessing(db, new Date(now.getTime() - STUCK_MS)),
    async (row) => (await processFile(deps, row.id))?.status !== "processing",
  );

  const rescanned = deps.scanning?.scanner
    ? await eachSafely(
        await unscannedFiles(
          db,
          new Date(now.getTime() - RESCAN_AFTER_MS),
          RESCANS_PER_RUN,
        ),
        async (row) =>
          (await rescanFile(deps, row.id))?.scanStatus !== "unscanned",
      )
    : 0;

  const purged = await eachSafely(await purgeCandidates(db), (row) =>
    purge(db, storage, row, now),
  );

  return { abandoned, reprocessed, rescanned, purged };
}

async function purge(
  db: Database,
  storage: StorageDriver,
  row: StoredFile,
  now: Date,
): Promise<boolean> {
  const after = purgeAfter(row.status, row.statusChangedAt);
  if (!after || after > now) return false;
  await removeObjects(storage, row);
  await updateFile(db, row.id, { purgedAt: now });
  await logEvent(db, {
    fileId: row.id,
    action: "purge",
    fromStatus: row.status,
    toStatus: row.status,
    createdAt: now,
  });
  return true;
}

let lastRun = 0;
let running = false;

/** Starts maintenance in the background if it's due. Never throws, never waits. */
export function maintainInBackground(
  deps: () => Promise<StorageDeps | null>,
  now = Date.now(),
): void {
  if (running || now - lastRun < MAINTENANCE_INTERVAL_MS) return;
  running = true;
  lastRun = now;
  void deps()
    .then((resolved) => (resolved ? runMaintenance(resolved) : undefined))
    .catch((error: unknown) => {
      console.warn("Storage maintenance failed:", error);
    })
    .finally(() => {
      running = false;
    });
}
