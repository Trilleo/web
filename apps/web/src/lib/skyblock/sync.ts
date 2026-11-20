/**
 * Keeping Hypixel SkyBlock's shard data current, from SkyShards' repository. One pass:
 *
 * 1. Ask GitHub for the newest commit and its file tree (two small requests).
 * 2. If any of the four data files' blob SHAs differ from the version we keep, read
 *    all four at that commit and check them (readSources). All or nothing: a file
 *    that fails or doesn't read keeps the old version, as does a list that lost more
 *    than 1 − MIN_SHARE_KEPT of its shards. Data that comes out the same (by hash)
 *    adds no row.
 * 3. Copy icons SkyShards added or changed into storage (WebP, `skyblock/shards/`),
 *    ICONS_PER_PASS at a time; the committed ones need nothing. Failures are tried
 *    again after ICON_RETRY_MS.
 *
 * A pass runs every SYNC_EVERY_MS (a timer, `startSkyblockSync`, or any request);
 * while icons wait, the next starts BACKLOG_GAP_MS after one ends. The admin starts
 * one with /admin/skyblock/'s "Check now". New or removed shards and
 * FAILURES_TO_ALERT failures in a row alert the admin ("skyblock-update").
 */
import { createHash, randomBytes } from "node:crypto";
import {
  pairCount,
  readSources,
  type Dataset,
  type ShardRecord,
} from "@trilleo/skyblock";
import {
  sbDatasets,
  sbIcons,
  sbSyncs,
  type Database,
  type SbSyncSummary,
} from "@trilleo/db";
import { PUBLIC_CACHE } from "@trilleo/storage";
import type { StorageDriver } from "@trilleo/storage/server";
import { desc, eq, isNotNull, lt, sql } from "drizzle-orm";
import { alertAdmin } from "../mail/alerts";
import { getStorage } from "../storage/config";
import { STATIC_ICONS, committedSnapshot, forgetData } from "./data";
import { iconFileName, iconWebp } from "./icon-files";
import { dataFileShas, readDataFiles } from "./read";
import {
  ICON_DIR,
  SOURCE_LIMITS,
  fetchBytes,
  fetchJson,
  fileTree,
  latestCommit,
  rawFileUrl,
  skyblockSource,
  type FetchOptions,
  type SkyblockSource,
} from "./source";

const MINUTE_MS = 60 * 1000;

/** How often a pass runs. Two GitHub API requests when nothing changed. */
export const SYNC_EVERY_MS = 6 * 60 * MINUTE_MS;
/** While icons are waiting, the next pass starts this long after one ends. */
export const BACKLOG_GAP_MS = 2 * MINUTE_MS;
/** How often the timer checks whether a pass is due. */
export const TICK_MS = MINUTE_MS;
/** Icons copied per pass. */
export const ICONS_PER_PASS = 40;
/** A failed icon is tried again after this long. */
export const ICON_RETRY_MS = 24 * 60 * MINUTE_MS;
/** A new list keeping fewer than this share of the current shards is refused. */
export const MIN_SHARE_KEPT = 0.9;
/** Where copied icons go in storage. */
export const ICON_PREFIX = "skyblock/shards/";
/** Failures in a row before the admin hears of them. */
export const FAILURES_TO_ALERT = 4;
const SYNCS_KEPT = 50;
/** Versions of the data kept (the newest is the current one). */
const DATASETS_KEPT = 5;

export interface SyncDeps {
  fetch?: typeof fetch;
  /** Where to read from; null: fetching is off. Read from the environment if left out. */
  source?: SkyblockSource | null;
  /** Where icons go; null: none are copied. Read from the environment if left out. */
  storage?: StorageDriver | null;
  now?: () => Date;
  /** Waits between retries (tests pass a no-op). */
  sleep?: (ms: number) => Promise<void>;
}

const errorText = (error: unknown) =>
  error instanceof Error ? error.message : String(error);

/** SHA-256 of a dataset as JSON: the same data read twice keeps one row. */
export function datasetHash(dataset: Dataset): string {
  return createHash("sha256").update(JSON.stringify(dataset)).digest("hex");
}

interface Current {
  dataset: Dataset;
  files: Record<string, string>;
  hash: string;
}

async function currentDataset(db: Database): Promise<Current> {
  const [row] = await db
    .select({
      data: sbDatasets.data,
      files: sbDatasets.files,
      hash: sbDatasets.hash,
    })
    .from(sbDatasets)
    .orderBy(desc(sbDatasets.id))
    .limit(1);
  // Rows are written below from readSources' checked output.
  if (row)
    return { dataset: row.data as Dataset, files: row.files, hash: row.hash };
  const snapshot = committedSnapshot();
  return {
    dataset: snapshot.data,
    files: snapshot.files,
    hash: datasetHash(snapshot.data),
  };
}

