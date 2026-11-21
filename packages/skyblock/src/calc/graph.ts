/**
 * The calculator's view of the data. A Deck is what the browser downloads (shards
 * without their texts, and the compact recipe rows); a Graph is a Deck worked out for
 * one setup: every shard's effective rate and every recipe as an object.
 */
import type { Dataset, RecipeRow } from "../dataset";
import type { Rarity } from "../rarity";
import {
  BLACK_HOLE,
  CHAMELEON,
  FROG_RATE_BONUS,
  KRAKEN,
  NO_FORTUNE,
  NO_WOODEN_BAIT_RATE,
  SHINYFISH,
  WOODEN_BAIT,
  kuudraRate,
} from "./hunting";
import { buyPrice, type PriceTable } from "./prices";
import type { CalcSettings } from "./settings";

export interface DeckShard {
  key: string;
  id: string;
  slug: string;
  name: string;
  rarity: Rarity;
  /** Shards one fusion uses of it. */
  fuse: number;
  /** SkyShards' default rate (shards an hour before fortune; 0: can't be hunted). */
  rate: number;
  /** In a Reptile family: fusions using it are reptile fusions (Crocodile). */
  reptile: boolean;
  /** Its icon's address, or null. */
  icon: string | null;
}

export interface Deck {
  /** Changes whenever the data does (the server's hash of it). */
  version: string;
  commit: string;
  shards: DeckShard[];
  recipes: RecipeRow[];
}

export function deckOf(
  dataset: Dataset,
  version: string,
  commit: string,
  icon: (id: string) => string | null,
): Deck {
  return {
    version,
    commit,
    shards: dataset.shards.map((shard) => ({
      key: shard.key,
      id: shard.id,
      slug: shard.slug,
      name: shard.name,
      rarity: shard.rarity,
      fuse: shard.fuseAmount,
      rate: shard.rate,
      reptile: shard.families.includes("Reptile"),
      icon: icon(shard.id),
    })),
    recipes: dataset.recipes,
  };
}

export interface GraphRecipe {
  output: number;
  a: number;
  b: number;
  quantity: number;
  /** Either input is a reptile: Crocodile scales its output. */
  reptile: boolean;
}

export interface Graph {
  deck: Deck;
  shards: DeckShard[];
  /** Effective rate per shard index: shards an hour with this setup (0: can't). */
  rates: Float64Array;
  /** "time" or "coins": what costs are in. */
  mode: CalcSettings["mode"];
  /**
   * What one shard costs got directly, per index: hours to hunt it, or coins to buy it
   * in coin mode. Infinity: it can't be had that way.
   */
  unitCost: Float64Array;
  /** Recipes making each shard index. */
  recipes: GraphRecipe[][];
  /** Shard index by Hypixel ID. */
  index: Map<string, number>;
}

export interface Multipliers {
  tiamat: number;
  seaSerpent: number;
  crocodile: number;
  python: number;
  kingCobra: number;
  /** What each fusion adds: hours, or coins in coin mode. */
  fusionCost: number;
}

export function multipliers(settings: CalcSettings): Multipliers {
  const { levels } = settings;
  const tiamat = 1 + (5 * levels.tiamat) / 100;
  const seaSerpent = 1 + ((2 * levels.seaSerpent) / 100) * tiamat;
  return {
    tiamat,
    seaSerpent,
    crocodile: 1 + (2 * levels.crocodile) / 100,
    python: ((5 * levels.python) / 100) * seaSerpent,
    kingCobra: (levels.kingCobra / 100) * seaSerpent,
    fusionCost:
      settings.mode === "coins"
        ? settings.fusionCoins
        : settings.fusionSeconds / 3600,
  };
}

