/**
 * The shard data the site keeps: every shard with its attribute and fusion facts, and
 * every fusion recipe, compactly (a recipe row is an output, how many it makes, and
 * its input pairs as indexes into `shards`). Made from SkyShards' files by
 * `readSources` (sources.ts), stored as one JSON value per version by the site, and
 * indexed for pages by `ShardCatalog` (catalog.ts).
 */
import type { Rarity } from "./rarity";
import type { Segment } from "./text";

export interface ShardAttribute {
  /** "Nature Elemental". */
  title: string;
  /** Hypixel's ID ("nature_elemental"). */
  id: string;
  /** What it does, with the value at level 1 and the top level. */
  description: Segment[];
  /** Where to find the shard, a line each. */
  howToHunt: Segment[][];
}

export interface ShardRecord {
  /** SkyShards' key ("C1", "L6"): what its recipes and icons are named by. */
  key: string;
  /** Hypixel's item ID ("SHARD_GROVE"). */
  id: string;
  /** Its address (/tools/skyblock/shards/<slug>/), from the name: "lizard-king". */
  slug: string;
  name: string;
  rarity: Rarity;
  /** Forest, Water or Combat. */
  category: string;
  /** "Elemental", "Reptile": some fusion rules ask for a family. */
  families: string[];
  /** The skill it's tied to ("Fishing", "Global"). */
  skill: string;
  /** Shards one fusion uses of it. */
  fuseAmount: number;
  /** It can be made by fusing (some are only hunted or bought). */
  synthesized: boolean;
  /** It takes part in chameleon fusions. */
  chameleon: boolean;
  /**
   * Its special fusion's two inputs, as rules ("Common&Forest", "Rare+",
   * "Caiman Shard"; see rules.ts), or null when it has none.
   */
  inputs: [string, string] | null;
  /** Shard names: what an ID fusion of it gives, and what chameleon fusions may. */
  idResult: string | null;
  chameleonResult: string[];
  /** Shard names whose ID or chameleon fusions give this one. */
  idOrigin: string[];
  chameleonOrigin: string[];
  /** SkyShards' default rate: shards an hour, hunted well (before fortune). */
  rate: number;
  attribute: ShardAttribute | null;
}

/** [output, quantity, a0, b0, a1, b1, …]: indexes into `shards`. */
export type RecipeRow = number[];

export interface Dataset {
  shards: ShardRecord[];
  recipes: RecipeRow[];
}

export interface Recipe {
  output: string;
  quantity: number;
  inputs: [string, string];
}

/** "Lizard King" → "lizard-king", "Soul of the Alpha" → "soul-of-the-alpha". */
export function shardSlug(name: string): string {
  return name
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Every recipe in the dataset, by shard key. */
export function* recipesOf(dataset: Dataset): Generator<Recipe> {
  for (const row of dataset.recipes) {
    const [output, quantity] = row;
    const out = output === undefined ? undefined : dataset.shards[output];
    if (!out || quantity === undefined) continue;
    for (let i = 2; i + 1 < row.length; i += 2) {
      const a = dataset.shards[row[i] ?? -1];
      const b = dataset.shards[row[i + 1] ?? -1];
      if (a && b) yield { output: out.key, quantity, inputs: [a.key, b.key] };
    }
  }
}

/** How many input pairs the dataset holds. */
export function pairCount(dataset: Dataset): number {
  let n = 0;
  for (const row of dataset.recipes) n += Math.floor((row.length - 2) / 2);
  return n;
}