const emptySummary = (): SbSyncSummary => ({
  commit: null,
  changed: false,
  shards: 0,
  pairs: 0,
  newShards: [],
  removedShards: [],
  iconsCopied: 0,
  iconsFailed: 0,
  iconsLeft: 0,
  errors: [],
});

/** One pass. Returns its summary (also kept in sb_syncs). */
export async function syncShards(
  db: Database,
  deps: SyncDeps = {},
): Promise<SbSyncSummary & { ok: boolean }> {
  const fetcher = deps.fetch ?? fetch;
  const now = deps.now ?? (() => new Date());
  const source = deps.source === undefined ? skyblockSource() : deps.source;
  const storage = deps.storage === undefined ? getStorage() : deps.storage;
  const options: FetchOptions = deps.sleep ? { sleep: deps.sleep } : {};
  const summary = emptySummary();
  const [run] = await db
    .insert(sbSyncs)
    .values({ startedAt: now() })
    .returning({ id: sbSyncs.id });
  if (!run) throw new Error("couldn't record the pass");
  let ok = true;
  const finish = async () => {
    await db
      .update(sbSyncs)
      .set({ finishedAt: now(), ok, summary })
      .where(eq(sbSyncs.id, run.id));
    await prune(db);
    forgetData();
    await alertIfNeeded(db, run.id, ok, summary, now());
    return { ...summary, ok };
  };
  if (!source) {
    ok = false;
    summary.errors.push("Fetching is switched off (SKYBLOCK_SYNC=off).");
    return finish();
  }

  let commit: string;
  let tree: Map<string, string>;
  try {
    commit = await latestCommit(fetcher, source);
    tree = await fileTree(fetcher, source, commit);
  } catch (error) {
    ok = false;
    summary.errors.push(errorText(error));
    return finish();
  }
  summary.commit = commit;

  // 2. The data, when its files changed.
  const current = await currentDataset(db);
  let dataset = current.dataset;
  try {
    const files = dataFileShas(source, commit, tree);
    const same = Object.entries(files).every(
      ([path, sha]) => current.files[path] === sha,
    );
    if (!same) {
      const read = await readDataFiles(source, commit, tree, (path) =>
        fetchJson(fetcher, rawFileUrl(source, commit, path), options),
      );
      const next = readSources(read.data);
      const kept =
        next.shards.length / Math.max(1, current.dataset.shards.length);
      if (kept < MIN_SHARE_KEPT)
        throw new Error(
          `the new list has ${String(next.shards.length)} shards against ${String(current.dataset.shards.length)}; kept the old one`,
        );
      const hash = datasetHash(next);
      if (hash !== current.hash) {
        const pairs = pairCount(next);
        await db.insert(sbDatasets).values({
          commit,
          files: read.files,
          hash,
          shards: next.shards.length,
          pairs,
          data: next,
          readAt: now(),
        });
        summary.changed = true;
        const before = new Set(current.dataset.shards.map((s) => s.id));
        const after = new Set(next.shards.map((s) => s.id));
        summary.newShards = next.shards
          .filter((s) => !before.has(s.id))
          .map((s) => s.name);
        summary.removedShards = current.dataset.shards
          .filter((s) => !after.has(s.id))
          .map((s) => s.name);
      } else if (
        Object.entries(read.files).some(([p, sha]) => current.files[p] !== sha)
      ) {
        // Same data from changed files (formatting): remember the new SHAs, so the
        // next pass doesn't read them again.
        const [latest] = await db
          .select({ id: sbDatasets.id })
          .from(sbDatasets)
          .orderBy(desc(sbDatasets.id))
          .limit(1);
        if (latest)
          await db
            .update(sbDatasets)
            .set({ files: read.files, commit })
            .where(eq(sbDatasets.id, latest.id));
        else
          await db.insert(sbDatasets).values({
            commit,
            files: read.files,
            hash,
            shards: next.shards.length,
            pairs: pairCount(next),
            data: next,
            readAt: now(),
          });
      }
      dataset = next;
    }
  } catch (error) {
    ok = false;
    summary.errors.push(errorText(error));
  }
  summary.shards = dataset.shards.length;
  summary.pairs = pairCount(dataset);

  // 3. Icons (with the data we have, even if a new version didn't read).
  if (storage) {
    try {
      await copyIcons(
        db,
        storage,
        source,
        commit,
        tree,
        dataset.shards,
        summary,
        {
          fetcher,
          now,
          options,
        },
      );
    } catch (error) {
      summary.errors.push(`icons: ${errorText(error)}`);
    }
  }
  return finish();
}

