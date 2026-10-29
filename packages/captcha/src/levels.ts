/**
 * How hard the check is. A route sets how many actions an hour one visitor may take
 * at each level (`steps`); recent failures and the admin's mode raise it.
 *
 * 0: no check · 1: light proof-of-work · 2: heavy proof-of-work · 3: the puzzle.
 * Without JavaScript any level above 0 is the puzzle.
 */

export const CHECK_LEVELS = [0, 1, 2, 3] as const;
export type CheckLevel = (typeof CHECK_LEVELS)[number];

export const PUZZLE_LEVEL = 3 as const;

/** Proof-of-work bits per level: about 0.1 s and 1–2 s in a phone's browser. */
export const POW_BITS: Readonly<Record<1 | 2, number>> = { 1: 16, 2: 20 };

export const CHECK_MODES = ["normal", "raised", "attack"] as const;
export type CheckMode = (typeof CHECK_MODES)[number];

export const CHECK_MODE_LABELS: Readonly<Record<CheckMode, string>> = {
  normal: "Normal",
  raised: "Raised",
  attack: "Under attack",
};

export const CHECK_MODE_DESCRIPTIONS: Readonly<Record<CheckMode, string>> = {
  normal: "Checks only visitors who send a lot.",
  raised: "Everyone does a light check; busy visitors get the puzzle sooner.",
  attack: "Everyone does the heavy check; anyone repeating gets the puzzle.",
};

export function isCheckMode(value: unknown): value is CheckMode {
  return (CHECK_MODES as readonly unknown[]).includes(value);
}

/** Failed checks in the last hour that add a level. */
export const FAILURES_TO_RAISE = 3;

export interface LevelInput {
  /** Actions this visitor took on the route in the last hour. */
  recent: number;
  /** Checks this visitor failed in the last hour (on any route). */
  failures: number;
  /** Actions an hour before levels 1, 2 and 3. */
  steps: readonly [number, number, number];
  mode: CheckMode;
}

function clamp(level: number): CheckLevel {
  return Math.max(0, Math.min(PUZZLE_LEVEL, level)) as CheckLevel;
}

/** The level the next action needs. */
export function requiredLevel(input: LevelInput): CheckLevel {
  const [light, heavy, puzzle] = input.steps;
  let level =
    input.recent < light
      ? 0
      : input.recent < heavy
        ? 1
        : input.recent < puzzle
          ? 2
          : 3;
  if (input.failures >= FAILURES_TO_RAISE) level += 1;
  if (input.mode === "raised") level = Math.max(level + 1, 1);
  if (input.mode === "attack") level = Math.max(level + 1, 2);
  return clamp(level);
}
