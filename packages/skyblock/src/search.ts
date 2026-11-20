/**
 * The shard list in the browser: a light summary of each shard (what the list shows
 * and searches) and the search itself: by name first, then the attribute's name, then
 * its text and how to hunt it; filtered by rarity, category, family and skill.
 */
import type { ShardRecord } from "./dataset";
import { rarityRank, type Rarity } from "./rarity";
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

/**
 * The shards that pass the filters and match the words: best matches first, and
 * among equals (or with no words) by rarity, then name.
 */
export function searchShards(
  shards: readonly ShardSummary[],
  filters: ShardFilters,
): ShardSummary[] {
  const scored: { shard: ShardSummary; score: number }[] = [];
  for (const shard of shards) {
    if (filters.rarity && shard.rarity !== filters.rarity) continue;
    if (filters.category && shard.category !== filters.category) continue;
    if (filters.family && !shard.families.includes(filters.family)) continue;
    if (filters.skill && shard.skill !== filters.skill) continue;
    const score = matchScore(shard, filters.query ?? "");
    if (score > 0) scored.push({ shard, score });
  }
  return scored
    .sort(
      (a, b) =>
        b.score - a.score ||
        rarityRank(a.shard.rarity) - rarityRank(b.shard.rarity) ||
        a.shard.name.localeCompare(b.shard.name),
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
