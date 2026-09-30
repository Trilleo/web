/**
 * Reading saves back: a save may be old, hand-edited or broken. `parseSave` returns
 * a state the engine can trust, or null. The server will use it on imported saves.
 */
import { MINION_KINDS, MINION_TIERS, isItem } from "./content/items";
import { ISLAND_MAPS, isWalkable, charAt } from "./content/islands";
import {
  ISLANDS,
  SKILLS,
  type GameState,
  type IslandId,
  type PlacedMinion,
} from "./types";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isCount(value: unknown): value is number {
  return Number.isSafeInteger(value) && (value as number) >= 0;
}

function isTime(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

function isIsland(value: unknown): value is IslandId {
  return ISLANDS.includes(value as IslandId);
}

function counts(
  value: unknown,
  known: (key: string) => boolean,
): Record<string, number> | null {
  if (!isRecord(value)) return null;
  const result: Record<string, number> = {};
  for (const [key, n] of Object.entries(value)) {
    if (!known(key) || !isCount(n)) return null;
    if (n > 0) result[key] = n;
  }
  return result;
}

function minion(value: unknown): PlacedMinion | null | undefined {
  if (value === null) return null;
  if (!isRecord(value)) return undefined;
  const { kind, tier, stored, lastAt } = value;
  if (
    typeof kind !== "string" ||
    !MINION_KINDS.includes(kind as (typeof MINION_KINDS)[number]) ||
    !Number.isInteger(tier) ||
    (tier as number) < 1 ||
    (tier as number) > MINION_TIERS ||
    !isCount(stored) ||
    !isTime(lastAt)
  ) {
    return undefined;
  }
  return { kind, tier: tier as number, stored, lastAt };
}

export function parseSave(value: unknown): GameState | null {
  if (!isRecord(value) || value.v !== 1) return null;
  const { seed, now, createdAt, coins, pos, busyUntil, lastMoveAt } = value;
  if (
    !Number.isInteger(seed) ||
    !isTime(now) ||
    !isTime(createdAt) ||
    !isCount(coins) ||
    !isTime(busyUntil) ||
    !isTime(lastMoveAt) ||
    !isRecord(pos) ||
    !isIsland(pos.island) ||
    !Number.isInteger(pos.x) ||
    !Number.isInteger(pos.y)
  ) {
    return null;
  }
  const island = ISLAND_MAPS[pos.island];
  if (!isWalkable(charAt(island, pos.x as number, pos.y as number)))
    return null;

  const inventory = counts(value.inventory, isItem);
  const collections = counts(value.collections, isItem);
  const skills = counts(value.skills, (key) => SKILLS.includes(key as never));
  if (!inventory || !collections || !skills) return null;

  const slots = ISLAND_MAPS.home.slots.length;
  if (!Array.isArray(value.minions) || value.minions.length > slots)
    return null;
  const minions: (PlacedMinion | null)[] = [];
  for (let slot = 0; slot < slots; slot++) {
    const parsed = minion(value.minions[slot] ?? null);
    if (parsed === undefined) return null;
    minions.push(parsed);
  }

  const depleted: GameState["depleted"] = {};
  if (!isRecord(value.depleted)) return null;
  for (const [id, nodes] of Object.entries(value.depleted)) {
    if (!isIsland(id) || !isRecord(nodes)) return null;
    const kept: Record<string, number> = {};
    for (const [key, until] of Object.entries(nodes)) {
      if (!/^\d+,\d+$/.test(key) || !isTime(until)) return null;
      kept[key] = until;
    }
    depleted[id] = kept;
  }

  let fishing: GameState["fishing"] = null;
  if (value.fishing !== null) {
    const f = value.fishing;
    if (
      !isRecord(f) ||
      !Number.isInteger(f.x) ||
      !Number.isInteger(f.y) ||
      !isTime(f.biteAt)
    ) {
      return null;
    }
    fishing = { x: f.x as number, y: f.y as number, biteAt: f.biteAt };
  }

  return {
    v: 1,
    seed: seed as number,
    now,
    createdAt,
    coins,
    pos: { island: pos.island, x: pos.x as number, y: pos.y as number },
    busyUntil,
    lastMoveAt,
    inventory,
    skills: {
      farming: skills.farming ?? 0,
      mining: skills.mining ?? 0,
      foraging: skills.foraging ?? 0,
      fishing: skills.fishing ?? 0,
    },
    collections,
    minions,
    depleted,
    fishing,
  };
}
