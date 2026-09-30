import type { ItemId, SkillId } from "../types";

export type ToolType = "axe" | "pickaxe" | "hoe" | "rod";

export interface ToolStats {
  type: ToolType;
  /** Which nodes it can work: a node's `tier` must not be higher. */
  tier: number;
  /** Gathering speed: times are divided by it. */
  speed: number;
  /** Extra drops, in percent (100 = one more on average). */
  fortune: number;
}

export interface ItemDef {
  name: string;
  kind: "resource" | "enchanted" | "tool" | "minion";
  /** What the merchant pays for one. 0: not sellable. */
  price: number;
  tool?: ToolStats;
  minion?: { kind: ItemId; tier: number };
}

export interface ResourceDef {
  name: string;
  price: number;
  skill: SkillId;
  /** Seconds between items for a tier I minion; omitted: no minion. */
  minionSeconds?: number;
}

/** Everything that can be gathered, in collection order. */
export const RESOURCES = {
  wheat: { name: "Wheat", price: 2, skill: "farming", minionSeconds: 30 },
  carrot: { name: "Carrot", price: 2, skill: "farming", minionSeconds: 30 },
  pumpkin: { name: "Pumpkin", price: 5, skill: "farming", minionSeconds: 40 },
  cobblestone: {
    name: "Cobblestone",
    price: 1,
    skill: "mining",
    minionSeconds: 28,
  },
  coal: { name: "Coal", price: 3, skill: "mining", minionSeconds: 36 },
  iron: { name: "Iron", price: 4, skill: "mining", minionSeconds: 42 },
  gold: { name: "Gold", price: 6, skill: "mining", minionSeconds: 48 },
  oak_log: { name: "Oak Log", price: 3, skill: "foraging", minionSeconds: 48 },
  birch_log: {
    name: "Birch Log",
    price: 4,
    skill: "foraging",
    minionSeconds: 48,
  },
  spruce_log: {
    name: "Spruce Log",
    price: 5,
    skill: "foraging",
    minionSeconds: 52,
  },
  raw_fish: { name: "Raw Fish", price: 6, skill: "fishing", minionSeconds: 60 },
  salmon: { name: "Salmon", price: 10, skill: "fishing" },
  pufferfish: { name: "Pufferfish", price: 15, skill: "fishing" },
  prismarine: { name: "Prismarine Shard", price: 12, skill: "fishing" },
  sponge: { name: "Sponge", price: 40, skill: "fishing" },
} as const satisfies Record<string, ResourceDef>;

export type ResourceId = keyof typeof RESOURCES;

export const RESOURCE_IDS = Object.keys(RESOURCES) as ResourceId[];

/** One enchanted item is this many of the plain one. */
export const ENCHANT_COST = 160;

export const MINION_TIERS = 5;

/** Tier I–V: seconds are multiplied by these… */
export const MINION_SPEED = [1, 0.9, 0.8, 0.7, 0.6] as const;
/** …and a minion holds this many before it stops. */
export const MINION_STORAGE = [384, 512, 640, 768, 960] as const;

const ROMAN = ["I", "II", "III", "IV", "V"] as const;

export function romanTier(tier: number): string {
  return ROMAN[tier - 1] ?? String(tier);
}

export function enchantedId(resource: ItemId): ItemId {
  return `enchanted_${resource}`;
}

export function minionId(resource: ItemId, tier: number): ItemId {
  return `${resource}_minion_${String(tier)}`;
}

/** Resources that have minions. */
export const MINION_KINDS = RESOURCE_IDS.filter(
  (id) => "minionSeconds" in RESOURCES[id],
);

const TOOLS: Record<string, { name: string; price: number; tool: ToolStats }> =
  {
    wooden_axe: {
      name: "Wooden Axe",
      price: 5,
      tool: { type: "axe", tier: 1, speed: 1, fortune: 0 },
    },
    stone_axe: {
      name: "Stone Axe",
      price: 20,
      tool: { type: "axe", tier: 2, speed: 1.4, fortune: 5 },
    },
    iron_axe: {
      name: "Iron Axe",
      price: 80,
      tool: { type: "axe", tier: 3, speed: 1.9, fortune: 15 },
    },
    wooden_pickaxe: {
      name: "Wooden Pickaxe",
      price: 5,
      tool: { type: "pickaxe", tier: 1, speed: 1, fortune: 0 },
    },
    stone_pickaxe: {
      name: "Stone Pickaxe",
      price: 20,
      tool: { type: "pickaxe", tier: 2, speed: 1.4, fortune: 5 },
    },
    iron_pickaxe: {
      name: "Iron Pickaxe",
      price: 80,
      tool: { type: "pickaxe", tier: 3, speed: 1.9, fortune: 15 },
    },
    wooden_hoe: {
      name: "Wooden Hoe",
      price: 4,
      tool: { type: "hoe", tier: 1, speed: 1.2, fortune: 10 },
    },
    stone_hoe: {
      name: "Stone Hoe",
      price: 15,
      tool: { type: "hoe", tier: 2, speed: 1.4, fortune: 25 },
    },
    iron_hoe: {
      name: "Iron Hoe",
      price: 60,
      tool: { type: "hoe", tier: 3, speed: 1.6, fortune: 45 },
    },
    fishing_rod: {
      name: "Fishing Rod",
      price: 10,
      tool: { type: "rod", tier: 1, speed: 1, fortune: 0 },
    },
    prismarine_rod: {
      name: "Prismarine Rod",
      price: 150,
      tool: { type: "rod", tier: 2, speed: 1.5, fortune: 20 },
    },
  };

function buildItems(): Record<ItemId, ItemDef> {
  const items: Record<ItemId, ItemDef> = {};
  for (const id of RESOURCE_IDS) {
    const resource: ResourceDef = RESOURCES[id];
    items[id] = {
      name: resource.name,
      kind: "resource",
      price: resource.price,
    };
    items[enchantedId(id)] = {
      name: `Enchanted ${resource.name}`,
      kind: "enchanted",
      price: resource.price * ENCHANT_COST,
    };
  }
  for (const [id, tool] of Object.entries(TOOLS)) {
    items[id] = { kind: "tool", ...tool };
  }
  for (const kind of MINION_KINDS) {
    for (let tier = 1; tier <= MINION_TIERS; tier++) {
      items[minionId(kind, tier)] = {
        name: `${RESOURCES[kind].name} Minion ${romanTier(tier)}`,
        kind: "minion",
        price: 0,
        minion: { kind, tier },
      };
    }
  }
  return items;
}

export const ITEMS: Readonly<Record<ItemId, ItemDef>> = buildItems();

export function itemName(id: ItemId): string {
  return ITEMS[id]?.name ?? id;
}

export function isItem(id: string): boolean {
  return Object.hasOwn(ITEMS, id);
}

/** What the merchant sells, and for how much. */
export const SHOP: readonly { item: ItemId; price: number }[] = [
  { item: "wooden_axe", price: 25 },
  { item: "wooden_pickaxe", price: 25 },
  { item: "wooden_hoe", price: 20 },
  { item: "fishing_rod", price: 60 },
];
