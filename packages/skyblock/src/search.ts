/**
 * The shard list in the browser: a light summary of each shard (what the list shows
 * and searches) and the search itself: an ID ("C14") first, then by name, then the
 * attribute's name, then its text and how to hunt it; filtered by rarity, category,
 * family and skill, chosen or typed (`r:legendary c:water fam:reptile s:fishing`).
 */
import type { ShardRecord } from "./dataset";
import {
  RARITY_LABELS,
  compareShardIds,
  parseShardId,
  type Rarity,
} from "./rarity";
import { segmentsText, withoutBuffedBy } from "./text";

export interface ShardSummary {
  key: string;
  slug: string;
  name: string;
  rarity: Rarity;
  category: string;
  families: string[];
  skill: string;
  /** The attribute's name ("Nature Elemental"), or "". */
  attribute: string;
  /** Its text as plain words ("Grants 2→20 Health."). */
  text: string;
  /** How to hunt it, as plain words (searched, not shown). */
  hunt: string;
  /** The icon's address, or null (the list shows the rarity's letter). */
  icon: string | null;
}

export function summarize(
  shard: ShardRecord,
  icon: string | null,
): ShardSummary {
  return {
    key: shard.key,
    slug: shard.slug,
    name: shard.name,
    rarity: shard.rarity,
    category: shard.category,
    families: shard.families,
    skill: shard.skill,
    attribute: shard.attribute?.title ?? "",
    text: shard.attribute
      ? segmentsText(withoutBuffedBy(shard.attribute.description))
      : "",
    hunt: shard.attribute
      ? shard.attribute.howToHunt
          .map((line) => segmentsText(line).replace(/^-\s*/, ""))
          .join(" ")
      : "",
    icon,
  };
}

export interface ShardFilters {
  query?: string;
  rarity?: Rarity | "";
  category?: string;
  family?: string;
  skill?: string;
}

/** Lower case, accents and punctuation gone, spaces squeezed. */
export function fold(text: string): string {
  return text
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9%.+]+/g, " ")
    .trim();
}

/** How well a shard matches the words (0: not at all; higher is better). */
export function matchScore(shard: ShardSummary, query: string): number {
  const q = fold(query);
  if (!q) return 1;
  // A shard ID ("C14") finds that shard first.
  if (parseShardId(q) && q === shard.key.toLowerCase()) return 120;
  const name = fold(shard.name);
  if (name === q) return 100;
  if (name.startsWith(q)) return 80;
  const words = q.split(" ");
  if (words.every((word) => name.includes(word))) return 60;
  const attribute = fold(shard.attribute);
  if (attribute === q) return 50;
  if (words.every((word) => attribute.includes(word))) return 40;
  const families = fold(shard.families.join(" "));
  if (words.every((word) => families.includes(word))) return 30;
  const all = fold(
    `${shard.text} ${shard.hunt} ${shard.skill} ${shard.category}`,
  );
  if (
    words.every(
      (word) =>
        all.includes(word) || attribute.includes(word) || name.includes(word),
    )
  )
    return 10;
  return 0;
}

/** What a typed filter can be called: `r:`, `rarity:`, `fam:` … */
export const QUERY_FILTERS = {
  rarity: ["r", "rarity"],
  category: ["c", "cat", "category"],
  family: ["f", "fam", "family"],
  skill: ["s", "skill"],
} as const;
export type QueryFilter = keyof typeof QUERY_FILTERS;

export interface ParsedQuery {
  /** The words left once the filters are taken out. */
  words: string;
  /** Typed filters, folded ("reptile"); a value matches the start of a word. */
  filters: Partial<Record<QueryFilter, string>>;
}

const FILTER_NAMES = new Map<string, QueryFilter>(
  Object.entries(QUERY_FILTERS).flatMap(([filter, names]) =>
    names.map((name) => [name, filter as QueryFilter] as const),
  ),
);

/**
 * Takes typed filters out of a search: `name:value` or `name:"two words"`, the name
 * one of QUERY_FILTERS'. Anything else (unknown names too) stays words.
 */
export function parseShardQuery(text: string): ParsedQuery {
  const filters: ParsedQuery["filters"] = {};
  const words = text.replace(
    /(?:^|\s)([a-z]+):(?:"([^"]*)"?|(\S*))/gi,
    (whole, name: string, quoted?: string, plain?: string) => {
      const filter = FILTER_NAMES.get(name.toLowerCase());
      const value = fold(quoted ?? plain ?? "");
      if (!filter) return whole;
      if (value) filters[filter] = value;
      return " ";
    },
  );
  return { words: words.replace(/\s+/g, " ").trim(), filters };
}

/** Whether a folded typed value names this text: the start of the text or a word in it. */
function names(value: string, text: string): boolean {
  const folded = fold(text);
  return folded.startsWith(value) || folded.includes(` ${value}`);
}

function passesTyped(
  shard: ShardSummary,
  typed: ParsedQuery["filters"],
): boolean {
  if (
    typed.rarity !== undefined &&
    !names(typed.rarity, RARITY_LABELS[shard.rarity])
  )
    return false;
  if (typed.category !== undefined && !names(typed.category, shard.category))
    return false;
  if (
    typed.family !== undefined &&
    !shard.families.some((family) => names(typed.family ?? "", family))
  )
    return false;
  if (typed.skill !== undefined && !names(typed.skill, shard.skill))
    return false;
  return true;
}

/**
 * The shards that pass the filters (chosen, and typed into the query) and match the
 * words: best matches first, and among equals (or with no words) in Hypixel's order of
 * shard IDs (C1, C2, … L48).
 */
export function searchShards<T extends ShardSummary>(
  shards: readonly T[],
  filters: ShardFilters,
): T[] {
  const { words, filters: typed } = parseShardQuery(filters.query ?? "");
  const scored: { shard: T; score: number }[] = [];
  for (const shard of shards) {
    if (filters.rarity && shard.rarity !== filters.rarity) continue;
    if (filters.category && shard.category !== filters.category) continue;
    if (filters.family && !shard.families.includes(filters.family)) continue;
    if (filters.skill && shard.skill !== filters.skill) continue;
    if (!passesTyped(shard, typed)) continue;
    const score = matchScore(shard, words);
    if (score > 0) scored.push({ shard, score });
  }
  return scored
    .sort(
      (a, b) => b.score - a.score || compareShardIds(a.shard.key, b.shard.key),
    )
    .map(({ shard }) => shard);
}

/** The values a filter can take, sorted, from the shards themselves. */
export function filterOptions(shards: readonly ShardSummary[]): {
  categories: string[];
  families: string[];
  skills: string[];
} {
  const sorted = (values: Iterable<string>) =>
    [...new Set(values)].filter(Boolean).sort((a, b) => a.localeCompare(b));
  return {
    categories: sorted(shards.map((shard) => shard.category)),
    families: sorted(shards.flatMap((shard) => shard.families)),
    skills: sorted(shards.map((shard) => shard.skill)),
  };
}
