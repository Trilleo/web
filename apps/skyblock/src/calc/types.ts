import type { Rarity } from "@trilleo/skyblock";

/** A shard as the calculator page lists it (rendered by the server, before the data loads). */
export interface ShardOption {
  id: string;
  slug: string;
  name: string;
  rarity: Rarity;
  icon: string | null;
  /** SkyShards' default rate (shards an hour; 0: can't be hunted). */
  rate: number;
}
