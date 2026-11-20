/**
 * Attribute levels: every shard grants an attribute, levelled by using shards of it
 * (at the Hunting Box). How many each level takes depends on the shard's rarity;
 * level 10 is the top. Numbers from SkyShards (src/constants/attributes.ts), which
 * match the game.
 */
import type { Rarity } from "./rarity";

export const MAX_ATTRIBUTE_LEVEL = 10;

/** Shards each level takes (index 0: level 1). */
export const SHARDS_PER_LEVEL: Readonly<Record<Rarity, readonly number[]>> = {
  common: [1, 3, 5, 6, 7, 8, 10, 14, 18, 24],
  uncommon: [1, 2, 3, 4, 5, 6, 7, 8, 12, 16],
  rare: [1, 2, 3, 3, 4, 4, 5, 6, 8, 12],
  epic: [1, 1, 2, 2, 3, 3, 4, 4, 5, 7],
  legendary: [1, 1, 1, 2, 2, 2, 3, 3, 4, 5],
};

/** Shards from nothing to `level` (0–10). */
export function shardsToLevel(rarity: Rarity, level: number): number {
  const steps = SHARDS_PER_LEVEL[rarity];
  const top = Math.max(0, Math.min(MAX_ATTRIBUTE_LEVEL, Math.floor(level)));
  let total = 0;
  for (let i = 0; i < top; i++) total += steps[i] ?? 0;
  return total;
}

/** Shards to max an attribute: 96 for a Common shard, 24 for a Legendary. */
export function shardsToMax(rarity: Rarity): number {
  return shardsToLevel(rarity, MAX_ATTRIBUTE_LEVEL);
}

/** The level `count` shards reach (0–10). */
export function levelFromShards(rarity: Rarity, count: number): number {
  const steps = SHARDS_PER_LEVEL[rarity];
  let total = 0;
  for (let level = 1; level <= steps.length; level++) {
    total += steps[level - 1] ?? 0;
    if (count < total) return level - 1;
  }
  return MAX_ATTRIBUTE_LEVEL;
}
