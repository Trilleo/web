/**
 * A chart is a song at one difficulty. World's End charts are separate songs in
 * SEGA's list (their own IDs, from 8000), each with one chart: a kanji for its kind
 * of gimmick and 1–5 stars instead of a number.
 */
export const DIFFICULTIES = [
  "basic",
  "advanced",
  "expert",
  "master",
  "ultima",
  "worldsend",
] as const;
export type Difficulty = (typeof DIFFICULTIES)[number];

export const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  basic: "Basic",
  advanced: "Advanced",
  expert: "Expert",
  master: "Master",
  ultima: "Ultima",
  worldsend: "World’s End",
};

export function isDifficulty(value: string): value is Difficulty {
  return (DIFFICULTIES as readonly string[]).includes(value);
}

/** Levels as the game shows them: "1" to "15", with "+" from 7 up ("14+"). */
const LEVEL = /^(?:[1-9]|1[0-5])\+?$/;

export function isLevel(value: string): boolean {
  return LEVEL.test(value);
}

/**
 * Chart constants (the internal level behind "14+", e.g. 14.7) are kept in tenths, as
 * integers, so they compare and sort exactly: 147 is 14.7.
 */
export function parseConstant(text: string): number | null {
  const match = /^\s*(\d{1,2})(?:\.(\d))?\s*$/.exec(text);
  if (!match) return null;
  const tenths = Number(match[1]) * 10 + Number(match[2] ?? "0");
  return tenths >= 10 && tenths <= 159 ? tenths : null;
}

export function formatConstant(tenths: number): string {
  return (tenths / 10).toFixed(1);
}

/**
 * SEGA's list gives World's End difficulty as 1, 3, 5, 7 or 9; the game (and sdvx.in)
 * show 1–5 stars.
 */
export function worldsEndStars(value: string): number | null {
  const n = Number(value);
  if (!Number.isInteger(n) || n < 1 || n > 9 || n % 2 === 0) return null;
  return (n + 1) / 2;
}
