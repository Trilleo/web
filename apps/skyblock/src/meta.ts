import { isSavedValue } from "@trilleo/skyblock/calc";
import type { ToolMeta } from "@trilleo/tool-kit";

/** Kept separate from the app, so the server can read it without loading React. */
export const meta: ToolMeta = {
  slug: "skyblock",
  name: "Hypixel SkyBlock",
  description:
    "Utilities for Hypixel SkyBlock: every shard and its fusions, a calculator and a hunting planner for the fastest or cheapest way, your collection, fusion lines and Bazaar profits.",
  status: "in-progress",
  icon: "skyblock",
  // The calculator's setup, chosen recipes and checklist, the collection and the
  // planner's list (tool data).
  isValidValue: isSavedValue,
};

/** Where the tool's pages live. */
export const SKYBLOCK_PATH = "/tools/skyblock/";
export const SHARDS_PATH = "/tools/skyblock/shards/";
export const CALCULATOR_PATH = "/tools/skyblock/calculator/";
export const PROFITS_PATH = "/tools/skyblock/profits/";
export const COLLECTION_PATH = "/tools/skyblock/collection/";
export const PLANNER_PATH = "/tools/skyblock/planner/";
export const LINES_PATH = "/tools/skyblock/lines/";
export const GUIDE_PATH = "/tools/skyblock/guide/";
export const PROFILES_PATH = "/tools/skyblock/profiles/";

/** The fusion lines page, centred on a shard. */
export function linesPath(slug: string): string {
  return `${LINES_PATH}?shard=${encodeURIComponent(slug)}`;
}

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
      "Your attribute levels and the shards you hold, with what's left to max. The calculator and planner use it.",
    href: COLLECTION_PATH,
  },
  {
    name: "Hunting planner",
    description:
      "Several shards at once, or everything left to max: one list of what to hunt and where, and every fusion in order.",
    href: PLANNER_PATH,
  },
  {
    name: "Fusion lines",
    description:
      "Where a shard's line comes from and where it leads: the fusions people actually make, drawn around any shard.",
    href: LINES_PATH,
  },
  {
    name: "Profiles",
    description:
      "One collection, setup and plan per SkyBlock profile, picked at the top of each page. Needs an account.",
    href: PROFILES_PATH,
  },
  {
    name: "Guide",
    description:
      "How shards, attributes, hunting and the three kinds of fusion work, and how to use each utility here.",
    href: GUIDE_PATH,
  },
];
