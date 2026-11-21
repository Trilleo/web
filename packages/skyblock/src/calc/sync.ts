/**
 * A sync from the game (a mod reading someone's attribute levels and Hunting Box),
 * applied to their collection, pure. The game is the truth for what it sends: each
 * part sent ("levels", "held") either replaces that part of the collection whole, or
 * (mode "merge") only changes the shards listed, a 0 removing one. Parts not sent
 * stay as they are, and so does "keep" (only people choose that). Unknown shard IDs
 * are reported and left out, never an error: the game may have shards before the
 * site's data does.
 */
import { MAX_ATTRIBUTE_LEVEL } from "../attributes";
import type { Rarity } from "../rarity";
import { COLLECTION_LIMITS, leftToMax, type Collection } from "./collection";

export type SyncMode = "replace" | "merge";

export interface SyncInput {
  levels?: readonly { id: string; level: number }[];
  held?: readonly { id: string; count: number }[];
  mode: SyncMode;
}

export interface SyncChange {
  id: string;
  from: number;
  to: number;
}

export interface SyncResult {
  collection: Collection;
  /** Attribute levels that changed, by ID order. */
  levels: SyncChange[];
  /** Held counts that changed, by ID order. */
  held: SyncChange[];
  /** IDs sent that the site doesn't know (left out), without repeats. */
  unknownIds: string[];
}

function applyPart<T extends { id: string }>(
  current: Readonly<Record<string, number>>,
  sent: readonly T[] | undefined,
  amountOf: (entry: T) => number,
  max: number,
  mode: SyncMode,
  known: (id: string) => boolean,
  unknown: Set<string>,
): { next: Record<string, number>; changes: SyncChange[] } {
  if (sent === undefined) return { next: { ...current }, changes: [] };
  const next: Record<string, number> = mode === "replace" ? {} : { ...current };
  for (const entry of sent) {
    if (!known(entry.id)) {
      unknown.add(entry.id);
      continue;
    }
    const amount = Math.max(0, Math.min(max, Math.floor(amountOf(entry))));
    if (amount > 0) next[entry.id] = amount;
    else Reflect.deleteProperty(next, entry.id);
  }
  const ids = [
    ...new Set([...Object.keys(current), ...Object.keys(next)]),
  ].sort();
  const changes = ids
    .map((id) => ({ id, from: current[id] ?? 0, to: next[id] ?? 0 }))
    .filter((change) => change.from !== change.to);
  return { next, changes };
}

/** Applies a sync; `known` says which shard IDs the site has. */
export function applySync(
  collection: Collection,
  input: SyncInput,
  known: (id: string) => boolean,
): SyncResult {
  const unknown = new Set<string>();
  const levels = applyPart(
    collection.levels,
    input.levels,
    (entry) => entry.level,
    MAX_ATTRIBUTE_LEVEL,
    input.mode,
    known,
    unknown,
  );
  const held = applyPart(
    collection.held,
    input.held,
    (entry) => entry.count,
    COLLECTION_LIMITS.held,
    input.mode,
    known,
    unknown,
  );
  return {
    collection: {
      levels: levels.next,
      held: held.next,
      keep: [...collection.keep],
    },
    levels: levels.changes,
    held: held.changes,
    unknownIds: [...unknown],
  };
}

export interface CollectionProgress {
  /** Attributes at the top level. */
  maxed: number;
  /** All attribute levels added up. */
  levels: number;
  /** Shards still to fuse to max everything. */
  leftToMax: number;
  /** Shards there are. */
  shards: number;
}

/** How far a collection is, over every shard the site knows. */
export function collectionProgress(
  shards: readonly { id: string; rarity: Rarity }[],
  collection: Collection,
): CollectionProgress {
  let maxed = 0;
  let levels = 0;
  let left = 0;
  for (const shard of shards) {
    const level = collection.levels[shard.id] ?? 0;
    if (level >= MAX_ATTRIBUTE_LEVEL) maxed++;
    levels += level;
    left += leftToMax(shard.rarity, level);
  }
  return { maxed, levels, leftToMax: left, shards: shards.length };
}
