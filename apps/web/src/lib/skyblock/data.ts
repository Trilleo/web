/**
 * The shard data pages read: the newest version in sb_datasets, or the copy committed
 * with the site (snapshot.json) while there's none. Indexed once per version
 * (ShardCatalog) and kept in memory; whether a newer version arrived is checked at
 * most every RECHECK_MS (a sync in this server says so at once with `forgetData`).
 * Icons' addresses come with it: copies in storage (sb_icons) over the committed ones.
 */
import {
  ShardCatalog,
  type Dataset,
  type ShardRecord,
} from "@trilleo/skyblock";
import { sbDatasets, sbIcons, type Database } from "@trilleo/db";
import type { StorageDriver } from "@trilleo/storage/server";
import { desc, isNotNull } from "drizzle-orm";
import { STATIC_ICON_PATH, type StaticIcons } from "./icon-files";
// As text: TypeScript would otherwise work out a type for 1 MB of JSON.
import snapshotText from "./snapshot.json?raw";
import staticIconsJson from "./static-icons.json";

/** How long the version in memory is trusted before asking the database. */
export const RECHECK_MS = 60 * 1000;

export const STATIC_ICONS: StaticIcons = staticIconsJson;

export interface SnapshotFile {
  commit: string;
  files: Record<string, string>;
  data: Dataset;
}

let snapshot: SnapshotFile | null = null;

/** The committed copy: written by scripts/skyblock-snapshot.ts from readSources. */
export function committedSnapshot(): SnapshotFile {
  snapshot ??= JSON.parse(snapshotText) as SnapshotFile;
  return snapshot;
}

export interface ShardData {
  catalog: ShardCatalog;
  /** The sb_datasets row, or null for the committed copy. */
  datasetId: number | null;
  commit: string;
  /** When it was read (null: the committed copy). */
  readAt: Date | null;
  /** Icon addresses by Hypixel ID. */
  icons: Map<string, string>;
}

let cached: { data: ShardData; checkedAt: number } | null = null;
let loading: Promise<ShardData> | null = null;

/** Drops what's in memory (after a sync writes a version or copies icons). */
export function forgetData(): void {
  cached = null;
}

async function iconMap(
  db: Database,
  storage: StorageDriver | null,
): Promise<Map<string, string>> {
  const icons = new Map<string, string>();
  for (const [id, icon] of Object.entries(STATIC_ICONS))
    icons.set(id, `${STATIC_ICON_PATH}${icon.file}`);
  if (storage) {
    const copied = await db
      .select({ shardId: sbIcons.shardId, key: sbIcons.key })
      .from(sbIcons)
      .where(isNotNull(sbIcons.key));
    for (const row of copied)
      if (row.key) icons.set(row.shardId, storage.publicUrl(row.key));
  }
  return icons;
}

async function load(
  db: Database,
  storage: StorageDriver | null,
  knownId: number | null | undefined,
  previous: ShardData | undefined,
): Promise<ShardData> {
  const [latest] = await db
    .select({ id: sbDatasets.id })
    .from(sbDatasets)
    .orderBy(desc(sbDatasets.id))
    .limit(1);
  const icons = await iconMap(db, storage);
  const id = latest?.id ?? null;
  // Same version as before: keep its index, refresh only the icons.
  if (previous && id === knownId) return { ...previous, icons };
  if (!latest)
    return {
      catalog: new ShardCatalog(committedSnapshot().data),
      datasetId: null,
      commit: committedSnapshot().commit,
      readAt: null,
      icons,
    };
  const [row] = await db
    .select({
      id: sbDatasets.id,
      commit: sbDatasets.commit,
      readAt: sbDatasets.readAt,
      data: sbDatasets.data,
    })
    .from(sbDatasets)
    .orderBy(desc(sbDatasets.id))
    .limit(1);
  if (!row) throw new Error("the shard data went away while loading");
  return {
    // Written by the sync from readSources' checked output.
    catalog: new ShardCatalog(row.data as Dataset),
    datasetId: row.id,
    commit: row.commit,
    readAt: row.readAt,
    icons,
  };
}

/** The current shard data (from memory when it's fresh). */
export async function shardData(
  db: Database,
  storage: StorageDriver | null,
  now = Date.now(),
): Promise<ShardData> {
  if (cached && now - cached.checkedAt < RECHECK_MS) return cached.data;
  if (loading) return loading;
  const previous = cached?.data;
  loading = load(db, storage, previous?.datasetId, previous)
    .then((data) => {
      cached = { data, checkedAt: Date.now() };
      return data;
    })
    .finally(() => {
      loading = null;
    });
  return loading;
}

/** A shard's icon address, or null (pages show its rarity's letter instead). */
export function iconOf(data: ShardData, shard: ShardRecord): string | null {
  return data.icons.get(shard.id) ?? null;
}
