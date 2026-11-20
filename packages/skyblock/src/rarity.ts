/** Shard rarities, lowest first (fusion rules compare them: "Rare+" is Rare or above). */
export const RARITIES = [
  "common",
  "uncommon",
  "rare",
  "epic",
  "legendary",
] as const;
export type Rarity = (typeof RARITIES)[number];

export const RARITY_LABELS: Readonly<Record<Rarity, string>> = {
  common: "Common",
  uncommon: "Uncommon",
  rare: "Rare",
  epic: "Epic",
  legendary: "Legendary",
};

/**
 * Each rarity's colour in the game (its § code: white, green, blue, purple, gold), for
 * the mc-c-* classes on the game's dark panel.
 */
export const RARITY_CODES: Readonly<Record<Rarity, string>> = {
  common: "f",
  uncommon: "a",
  rare: "9",
  epic: "5",
  legendary: "6",
};

export function isRarity(value: unknown): value is Rarity {
  return (
    typeof value === "string" && (RARITIES as readonly string[]).includes(value)
  );
}

/** "Rare", "rare" → "rare"; anything else null. */
export function parseRarity(value: unknown): Rarity | null {
  if (typeof value !== "string") return null;
  const lower = value.trim().toLowerCase();
  return isRarity(lower) ? lower : null;
}

export function rarityRank(rarity: Rarity): number {
  return RARITIES.indexOf(rarity);
}