/** Which shards' icons need copying: added or changed in SkyShards since we kept one. */
export async function iconsDue(
  db: Database,
  shards: readonly ShardRecord[],
  tree: Map<string, string>,
  now: Date,
): Promise<{ shard: ShardRecord; sha: string; oldKey: string | null }[]> {
  const rows = new Map(
    (await db.select().from(sbIcons)).map((row) => [row.shardId, row]),
  );
  const due: { shard: ShardRecord; sha: string; oldKey: string | null }[] = [];
  for (const shard of shards) {
    const sha = tree.get(`${ICON_DIR}${shard.key}.png`);
    if (!sha) continue;
    const row = rows.get(shard.id);
    if (row) {
      const failedRecently =
        row.sourceSha === sha &&
        row.key === null &&
        now.getTime() - row.checkedAt.getTime() < ICON_RETRY_MS;
      if (row.sourceSha === sha && row.key !== null) continue;
      if (failedRecently) continue;
      due.push({ shard, sha, oldKey: row.key });
    } else if (STATIC_ICONS[shard.id]?.sha !== sha) {
      due.push({ shard, sha, oldKey: null });
    }
  }
  return due;
}

async function copyIcons(
  db: Database,
  storage: StorageDriver,
  source: SkyblockSource,
  commit: string,
  tree: Map<string, string>,
  shards: readonly ShardRecord[],
  summary: SbSyncSummary,
  context: { fetcher: typeof fetch; now: () => Date; options: FetchOptions },
): Promise<void> {
  const due = await iconsDue(db, shards, tree, context.now());
  for (const { shard, sha, oldKey } of due.slice(0, ICONS_PER_PASS)) {
    let key: string | null;
    let error: string | null = null;
    try {
      const png = await fetchBytes(
        context.fetcher,
        rawFileUrl(source, commit, `${ICON_DIR}${shard.key}.png`),
        SOURCE_LIMITS.maxIconBytes,
        context.options,
      );
      const webp = await iconWebp(png);
      // A new name each time: browsers keep icons for a day (PUBLIC_CACHE).
      key = `${ICON_PREFIX}${iconFileName(shard.id).replace(/\.webp$/, "")}-${randomBytes(4).toString("hex")}.webp`;
      await storage.put(key, webp, {
        contentType: "image/webp",
        contentDisposition: "inline",
        cacheControl: PUBLIC_CACHE,
      });
      await storage.setPublic(key, true);
      summary.iconsCopied++;
    } catch (failure) {
      key = null;
      error = errorText(failure).slice(0, 500);
      summary.iconsFailed++;
      console.warn(`SkyBlock icon for ${shard.name}:`, error);
    }
    // A failed retry keeps the icon copied before, if any.
    const keep = key ?? oldKey;
    await db
      .insert(sbIcons)
      .values({
        shardId: shard.id,
        key: keep,
        sourceSha: sha,
        error,
        checkedAt: context.now(),
      })
      .onConflictDoUpdate({
        target: sbIcons.shardId,
        set: {
          key: keep,
          sourceSha: key ? sha : sql`${sbIcons.sourceSha}`,
          error,
          checkedAt: context.now(),
        },
      });
    if (key && oldKey && oldKey !== key)
      await storage.remove(oldKey).catch((failure: unknown) => {
        console.warn(`SkyBlock icon ${oldKey}:`, errorText(failure));
      });
  }
  summary.iconsLeft = Math.max(0, due.length - ICONS_PER_PASS);
}

async function prune(db: Database): Promise<void> {
  const syncs = await db
    .select({ id: sbSyncs.id })
    .from(sbSyncs)
    .orderBy(desc(sbSyncs.id))
    .limit(SYNCS_KEPT);
  const oldestSync = syncs.at(-1)?.id;
  if (syncs.length === SYNCS_KEPT && oldestSync !== undefined)
    await db.delete(sbSyncs).where(lt(sbSyncs.id, oldestSync));
  const datasets = await db
    .select({ id: sbDatasets.id })
    .from(sbDatasets)
    .orderBy(desc(sbDatasets.id))
    .limit(DATASETS_KEPT);
  const oldestData = datasets.at(-1)?.id;
  if (datasets.length === DATASETS_KEPT && oldestData !== undefined)
    await db.delete(sbDatasets).where(lt(sbDatasets.id, oldestData));
}

