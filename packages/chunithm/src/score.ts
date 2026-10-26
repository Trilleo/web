/**
 * CHUNITHM's score and play rating. A chart's notes share 1,000,000 points: a Justice
 * Critical is worth 1.01 of a note's share (so a perfect play is 1,010,000), a Justice
 * 1, an Attack 0.5 and a Miss nothing; the total is rounded down.
 *
 * Counting from the top, every judgement below Justice Critical loses part of a note:
 * a Justice 0.01, an Attack 0.51, a Miss 1.01. In hundredths of a note ("loss units")
 * that's 1, 51 and 101, which is how the budgets below are worked out exactly.
 *
 * Play rating follows the table in use since LUMINOUS/VERSE: the chart's constant plus
 * a bonus that runs from +2.15 at SSS+ down, linear between the borders, never below 0.
 * Ratings are kept in hundredths (1650 is 16.50), constants in tenths as elsewhere.
 */

export const MAX_SCORE = 1_010_000;

/** What each judgement below Justice Critical loses, in hundredths of a note. */
export const LOSS = { justice: 1, attack: 51, miss: 101 } as const;

export const RANKS = [
  { name: "SSS+", min: 1_009_000 },
  { name: "SSS", min: 1_007_500 },
  { name: "SS+", min: 1_005_000 },
  { name: "SS", min: 1_000_000 },
  { name: "S+", min: 990_000 },
  { name: "S", min: 975_000 },
  { name: "AAA", min: 950_000 },
  { name: "AA", min: 925_000 },
  { name: "A", min: 900_000 },
  { name: "BBB", min: 800_000 },
  { name: "BB", min: 700_000 },
  { name: "B", min: 600_000 },
  { name: "C", min: 500_000 },
  { name: "D", min: 0 },
] as const;

export type Rank = (typeof RANKS)[number]["name"];

export interface Judgements {
  justice: number;
  attack: number;
  miss: number;
}

/** The rank a score earns. */
export function rankOf(score: number): Rank {
  return RANKS.find((rank) => score >= rank.min)?.name ?? "D";
}

/**
 * The score for a play of a chart with `notes` notes, the rest Justice Critical; null
 * when the counts don't fit the chart.
 */
export function scoreOf(notes: number, judged: Judgements): number | null {
  const { justice, attack, miss } = judged;
  if (!validNotes(notes)) return null;
  if (![justice, attack, miss].every((n) => Number.isInteger(n) && n >= 0))
    return null;
  const critical = notes - justice - attack - miss;
  if (critical < 0) return null;
  return Math.floor(
    ((critical * 101 + justice * 100 + attack * 50) * 10_000) / notes,
  );
}

function validNotes(notes: number): boolean {
  return Number.isInteger(notes) && notes > 0;
}

/**
 * How many loss units a play may spend and still score at least `target`:
 * floor((101N − J − 51A − 101M) × 10000 / N) ≥ T  ⇔  J + 51A + 101M ≤ N(1010000 − T) / 10000.
 */
export function lossBudget(notes: number, target: number): number {
  if (!validNotes(notes) || target > MAX_SCORE) return -1;
  return Math.floor((notes * (MAX_SCORE - Math.max(0, target))) / 10_000);
}

export interface Allowance {
  /** The most Justice allowed, everything else Justice Critical. */
  justice: number;
  attack: number;
  miss: number;
}

/** The most of each judgement a play may have, alone, and still score `target`. */
export function allowance(notes: number, target: number): Allowance | null {
  const budget = lossBudget(notes, target);
  if (budget < 0) return null;
  return {
    justice: Math.min(notes, Math.floor(budget / LOSS.justice)),
    attack: Math.min(notes, Math.floor(budget / LOSS.attack)),
    miss: Math.min(notes, Math.floor(budget / LOSS.miss)),
  };
}

/**
 * With `attack` Attacks and `miss` Misses already, the most Justice still allowed for
 * `target`; null when those alone already fall short (or don't fit the chart).
 */
export function justiceLeft(
  notes: number,
  target: number,
  attack: number,
  miss: number,
): number | null {
  const budget = lossBudget(notes, target);
  if (budget < 0 || attack < 0 || miss < 0) return null;
  const left = budget - attack * LOSS.attack - miss * LOSS.miss;
  const room = notes - attack - miss;
  if (left < 0 || room < 0) return null;
  return Math.min(left, room);
}

/**
 * The play rating for a score on a chart with this constant (tenths), in hundredths,
 * rounded down as the game shows it.
 */
export function ratingOf(constant: number, score: number): number {
  const c = constant * 10;
  const s = Math.min(score, MAX_SCORE);
  let rating: number;
  if (s >= 1_009_000) rating = c + 215;
  else if (s >= 1_007_500) rating = c + 200 + Math.floor((s - 1_007_500) / 100);
  else if (s >= 1_005_000) rating = c + 150 + Math.floor((s - 1_005_000) / 50);
  else if (s >= 1_000_000) rating = c + 100 + Math.floor((s - 1_000_000) / 100);
  else if (s >= 990_000) rating = c + 60 + Math.floor((s - 990_000) / 250);
  else if (s >= 975_000) rating = c + Math.floor((s - 975_000) / 250);
  else if (s >= 925_000)
    rating = c - 300 + Math.floor(((s - 925_000) * 3) / 500);
  else if (s >= 900_000) rating = c - 500 + Math.floor((s - 900_000) / 125);
  else {
    const base = c - 500;
    if (base <= 0) return 0;
    if (s >= 800_000) rating = Math.floor((base * (s - 700_000)) / 200_000);
    else if (s >= 500_000)
      rating = Math.floor((base * (s - 500_000)) / 600_000);
    else rating = 0;
  }
  return Math.max(0, rating);
}

/** The best rating a chart can give: its constant + 2.15. */
export function maxRating(constant: number): number {
  return ratingOf(constant, MAX_SCORE);
}

/**
 * The lowest score that gives at least `rating` (hundredths) on this chart, or null
 * when even 1,010,000 doesn't. Rating never falls as the score rises, so a binary
 * search finds it.
 */
export function scoreForRating(
  constant: number,
  rating: number,
): number | null {
  if (ratingOf(constant, MAX_SCORE) < rating) return null;
  let low = 0;
  let high = MAX_SCORE;
  while (low < high) {
    const mid = Math.floor((low + high) / 2);
    if (ratingOf(constant, mid) >= rating) high = mid;
    else low = mid + 1;
  }
  return low;
}

/** "16.50" from 1650. */
export function formatRating(hundredths: number): string {
  return (hundredths / 100).toFixed(2);
}

/** Reads a rating typed as "16.5" or "16.50" into hundredths; null if it isn't one. */
export function parseRating(text: string): number | null {
  const match = /^\s*(\d{1,2})(?:\.(\d{1,2}))?\s*$/.exec(text);
  if (!match) return null;
  return Number(match[1]) * 100 + Number((match[2] ?? "0").padEnd(2, "0"));
}

/** 1009000 → "1,009,000". */
export function formatScore(score: number): string {
  return score.toLocaleString("en");
}
