import type { ShardSummary } from "@trilleo/skyblock";

/**
 * A shard as the calculator page lists it (rendered by the server, before the data
 * loads): the list's summary, so the shard picker can search it, plus Hypixel's item
 * ID and SkyShards' default rate.
 */
export interface ShardOption extends ShardSummary {
  id: string;
  /** SkyShards' default rate (shards an hour; 0: can't be hunted). */
  rate: number;
}
