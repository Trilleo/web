import type { ToolMeta } from "@trilleo/tool-kit";

/** Kept separate from the app, so the server can read it without loading React. */
export const meta: ToolMeta = {
  slug: "skyblock",
  name: "Hypixel SkyBlock",
  description:
    "Utilities for Hypixel SkyBlock: every shard with its attribute, where to hunt it and what it fuses from and into.",
  status: "in-progress",
  icon: "skyblock",
};

/** Where the tool's pages live. */
export const SKYBLOCK_PATH = "/tools/skyblock/";
export const SHARDS_PATH = "/tools/skyblock/shards/";

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
      "The fastest way to fuse a shard, from your hunting rates, fortune and attribute levels.",
    href: null,
  },
  {
    name: "Fusion profits",
    description:
      "Fusions that sell for more on the Bazaar than their shards cost.",
    href: null,
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
