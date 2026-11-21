import { isSavedValue } from "@trilleo/skyblock/calc";
import type { ToolMeta } from "@trilleo/tool-kit";

/** Kept separate from the app, so the server can read it without loading React. */
export const meta: ToolMeta = {
  slug: "skyblock",
  name: "Hypixel SkyBlock",
  description:
    "Utilities for Hypixel SkyBlock: every shard and its fusions, a calculator for the fastest or cheapest way to make one, and Bazaar profits.",
  status: "in-progress",
  icon: "skyblock",
  // The fusion calculator's setup, chosen recipes and checklist (tool data).
  isValidValue: isSavedValue,
};

/** Where the tool's pages live. */
export const SKYBLOCK_PATH = "/tools/skyblock/";
export const SHARDS_PATH = "/tools/skyblock/shards/";
export const CALCULATOR_PATH = "/tools/skyblock/calculator/";
export const PROFITS_PATH = "/tools/skyblock/profits/";

/** The calculator, opened on a shard. */
export function calculatorPath(slug: string, quantity?: number): string {
  return `${CALCULATOR_PATH}?shard=${encodeURIComponent(slug)}${quantity ? `&qty=${String(quantity)}` : ""}`;
}

export function shardPath(slug: string): string {
  return `${SHARDS_PATH}${slug}/`;
}

export interface Utility {
  name: string;
  description: string;
  /** null: planned, not built yet. */
  href: string | null;
}

/** The tool's utilities, as its front page lists them. */
export const UTILITIES: readonly Utility[] = [
  {
    name: "Shards",
    description:
      "Every shard: its attribute and what each level costs, where to hunt it, and every fusion it's made by or goes into.",
    href: SHARDS_PATH,
  },
  {
    name: "Fusion calculator",
    description:
      "The fastest way to make any shard: from your fortune, attribute levels and hunting rates, as a tree, a checklist and for your mods.",
    href: CALCULATOR_PATH,
  },
  {
    name: "Fusion profits",
    description:
      "Fusions that sell for more on the Bazaar than their shards cost, and the shards whose prices moved most.",
    href: PROFITS_PATH,
  },
  {
    name: "Collection",
    description:
      "The shards you own and your attribute levels, with what's left to max.",
    href: null,
  },
  {
    name: "Hunting planner",
    description:
      "Several shards at once: one list of what to hunt, where, and for how long.",
    href: null,
  },
];
