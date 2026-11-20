/**
 * A special fusion's input rules, as fusion-properties.json writes them, in words.
 * A rule is alternatives joined by "|"; each alternative is a named shard
 * ("Caiman Shard") or terms joined by "&": a rarity ("Rare", or "Rare+" for Rare or
 * above) and a category or family ("Forest", "Reptile").
 *
 *   "Common&Forest"            a Common Forest shard
 *   "Rare+&Shulker"            a Rare or rarer Shulker shard
 *   "Phanpyre Shard|Ghost Shard"  Phanpyre or Ghost
 */
import { RARITIES, RARITY_LABELS, parseRarity } from "./rarity";

export type RulePart =
  /** A shard by name ("Caiman"): pages link it. */
  | { kind: "shard"; name: string }
  /** Any shard of a kind: "a Rare or rarer Shulker shard". */
  | { kind: "any"; text: string };

const SHARD_SUFFIX = / Shard$/;

function anyText(terms: string[]): string {
  let rarity = "";
  const kinds: string[] = [];
  for (const term of terms) {
    const plus = term.endsWith("+");
    const level = parseRarity(plus ? term.slice(0, -1) : term);
    if (level) {
      const label = RARITY_LABELS[level];
      // "Legendary+" is just Legendary: nothing is rarer.
      rarity =
        plus && level !== RARITIES[RARITIES.length - 1]
          ? `${label} or rarer`
          : label;
    } else if (term) kinds.push(term);
  }
  const words = [rarity, ...kinds, "shard"].filter(Boolean).join(" ");
  return `${/^[AEIOU]/i.test(words) ? "an" : "a"} ${words}`;
}

/** A rule's alternatives, in order. An empty rule has none. */
export function ruleParts(rule: string): RulePart[] {
  return rule
    .split("|")
    .map((alternative) => alternative.trim())
    .filter(Boolean)
    .map((alternative): RulePart =>
      alternative.endsWith(" Shard") && !alternative.includes("&")
        ? { kind: "shard", name: alternative.replace(SHARD_SUFFIX, "") }
        : {
            kind: "any",
            text: anyText(alternative.split("&").map((term) => term.trim())),
          },
    );
}

/** The whole rule in words: "Phanpyre or a Crime shard". */
export function ruleText(rule: string): string {
  const parts = ruleParts(rule).map((part) =>
    part.kind === "shard" ? part.name : part.text,
  );
  if (parts.length <= 2) return parts.join(" or ");
  return `${parts.slice(0, -1).join(", ")} or ${parts[parts.length - 1] ?? ""}`;
}
