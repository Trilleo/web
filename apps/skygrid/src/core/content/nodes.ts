import type { SkillId } from "../types";
import type { ResourceId, ToolType } from "./items";

/** Something on the map you can gather from: a crop, a tree, an ore. */
export interface NodeDef {
  item: ResourceId;
  skill: SkillId;
  /** The tool that works it. Pickaxes are required; the others only help. */
  tool: ToolType;
  /** The tool tier it needs (0: bare hands work, slowly). */
  tier: number;
  /** Skill level needed. */
  level: number;
  /** Milliseconds to gather with a speed-1 tool. */
  ms: number;
  /** Milliseconds until it grows back. */
  respawn: number;
  xp: number;
}

/** Keyed by the map character. */
export const NODES: Readonly<Record<string, NodeDef>> = {
  '"': {
    item: "wheat",
    skill: "farming",
    tool: "hoe",
    tier: 0,
    level: 0,
    ms: 500,
    respawn: 5000,
    xp: 3,
  },
  v: {
    item: "carrot",
    skill: "farming",
    tool: "hoe",
    tier: 0,
    level: 2,
    ms: 550,
    respawn: 5000,
    xp: 4,
  },
  o: {
    item: "pumpkin",
    skill: "farming",
    tool: "hoe",
    tier: 0,
    level: 5,
    ms: 800,
    respawn: 7000,
    xp: 8,
  },
  T: {
    item: "oak_log",
    skill: "foraging",
    tool: "axe",
    tier: 0,
    level: 0,
    ms: 1600,
    respawn: 10000,
    xp: 6,
  },
  Y: {
    item: "birch_log",
    skill: "foraging",
    tool: "axe",
    tier: 1,
    level: 3,
    ms: 1800,
    respawn: 11000,
    xp: 8,
  },
  A: {
    item: "spruce_log",
    skill: "foraging",
    tool: "axe",
    tier: 2,
    level: 6,
    ms: 2200,
    respawn: 12000,
    xp: 12,
  },
  "*": {
    item: "cobblestone",
    skill: "mining",
    tool: "pickaxe",
    tier: 1,
    level: 0,
    ms: 900,
    respawn: 4000,
    xp: 1,
  },
  "%": {
    item: "coal",
    skill: "mining",
    tool: "pickaxe",
    tier: 1,
    level: 1,
    ms: 1300,
    respawn: 6000,
    xp: 5,
  },
  "=": {
    item: "iron",
    skill: "mining",
    tool: "pickaxe",
    tier: 2,
    level: 4,
    ms: 1900,
    respawn: 9000,
    xp: 9,
  },
  $: {
    item: "gold",
    skill: "mining",
    tool: "pickaxe",
    tier: 3,
    level: 8,
    ms: 2500,
    respawn: 14000,
    xp: 14,
  },
};

/** Bare hands, for nodes that allow them: slow on trees, fine on crops. */
export const HAND_SPEED: Readonly<Record<ToolType, number>> = {
  axe: 0.5,
  hoe: 1,
  pickaxe: 0,
  rod: 0,
};

/** What bites, by weight, from which Fishing level. */
export const CATCHES: readonly {
  item: ResourceId;
  weight: number;
  level: number;
  xp: number;
}[] = [
  { item: "raw_fish", weight: 60, level: 0, xp: 15 },
  { item: "salmon", weight: 25, level: 3, xp: 25 },
  { item: "pufferfish", weight: 12, level: 6, xp: 35 },
  { item: "prismarine", weight: 9, level: 9, xp: 30 },
  { item: "sponge", weight: 2, level: 0, xp: 60 },
];

/** Reel in within this long of the bite. */
export const REEL_WINDOW_MS = 1500;
/** Bites come this long after the cast, plus up to BITE_SPREAD_MS (divided by the rod's speed). */
export const BITE_MIN_MS = 2500;
export const BITE_SPREAD_MS = 4500;