async function alertIfNeeded(
  db: Database,
  runId: number,
  ok: boolean,
  summary: SbSyncSummary,
  now: Date,
): Promise<void> {
  const notes: string[] = [];
  if (!ok) {
    const recent = await db
      .select({ id: sbSyncs.id, ok: sbSyncs.ok })
      .from(sbSyncs)
      .where(isNotNull(sbSyncs.finishedAt))
      .orderBy(desc(sbSyncs.id))
      .limit(FAILURES_TO_ALERT + 1);
    const firstOk = recent.findIndex((row) => row.ok);
    const inARow = firstOk === -1 ? recent.length : firstOk;
    if (inARow === FAILURES_TO_ALERT && recent[0]?.id === runId)
      notes.push(
        `the shard data update has failed ${String(FAILURES_TO_ALERT)} times in a row: ${summary.errors[0] ?? "unknown error"}`,
      );
  }
  if (summary.newShards.length > 0)
    notes.push(
      `new ${summary.newShards.length === 1 ? "shard" : "shards"}: ${summary.newShards.slice(0, 10).join(", ")}`,
    );
  if (summary.removedShards.length > 0)
    notes.push(
      `gone from the data: ${summary.removedShards.slice(0, 10).join(", ")}`,
    );
  if (notes.length === 0) return;
  await alertAdmin(
    db,
    {
      kind: "skyblock-update",
      summary: `SkyBlock: ${notes.join("; ")}.`,
      path: "/admin/skyblock/",
    },
    now,
  );
}

let running: Promise<unknown> | null = null;
/** When the last pass started and ended; read from sb_syncs after a restart. */
let lastStart: number | null = null;
let lastEnd = 0;
let backlog = false;
let loading = false;
let ticking = false;

export function syncRunning(): boolean {
  return running !== null;
}

/** Starts a pass now unless one is running (the admin's "Check now"). */
export function startSync(
  getDb: () => Promise<Database>,
  deps: SyncDeps = {},
): boolean {
  if (running) return false;
  lastStart = Date.now();
  running = getDb()
    .then((db) => syncShards(db, deps))
    .then((result) => {
      backlog = result.iconsLeft > 0 && result.iconsCopied > 0;
    })
    .catch((error: unknown) => {
      console.warn("SkyBlock shard data update failed:", error);
    })
    .finally(() => {
      running = null;
      lastEnd = Date.now();
    });
  return true;
}

/** Whether a pass is due (BACKLOG_GAP_MS after the last while icons wait). */
export function passDue(
  state: { lastStart: number; lastEnd: number; backlog: boolean },
  now: number,
): boolean {
  return state.backlog
    ? now - Math.max(state.lastEnd, state.lastStart) >= BACKLOG_GAP_MS
    : now - state.lastStart >= SYNC_EVERY_MS;
}

/** A pass if one is due (never with SKYBLOCK_SYNC=off). From the timer and any request. */
export function skyblockSyncInBackground(
  getDb: () => Promise<Database>,
  now = Date.now(),
): void {
  if (running || loading || !skyblockSource()) return;
  if (lastStart === null) {
    // After a restart, go by the last pass on record rather than starting one.
    loading = true;
    void getDb()
      .then((db) =>
        db
          .select({
            startedAt: sbSyncs.startedAt,
            finishedAt: sbSyncs.finishedAt,
            summary: sbSyncs.summary,
          })
          .from(sbSyncs)
          .orderBy(desc(sbSyncs.id))
          .limit(1),
      )
      .then(([last]) => {
        lastStart = last?.startedAt.getTime() ?? 0;
        lastEnd = last?.finishedAt?.getTime() ?? lastStart;
        backlog =
          (last?.summary?.iconsLeft ?? 0) > 0 &&
          (last?.summary?.iconsCopied ?? 0) > 0;
      })
      .catch((error: unknown) => {
        console.warn("SkyBlock: couldn't read the last pass:", error);
      })
      .finally(() => {
        loading = false;
      });
    return;
  }
  if (passDue({ lastStart, lastEnd, backlog }, now)) startSync(getDb);
}

/**
 * Checks every TICK_MS whether a pass is due. Started by the middleware's first
 * server-rendered request (never during the build); the timer doesn't keep the
 * process alive.
 */
export function startSkyblockSync(getDb: () => Promise<Database>): void {
  if (ticking || !skyblockSource()) return;
  ticking = true;
  const tick = () => {
    skyblockSyncInBackground(getDb);
  };
  setTimeout(tick, 15_000).unref();
  setInterval(tick, TICK_MS).unref();
}
