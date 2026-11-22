import { isSavedValue } from "@trilleo/skyblock/calc";
import type { ToolMeta } from "@trilleo/tool-kit";

/** Kept separate from the app, so the server can read it without loading React. */
export const meta: ToolMeta = {
  slug: "skyblock",
  name: "Hypixel SkyBlock",
  description:
    "Utilities for Hypixel SkyBlock: an event timer, and for shards and attributes every shard and its fusions, a calculator and a hunting planner, your collection, fusion lines and Bazaar profits.",
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
export const EVENTS_PATH = "/tools/skyblock/events/";

/** An event's page. */
export function eventPath(slug: string): string {
  return `${EVENTS_PATH}${slug}/`;
}

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

/** The front page's sections, in order. */
export const UTILITY_GROUPS = {
  events: "Events",
  shards: "Shards & attributes",
  account: "Your data",
} as const;
export type UtilityGroup = keyof typeof UTILITY_GROUPS;

export interface Utility {
  name: string;
  group: UtilityGroup;
  description: string;
  /** null: planned, not built yet. */
  href: string | null;
}

/** The tool's utilities, as its front page lists them. */
export const UTILITIES: readonly Utility[] = [
  {
    name: "Event timer",
    group: "events",
    description:
      "What's on now and what's next: every calendar event's times, the SkyBlock date and the year ahead.",
    href: EVENTS_PATH,
  },
  {
    name: "Shards",
    group: "shards",
    description:
      "Every shard: its attribute and what each level costs, where to hunt it, and every fusion it's made by or goes into.",
    href: SHARDS_PATH,
  },
  {
    name: "Fusion calculator",
    group: "shards",
    description:
      "The fastest way to make any shard: from your fortune, attribute levels and hunting rates, as a tree, a checklist and for your mods.",
    href: CALCULATOR_PATH,
  },
  {
    name: "Fusion profits",
    group: "shards",
    description:
      "Fusions that sell for more on the Bazaar than their shards cost, and the shards whose prices moved most.",
    href: PROFITS_PATH,
  },
  {
    name: "Collection",
    group: "shards",
    description:
      "Your attribute levels and the shards you hold, with what's left to max. The calculator and planner use it.",
    href: COLLECTION_PATH,
  },
  {
    name: "Hunting planner",
    group: "shards",
    description:
      "Several shards at once, or everything left to max: one list of what to hunt and where, and every fusion in order.",
    href: PLANNER_PATH,
  },
  {
    name: "Fusion lines",
    group: "shards",
    description:
      "Where a shard's line comes from and where it leads: the fusions people actually make, drawn around any shard.",
    href: LINES_PATH,
  },
  {
    name: "Profiles",
    group: "account",
    description:
      "One set of the tools’ data per SkyBlock profile, picked at the top of each page. Needs an account.",
    href: PROFILES_PATH,
  },
  {
    name: "Shards guide",
    group: "shards",
    description:
      "How shards, attributes, hunting and the three kinds of fusion work, and how to use the shard utilities.",
    href: GUIDE_PATH,
  },
];
