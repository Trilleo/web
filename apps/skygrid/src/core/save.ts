/**
 * Reading saves back: a save may be old, hand-edited or broken. `parseSave` returns
 * a state the engine can trust, or null. The server will use it on imported saves.
 */
import { playerStats } from "./engine";
import {
  ITEMS,
  MINION_KINDS,
  MINION_STORAGE,
  MINION_TIERS,
  isItem,
} from "./content/items";
import { LEVEL_XP } from "./content/progression";
import { ISLAND_MAPS, isWalkable, charAt } from "./content/islands";
import {
  GEAR_SLOTS,
  ISLANDS,
  SKILLS,
  type Action,
  type Dir,
  type GameState,
  type GearSlot,
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

function parseEquipment(value: unknown): GameState["equipment"] | null {
  if (value === undefined) return {};
  if (!isRecord(value)) return null;
  const equipment: GameState["equipment"] = {};
  for (const [slot, item] of Object.entries(value)) {
    if (!GEAR_SLOTS.includes(slot as GearSlot) || typeof item !== "string") {
      return null;
    }
    if (ITEMS[item]?.gear?.slot !== slot) return null;
    equipment[slot] = item;
  }
  return equipment;
}

function parseMobs(value: unknown): GameState["mobs"] | null {
  if (value === undefined) return {};
  if (!isRecord(value)) return null;
  const mobs: GameState["mobs"] = {};
  for (const [id, wounded] of Object.entries(value)) {
    if (!isIsland(id) || !isRecord(wounded)) return null;
    const kept: Record<string, { hp: number; at: number }> = {};
    for (const [key, mob] of Object.entries(wounded)) {
      if (!/^\d+,\d+$/.test(key) || !isRecord(mob)) return null;
      if (!isCount(mob.hp) || !isTime(mob.at)) return null;
      kept[key] = { hp: mob.hp, at: mob.at };
    }
    mobs[id] = kept;
  }
  return mobs;
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

  const equipment = parseEquipment(value.equipment);
  const mobs = parseMobs(value.mobs);
  if (!equipment || !mobs) return null;

  const state: GameState = {
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
      combat: skills.combat ?? 0,
    },
    collections,
    minions,
    depleted,
    fishing,
    health: 0,
    equipment,
    mobs,
  };
  // Saves from before combat have no health: they start at full.
  const max = playerStats(state).health;
  state.health =
    typeof value.health === "number" && Number.isFinite(value.health)
      ? Math.min(Math.max(value.health, 1), max)
      : max;
  return state;
}

const DIR_VALUES = new Set(["U", "D", "L", "R"]);

function isInt(value: unknown): value is number {
  return Number.isSafeInteger(value);
}

/** One action as the client sent it, or null if it isn't one. */
function parseAction(value: unknown): Action | null {
  if (!isRecord(value) || !isTime(value.t)) return null;
  const { t } = value;
  switch (value.k) {
    case "move":
      return typeof value.d === "string" && DIR_VALUES.has(value.d)
        ? { t, k: "move", d: value.d as Dir }
        : null;
    case "gather":
    case "attack":
    case "cast":
      return isInt(value.x) && isInt(value.y)
        ? { t, k: value.k, x: value.x, y: value.y }
        : null;
    case "reel":
      return { t, k: "reel" };
    case "equip":
      return typeof value.item === "string"
        ? { t, k: "equip", item: value.item }
        : null;
    case "unequip":
      return typeof value.slot === "string" &&
        GEAR_SLOTS.includes(value.slot as GearSlot)
        ? { t, k: "unequip", slot: value.slot as GearSlot }
        : null;
    case "craft":
      return typeof value.recipe === "string" && isInt(value.times)
        ? { t, k: "craft", recipe: value.recipe, times: value.times }
        : null;
    case "sell":
    case "buy":
      return typeof value.item === "string" && isInt(value.n)
        ? { t, k: value.k, item: value.item, n: value.n }
        : null;
    case "place":
      return isInt(value.slot) && typeof value.item === "string"
        ? { t, k: "place", slot: value.slot, item: value.item }
        : null;
    case "collect":
    case "pickup":
      return isInt(value.slot) ? { t, k: value.k, slot: value.slot } : null;
    default:
      return null;
  }
}

/** A batch of actions from the client, or null if any of them isn't one. */
export function parseActions(value: unknown, max: number): Action[] | null {
  if (!Array.isArray(value) || value.length > max) return null;
  const actions: Action[] = [];
  for (const item of value) {
    const action = parseAction(item);
    if (!action) return null;
    actions.push(action);
  }
  return actions;
}

/**
 * Limits for a browser save moving into an account. It was played where nobody
 * could check it, so it keeps its shape but not unlimited riches.
 */
export const IMPORT_LIMITS = {
  coins: 100_000,
  /** Per skill: the XP of this level. */
  level: 15,
  /** Per item, in the bag and in each collection. */
  items: 10_000,
  collection: 50_000,
} as const;

function capCounts(
  counts: Record<string, number>,
  max: number,
): Record<string, number> {
  return Object.fromEntries(
    Object.entries(counts).map(([key, n]) => [key, Math.min(n, max)]),
  );
}

/**
 * A browser save made ready for an account: capped, with the server's clock and
 * seed, and nothing half-done (gathering, fishing, regrowing nodes).
 */
export function prepareImport(
  state: GameState,
  now: number,
  seed: number,
): GameState {
  const maxXp = LEVEL_XP[IMPORT_LIMITS.level] ?? 0;
  const imported: GameState = {
    ...state,
    seed: seed | 0,
    now,
    createdAt: Math.min(state.createdAt, now),
    coins: Math.min(state.coins, IMPORT_LIMITS.coins),
    busyUntil: 0,
    lastMoveAt: 0,
    inventory: capCounts(state.inventory, IMPORT_LIMITS.items),
    collections: capCounts(state.collections, IMPORT_LIMITS.collection),
    skills: {
      farming: Math.min(state.skills.farming, maxXp),
      mining: Math.min(state.skills.mining, maxXp),
      foraging: Math.min(state.skills.foraging, maxXp),
      fishing: Math.min(state.skills.fishing, maxXp),
      combat: Math.min(state.skills.combat, maxXp),
    },
    minions: state.minions.map((minion) =>
      minion
        ? {
            ...minion,
            stored: Math.min(
              minion.stored,
              MINION_STORAGE[minion.tier - 1] ?? 0,
            ),
            lastAt: now,
          }
        : null,
    ),
    depleted: {},
    fishing: null,
    mobs: {},
    health: 0,
  };
  return { ...imported, health: playerStats(imported).health };
}

/** Totals kept beside a save for leaderboards: all skill XP. */
export function totalSkillXp(state: GameState): number {
  return SKILLS.reduce((sum, skill) => sum + state.skills[skill], 0);
}
