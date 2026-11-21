/**
 * Someone's shard collection (tool data, key "collection"): each attribute's level,
 * shards held but not yet used, and shards they'd rather keep out of plans. The
 * calculator's inventory mode and the hunting planner read it. Only shards with
 * something to say are stored, by Hypixel ID, so a save stays small and survives data
 * updates; IDs that no longer exist are ignored when read.
 */
import { MAX_ATTRIBUTE_LEVEL, shardsToLevel, shardsToMax } from "../attributes";
import type { Rarity } from "../rarity";
import type { Graph } from "./graph";
import type { Inventory } from "./inventory";
import { isShardId } from "./settings";

export interface Collection {
  /** Attribute level (1–10), by Hypixel ID; missing: 0. */
  levels: Record<string, number>;
  /** Shards held and not yet used, by Hypixel ID; missing: none. */
  held: Record<string, number>;
  /** Held shards plans mustn't use (kept for something else). */
  keep: string[];
}

export const EMPTY_COLLECTION: Collection = { levels: {}, held: {}, keep: [] };

export const COLLECTION_LIMITS = {
  /** Shards held of one kind. */
  held: 1_000_000,
  /** Entries in each part (more than there are shards). */
  entries: 600,
};

/** What the download is marked with, so a wrong file is refused rather than misread. */
export const COLLECTION_FILE_FORMAT = "trilleo-skyblock-collection";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isWhole = (value: unknown, min: number, max: number): value is number =>
  typeof value === "number" &&
  Number.isInteger(value) &&
  value >= min &&
  value <= max;

export function isCollection(value: unknown): value is Collection {
  if (!isRecord(value) || !isRecord(value.levels) || !isRecord(value.held))
    return false;
  const levels = Object.entries(value.levels);
  const held = Object.entries(value.held);
  return (
    levels.length <= COLLECTION_LIMITS.entries &&
    levels.every(
      ([id, level]) => isShardId(id) && isWhole(level, 1, MAX_ATTRIBUTE_LEVEL),
    ) &&
    held.length <= COLLECTION_LIMITS.entries &&
    held.every(
      ([id, count]) =>
        isShardId(id) && isWhole(count, 1, COLLECTION_LIMITS.held),
    ) &&
    Array.isArray(value.keep) &&
    value.keep.length <= COLLECTION_LIMITS.entries &&
    value.keep.every(isShardId) &&
    new Set(value.keep).size === value.keep.length &&
    Object.keys(value).length === 3
  );
}

/** A collection read back from storage or a file: anything broken gives an empty one. */
export function readCollection(value: unknown): Collection {
  if (isCollection(value)) return value;
  // A downloaded file: the collection wrapped with its format.
  if (isRecord(value) && value.format === COLLECTION_FILE_FORMAT) {
    const inner = { levels: value.levels, held: value.held, keep: value.keep };
    if (isCollection(inner)) return inner;
  }
  return EMPTY_COLLECTION;
}

/** The file to download: the collection, marked, with when. */
export function collectionFile(collection: Collection, at: Date): string {
  return JSON.stringify(
    {
      format: COLLECTION_FILE_FORMAT,
      version: 1,
      savedAt: at.toISOString(),
      ...collection,
    },
    null,
    2,
  );
}

/** Reads a downloaded file's text; null when it isn't one. */
export function parseCollectionFile(text: string): Collection | null {
  try {
    const value: unknown = JSON.parse(text);
    if (!isRecord(value) || value.format !== COLLECTION_FILE_FORMAT)
      return null;
    const inner = { levels: value.levels, held: value.held, keep: value.keep };
    return isCollection(inner) ? inner : null;
  } catch {
    return null;
  }
}

/** One shard changed; zeros and empties are dropped, so the save stays small. */
export function withShard(
  collection: Collection,
  id: string,
  change: { level?: number; held?: number; keep?: boolean },
): Collection {
  const without = (record: Record<string, number>) =>
    Object.fromEntries(Object.entries(record).filter(([key]) => key !== id));
  const levels =
    change.level === undefined
      ? { ...collection.levels }
      : without(collection.levels);
  const held =
    change.held === undefined
      ? { ...collection.held }
      : without(collection.held);
  let keep = collection.keep;
  if (change.level !== undefined) {
    const level = Math.max(
      0,
      Math.min(MAX_ATTRIBUTE_LEVEL, Math.floor(change.level)),
    );
    if (level > 0) levels[id] = level;
  }
  if (change.held !== undefined) {
    const count = Math.max(
      0,
      Math.min(COLLECTION_LIMITS.held, Math.floor(change.held)),
    );
    if (count > 0) held[id] = count;
  }
  if (change.keep !== undefined) {
    keep = keep.filter((other) => other !== id);
    if (change.keep) keep = [...keep, id];
  }
  return { levels, held, keep };
}

/** Held shards plans may use, by index (kept ones left out). */
export function inventoryOf(graph: Graph, collection: Collection): Inventory {
  const keep = new Set(collection.keep);
  const inventory: Inventory = new Map();
  for (const [id, count] of Object.entries(collection.held)) {
    const index = graph.index.get(id);
    if (index !== undefined && !keep.has(id) && count > 0)
      inventory.set(index, count);
  }
  return inventory;
}

/** Shards fused into each attribute so far, by index (what the engine reads levels as). */
export function fusedOf(
  graph: Graph,
  collection: Collection,
): Map<number, number> {
  const fused = new Map<number, number>();
  for (const [id, level] of Object.entries(collection.levels)) {
    const index = graph.index.get(id);
    const shard = index === undefined ? undefined : graph.shards[index];
    if (index !== undefined && shard)
      fused.set(index, shardsToLevel(shard.rarity, level));
  }
  return fused;
}

/** Shards still to fuse to max an attribute from `level`. */
export function leftToMax(rarity: Rarity, level: number): number {
  return shardsToMax(rarity) - shardsToLevel(rarity, level);
}
