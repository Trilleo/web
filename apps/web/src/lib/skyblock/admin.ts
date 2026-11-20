/** What /admin/skyblock/ shows: the data in use, icons, and recent passes. */
import { sbIcons, sbSyncs, type Database, type SbSync } from "@trilleo/db";
import type { StorageDriver } from "@trilleo/storage/server";
import { desc, isNotNull, isNull } from "drizzle-orm";
import { pairCount } from "@trilleo/skyblock";
import { STATIC_ICONS, shardData } from "./data";

export interface SkyblockOverview {
  commit: string;
  /** null: the copy committed with the site. */
  readAt: Date | null;
  datasetId: number | null;
  shards: number;
  pairs: number;
  withAttribute: number;
  iconsCommitted: number;
  iconsCopied: number;
  iconsFailed: { shardId: string; error: string | null; checkedAt: Date }[];
  /** Shards with no icon at all (pages show their rarity's letter). */
  withoutIcon: string[];
  syncs: SbSync[];
  /** SkyShards' calculator files changed since the rules were ported (the last pass). */
  rulesChanged: string[];
}

export async function skyblockOverview(
  db: Database,
  storage: StorageDriver | null,
): Promise<SkyblockOverview> {
  const data = await shardData(db, storage);
  const copied = await db
    .select({ shardId: sbIcons.shardId })
    .from(sbIcons)
    .where(isNotNull(sbIcons.key));
  const failed = await db
    .select({
      shardId: sbIcons.shardId,
      error: sbIcons.error,
      checkedAt: sbIcons.checkedAt,
    })
    .from(sbIcons)
    .where(isNull(sbIcons.key));
  const syncs = await db
    .select()
    .from(sbSyncs)
    .orderBy(desc(sbSyncs.id))
    .limit(10);
  const { catalog } = data;
  return {
    commit: data.commit,
    readAt: data.readAt,
    datasetId: data.datasetId,
    shards: catalog.shards.length,
    pairs: pairCount(catalog.dataset),
    withAttribute: catalog.shards.filter((shard) => shard.attribute).length,
    iconsCommitted: Object.keys(STATIC_ICONS).length,
    iconsCopied: copied.length,
    iconsFailed: failed,
    withoutIcon: catalog.shards
      .filter((shard) => !data.icons.has(shard.id))
      .map((shard) => shard.name),
    syncs,
    rulesChanged:
      syncs.find((sync) => sync.finishedAt && sync.summary?.commit)?.summary
        ?.rulesChanged ?? [],
  };
}
