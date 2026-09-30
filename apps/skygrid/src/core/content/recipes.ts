import type { ItemId } from "../types";
import {
  ENCHANT_COST,
  MINION_KINDS,
  MINION_TIERS,
  RESOURCE_IDS,
  enchantedId,
  itemName,
  minionId,
  type ResourceId,
} from "./items";

export interface Recipe {
  id: string;
  output: ItemId;
  qty: number;
  inputs: Readonly<Record<ItemId, number>>;
  /** Unlocked by reaching this collection tier; none: known from the start. */
  unlock?: { item: ResourceId; tier: number };
}

/** Collection tier that unlocks each minion tier (I–V). */
const MINION_UNLOCK = [1, 2, 4, 5, 7] as const;

function tools(): Recipe[] {
  const list: Recipe[] = [
    { id: "wooden_axe", output: "wooden_axe", qty: 1, inputs: { oak_log: 6 } },
    {
      id: "wooden_pickaxe",
      output: "wooden_pickaxe",
      qty: 1,
      inputs: { oak_log: 8 },
    },
    { id: "wooden_hoe", output: "wooden_hoe", qty: 1, inputs: { oak_log: 4 } },
    {
      id: "fishing_rod",
      output: "fishing_rod",
      qty: 1,
      inputs: { oak_log: 10, wheat: 12 },
    },
  ];
  for (const type of ["axe", "pickaxe", "hoe"] as const) {
    list.push({
      id: `stone_${type}`,
      output: `stone_${type}`,
      qty: 1,
      inputs: { oak_log: 8, cobblestone: 32 },
      unlock: { item: "cobblestone", tier: 1 },
    });
    list.push({
      id: `iron_${type}`,
      output: `iron_${type}`,
      qty: 1,
      inputs: { birch_log: 16, iron: 64 },
      unlock: { item: "iron", tier: 2 },
    });
  }
  list.push({
    id: "prismarine_rod",
    output: "prismarine_rod",
    qty: 1,
    inputs: { prismarine: 32, spruce_log: 16 },
    unlock: { item: "prismarine", tier: 1 },
  });
  return list;
}

function enchanted(): Recipe[] {
  return RESOURCE_IDS.map((item) => ({
    id: enchantedId(item),
    output: enchantedId(item),
    qty: 1,
    inputs: { [item]: ENCHANT_COST },
    unlock: { item, tier: 3 },
  }));
}

function minions(): Recipe[] {
  const list: Recipe[] = [];
  for (const kind of MINION_KINDS) {
    const costs: Record<ItemId, number>[] = [
      { [kind]: 80 },
      { [minionId(kind, 1)]: 1, [kind]: 160 },
      { [minionId(kind, 2)]: 1, [enchantedId(kind)]: 2 },
      { [minionId(kind, 3)]: 1, [enchantedId(kind)]: 8 },
      { [minionId(kind, 4)]: 1, [enchantedId(kind)]: 32 },
    ];
    for (let tier = 1; tier <= MINION_TIERS; tier++) {
      list.push({
        id: minionId(kind, tier),
        output: minionId(kind, tier),
        qty: 1,
        inputs: costs[tier - 1] ?? {},
        unlock: { item: kind, tier: MINION_UNLOCK[tier - 1] ?? 9 },
      });
    }
  }
  return list;
}

export const RECIPES: readonly Recipe[] = [
  ...tools(),
  ...enchanted(),
  ...minions(),
];

export const RECIPE_BY_ID: ReadonlyMap<string, Recipe> = new Map(
  RECIPES.map((recipe) => [recipe.id, recipe]),
);

/** Recipes a collection tier unlocks, by name, for the "unlocked" message. */
export function unlocksAt(item: ItemId, tier: number): string[] {
  return RECIPES.filter(
    (recipe) => recipe.unlock?.item === item && recipe.unlock.tier === tier,
  ).map((recipe) => itemName(recipe.output));
}
