/**
 * What the public SkyBlock pages need from the shard data: the list's summaries, one
 * shard's page (its recipes resolved to shards, capped so a shard made from thousands
 * of pairs stays a readable page), share cards and sitemap entries.
 */
import {
  RARITY_LABELS,
  ruleParts,
  segmentsText,
  summarize,
  type RulePart,
  type ShardRecord,
  type ShardSummary,
} from "@trilleo/skyblock";
import type {
  CollectionShard,
  PlannerShard,
  ShardOption,
} from "@trilleo/tool-skyblock";
import { shardPath } from "@trilleo/tool-skyblock/meta";
import { CARD_META_LENGTH, truncate, type OgCard } from "../seo";
import { iconOf, type ShardData } from "./data";

/** Partners shown per group on a shard's page; the rest are counted. */
export const PARTNERS_SHOWN = 16;

/** Hypixel's notice, on every SkyBlock page (their rules for fan sites). */
/** Every SkyBlock page says this. */
export const SKYBLOCK_NOTICE =
  "Not affiliated with or endorsed by Hypixel Inc.";

/** The shard pages add whose icons and data they show. */
export const HYPIXEL_NOTICE = `${SKYBLOCK_NOTICE} Shard icons and stat symbols are Hypixel’s; shard data is from SkyShards.`;

export function shardSummaries(data: ShardData): ShardSummary[] {
  return data.catalog.shards.map((shard) =>
    summarize(shard, iconOf(data, shard)),
  );
}

/** How to hunt a shard, a line each, as plain words ("Catch with a Fishing Net."). */
export function huntLines(shard: ShardRecord): string[] {
  return (shard.attribute?.howToHunt ?? [])
    .map((line) => segmentsText(line).replace(/^[-•]\s*/, ""))
    .filter((line) => line !== "");
}

/** The Collection's list: the browser's summaries with Hypixel's IDs. */
export function collectionShards(data: ShardData): CollectionShard[] {
  return data.catalog.shards.map((shard) => ({
    ...summarize(shard, iconOf(data, shard)),
    id: shard.id,
  }));
}

/** The calculator's list: the summaries (for the shard picker) with default rates. */
export function calculatorShards(data: ShardData): ShardOption[] {
  return data.catalog.shards.map((shard) => ({
    ...summarize(shard, iconOf(data, shard)),
    id: shard.id,
    rate: shard.rate,
  }));
}

/** The planner's list: the calculator's shards with where they're hunted. */
export function plannerShards(data: ShardData): PlannerShard[] {
  return data.catalog.shards.map((shard) => ({
    ...summarize(shard, iconOf(data, shard)),
    id: shard.id,
    rate: shard.rate,
    where: huntLines(shard),
  }));
}

/** A shard as a link with its icon. */
export interface ShardLink {
  slug: string;
  name: string;
  href: string;
  icon: string | null;
  rarity: ShardRecord["rarity"];
}

export function shardLink(data: ShardData, shard: ShardRecord): ShardLink {
  return {
    slug: shard.slug,
    name: shard.name,
    href: shardPath(shard.slug),
    icon: iconOf(data, shard),
    rarity: shard.rarity,
  };
}

/** A rule's part with its shard looked up (a name we don't know stays text). */
export type RuleLink =
  { kind: "shard"; shard: ShardLink } | { kind: "text"; text: string };

export interface ShardPage {
  shard: ShardRecord;
  self: ShardLink;
  /** The special fusion's inputs, each an "or" of parts. */
  inputs: [RuleLink[], RuleLink[]] | null;
  idResult: ShardLink | null;
  chameleonResult: ShardLink[];
  idOrigin: ShardLink[];
  chameleonOrigin: ShardLink[];
  madeFrom: {
    quantity: number;
    pairs: number;
    groups: { with: ShardLink; others: ShardLink[]; more: number }[];
  }[];
  usedIn: {
    output: ShardLink;
    quantity: number;
    partners: ShardLink[];
    more: number;
  }[];
  /** Fusions it goes into, in all. */
  usedInPairs: number;
}

export function shardPage(data: ShardData, slug: string): ShardPage | null {
  const { catalog } = data;
  const shard = catalog.bySlugOf(slug);
  if (!shard) return null;
  const link = (key: string): ShardLink[] => {
    const found = catalog.get(key);
    return found ? [shardLink(data, found)] : [];
  };
  const named = (names: readonly string[]): ShardLink[] =>
    names.flatMap((name) => {
      const found = catalog.named(name);
      return found ? [shardLink(data, found)] : [];
    });
  const rule = (text: string): RuleLink[] =>
    ruleParts(text).map((part: RulePart): RuleLink => {
      if (part.kind === "any") return { kind: "text", text: part.text };
      const found = catalog.named(part.name);
      return found
        ? { kind: "shard", shard: shardLink(data, found) }
        : { kind: "text", text: part.name };
    });
  const usedIn = catalog.usedIn(shard.key);
  return {
    shard,
    self: shardLink(data, shard),
    inputs: shard.inputs
      ? [rule(shard.inputs[0]), rule(shard.inputs[1])]
      : null,
    idResult: shard.idResult ? (named([shard.idResult])[0] ?? null) : null,
    chameleonResult: named(shard.chameleonResult),
    idOrigin: named(shard.idOrigin),
    chameleonOrigin: named(shard.chameleonOrigin),
    madeFrom: catalog.madeFrom(shard.key).map((made) => ({
      quantity: made.quantity,
      pairs: made.pairs,
      groups: made.groups.flatMap((group) => {
        const withShard = link(group.with)[0];
        if (!withShard) return [];
        return [
          {
            with: withShard,
            others: group.others.slice(0, PARTNERS_SHOWN).flatMap(link),
            more: Math.max(0, group.others.length - PARTNERS_SHOWN),
          },
        ];
      }),
    })),
    usedIn: usedIn.flatMap((use) => {
      const output = link(use.output)[0];
      if (!output) return [];
      return [
        {
          output,
          quantity: use.quantity,
          partners: use.partners.slice(0, PARTNERS_SHOWN).flatMap(link),
          more: Math.max(0, use.partners.length - PARTNERS_SHOWN),
        },
      ];
    }),
    usedInPairs: usedIn.reduce((n, use) => n + use.partners.length, 0),
  };
}

/** The share card of a shard's page. */
export function shardCard(shard: ShardRecord): OgCard {
  const meta = [
    "Hypixel SkyBlock",
    `${RARITY_LABELS[shard.rarity]} shard`,
    shard.attribute?.title,
  ]
    .filter(Boolean)
    .join(" · ");
  return {
    section: "(02) Tools",
    title: shard.name,
    meta: truncate(meta, CARD_META_LENGTH),
  };
}

/**
 * Every shard's page, for /sitemap-skyblock.xml (the shard list itself is in the
 * build's sitemap, which lists server pages without parameters too).
 */
export function shardPaths(data: ShardData): string[] {
  return data.catalog.shards.map((shard) => shardPath(shard.slug));
}
