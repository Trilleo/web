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

/** The letters Hypixel's shard IDs start with, lowest rarity first (C1, U12, L6). */
export const SHARD_ID_LETTERS = "CUREL";

/** "C14" → its letter's place and number; null when it isn't a shard ID. */
export function parseShardId(
  value: string,
): { letter: number; number: number } | null {
  const match = /^([a-z])(\d{1,3})$/i.exec(value.trim());
  if (!match) return null;
  const letter = SHARD_ID_LETTERS.indexOf((match[1] ?? "").toUpperCase());
  return letter < 0 ? null : { letter, number: Number(match[2]) };
}

/**
 * Hypixel's order of shard IDs: by rarity letter, then number (C1, C2, … C10, U1, …).
 * IDs that don't parse go last, as text.
 */
export function compareShardIds(a: string, b: string): number {
  const x = parseShardId(a);
  const y = parseShardId(b);
  if (x && y) return x.letter - y.letter || x.number - y.number;
  if (x) return -1;
  if (y) return 1;
  return a.localeCompare(b);
}