/** A shard's rate with this setup (shards an hour; 0 when it can't be hunted). */
export function effectiveRate(
  shard: DeckShard,
  settings: CalcSettings,
  mult: Multipliers = multipliers(settings),
): number {
  let rate = settings.rates[shard.id] ?? shard.rate;
  if (shard.id === KRAKEN && rate === 0 && settings.kuudraTier !== "none")
    rate = kuudraRate(
      settings.kuudraTier,
      settings.coinsPerHour,
      settings.kuudraSeconds,
    );
  if (rate > 0) {
    if (settings.noWoodenBait && WOODEN_BAIT.has(shard.id))
      rate *=
        shard.id === SHINYFISH
          ? NO_WOODEN_BAIT_RATE.shinyfish
          : NO_WOODEN_BAIT_RATE.other;
    if (!NO_FORTUNE.has(shard.id)) {
      const { levels } = settings;
      const rarityBonus = {
        common: 2 * levels.newt,
        uncommon: 2 * levels.salamander,
        rare: levels.lizardKing,
        epic: levels.leviathan,
        legendary: 0,
      }[shard.rarity];
      let fortune = settings.hunterFortune + rarityBonus;
      if (settings.frogBonus) rate *= FROG_RATE_BONUS;
      if (shard.id in BLACK_HOLE) {
        if (BLACK_HOLE[shard.id]) rate *= 1 + mult.python;
        fortune *= 1 + mult.kingCobra;
      }
      rate *= 1 + fortune / 100;
    }
  }
  if (settings.excludeChameleon && shard.id === CHAMELEON) rate = 0;
  return rate;
}

/** Recipes by output, for one Deck (shared by every setup: it doesn't depend on one). */
const recipeCache = new WeakMap<Deck, GraphRecipe[][]>();

function recipesOf(deck: Deck): GraphRecipe[][] {
  const cached = recipeCache.get(deck);
  if (cached) return cached;
  const recipes: GraphRecipe[][] = deck.shards.map(() => []);
  for (const row of deck.recipes) {
    const output = row[0] ?? -1;
    const quantity = row[1] ?? 0;
    const list = recipes[output];
    if (!list) continue;
    for (let i = 2; i + 1 < row.length; i += 2) {
      const a = row[i] ?? -1;
      const b = row[i + 1] ?? -1;
      const sa = deck.shards[a];
      const sb = deck.shards[b];
      if (!sa || !sb) continue;
      list.push({ output, a, b, quantity, reptile: sa.reptile || sb.reptile });
    }
  }
  recipeCache.set(deck, recipes);
  return recipes;
}

/**
 * A shard's price in coin mode. As in SkyShards, hunting settings don't apply (no
 * fortune or pets, and "No Chameleon" only stops hunting it: it can still be bought).
 * Infinity when it has no price.
 */
export function coinCost(
  shard: DeckShard,
  settings: CalcSettings,
  prices: PriceTable | null,
): number {
  const price = buyPrice(shard.id, settings, prices);
  return price !== null && price > 0 ? price : Infinity;
}

/** `prices`: the Bazaar's, for coin mode (null: own prices only). */
export function buildGraph(
  deck: Deck,
  settings: CalcSettings,
  prices: PriceTable | null = null,
): Graph {
  const mult = multipliers(settings);
  const rates = Float64Array.from(deck.shards, (shard) =>
    effectiveRate(shard, settings, mult),
  );
  return {
    deck,
    shards: deck.shards,
    rates,
    mode: settings.mode,
    unitCost:
      settings.mode === "coins"
        ? Float64Array.from(deck.shards, (shard) =>
            coinCost(shard, settings, prices),
          )
        : rates.map((rate) => (rate > 0 ? 1 / rate : Infinity)),
    recipes: recipesOf(deck),
    index: new Map(deck.shards.map((shard, i) => [shard.id, i])),
  };
}

/** Output of one fusion: reptile fusions are scaled by Crocodile (so may be fractional). */
export function effectiveOutput(
  recipe: GraphRecipe,
  crocodile: number,
): number {
  return recipe.reptile ? recipe.quantity * crocodile : recipe.quantity;
}

/** One shard got directly: hours to hunt it, or its price (Infinity: it can't be). */
export function directCost(graph: Graph, shard: number): number {
  return graph.unitCost[shard] ?? Infinity;
}

/** Same inputs (either order), quantity and reptile flag. */
export function sameRecipe(
  a: GraphRecipe | null | undefined,
  b: GraphRecipe | null | undefined,
): boolean {
  if (!a || !b) return !a && !b;
  const [a1, a2] = a.a <= a.b ? [a.a, a.b] : [a.b, a.a];
  const [b1, b2] = b.a <= b.b ? [b.a, b.b] : [b.b, b.a];
  return (
    a1 === b1 &&
    a2 === b2 &&
    a.quantity === b.quantity &&
    a.reptile === b.reptile
  );
}

/**
 * A solved cost, as SkyShards reads one (`minCosts.get(x) || Infinity`): missing or 0
 * counts as "can't be had". Kept on purpose: `??` would price 0 as free.
 */
export function pricedOrInfinity(value: number | undefined): number {
  return value === undefined || value === 0 || Number.isNaN(value)
    ? Infinity
    : value;
}
