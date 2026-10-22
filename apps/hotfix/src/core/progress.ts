import { FPS } from "./content";
import { metres, score } from "./engine";
import type { Input, LoggedInput, RunState } from "./types";

/*
 * What lasts beyond a run: the Daily Run's seed, what the server accepts as a run's
 * record, achievements and the accessories they unlock. Pure, shared by the browser
 * and the server (which decides; the browser only shows).
 */

export type RunMode = "endless" | "daily";

export const RUN_MODES: readonly RunMode[] = ["endless", "daily"];

export function isRunMode(value: unknown): value is RunMode {
  return value === "endless" || value === "daily";
}

/** A UTC day as YYYY-MM-DD. */
export function dayOf(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

export function isDay(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    dayOf(Date.parse(`${value}T00:00:00Z`)) === value
  );
}

/** The day before, as YYYY-MM-DD. */
export function previousDay(day: string): string {
  return dayOf(Date.parse(`${day}T00:00:00Z`) - 86_400_000);
}

/** The Daily Run's course: the same for everyone on a UTC day (FNV-1a of the day). */
export function dailySeed(day: string): number {
  let hash = 0x811c9dc5;
  for (const char of `hotfix:${day}`) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/** The longest run the server will replay: half an hour. */
export const MAX_RUN_FRAMES = 30 * 60 * FPS;
/** Most inputs in a run (two per key press: over five presses a second for 30 minutes). */
export const MAX_INPUTS = 20_000;

const INPUTS: readonly Input[] = ["jump", "jump-end", "down", "down-end"];

/**
 * An input log as sent and stored: one number per input, the frames since the one
 * before times four plus the input's index in INPUTS. A long run stays a few KB.
 */
export function packInputs(log: readonly LoggedInput[]): number[] {
  let last = 0;
  return log.map(({ f, i }) => {
    const packed = (f - last) * 4 + INPUTS.indexOf(i);
    last = f;
    return packed;
  });
}

/**
 * A packed input log back as inputs, or null if it isn't one: whole numbers, at
 * most MAX_INPUTS, within MAX_RUN_FRAMES.
 */
export function unpackInputs(value: unknown): LoggedInput[] | null {
  if (!Array.isArray(value) || value.length > MAX_INPUTS) return null;
  const inputs: LoggedInput[] = [];
  let frame = 0;
  for (const packed of value as unknown[]) {
    if (
      typeof packed !== "number" ||
      !Number.isSafeInteger(packed) ||
      packed < 0
    ) {
      return null;
    }
    frame += Math.floor(packed / 4);
    const input = INPUTS[packed % 4];
    if (!input || frame > MAX_RUN_FRAMES) return null;
    inputs.push({ f: frame, i: input });
  }
  return inputs;
}

/** What a finished run comes to. */
export interface RunResult {
  score: number;
  metres: number;
  tokens: number;
  frames: number;
}

export function resultOf(run: RunState): RunResult {
  return {
    score: score(run),
    metres: metres(run),
    tokens: run.tokens,
    frames: run.frame,
  };
}

/** Someone's lasting numbers, as the server keeps them. */
export interface Totals {
  runs: number;
  tokens: number;
  furthest: number;
  /** Different days they've played the Daily Run on. */
  dailyDays: number;
}

export type AccessoryId =
  "cap" | "antenna" | "headphones" | "halo" | "party-hat" | "crown";

export interface Achievement {
  id: string;
  name: string;
  /** How to earn it. */
  goal: string;
  unlocks?: AccessoryId;
  /** Whether this run (and the totals after it) earns it. */
  earned: (run: RunState, totals: Totals) => boolean;
}

export const ACHIEVEMENTS: readonly Achievement[] = [
  {
    id: "hello-world",
    name: "Hello, world",
    goal: "Finish a run.",
    unlocks: "cap",
    earned: () => true,
  },
  {
    id: "server-room",
    name: "Down the aisles",
    goal: "Reach the server room (1000 m).",
    unlocks: "antenna",
    earned: (run) => metres(run) >= 1000,
  },
  {
    id: "cloud",
    name: "Head in the cloud",
    goal: "Reach the cloud (2000 m).",
    earned: (run) => metres(run) >= 2000,
  },
  {
    id: "ship-it",
    name: "Ship it",
    goal: "Reach production (3000 m).",
    unlocks: "crown",
    earned: (run) => metres(run) >= 3000,
  },
  {
    id: "lts",
    name: "Long-term support",
    goal: "Run 5000 m.",
    earned: (run) => metres(run) >= 5000,
  },
  {
    id: "token-economy",
    name: "Token economy",
    goal: "Pick up 50 tokens in one run.",
    unlocks: "party-hat",
    earned: (run) => run.tokens >= 50,
  },
  {
    id: "frugal",
    name: "Frugal",
    goal: "Run 1000 m without a single token.",
    earned: (run) => run.tokens === 0 && metres(run) >= 1000,
  },
  {
    id: "air-time",
    name: "Air time",
    goal: "Double jump 25 times in one run.",
    unlocks: "headphones",
    earned: (run) => run.stats.doubleJumps >= 25,
  },
  {
    id: "saved",
    name: "Saved by the shield",
    goal: "Let a context shield take a hit.",
    unlocks: "halo",
    earned: (run) => run.stats.shields > 0,
  },
  {
    id: "power-user",
    name: "Power user",
    goal: "Pick up three power-ups in one run.",
    earned: (run) => run.stats.powers >= 3,
  },
  {
    id: "daily-driver",
    name: "Daily driver",
    goal: "Play the Daily Run on three different days.",
    earned: (_run, totals) => totals.dailyDays >= 3,
  },
  {
    id: "veteran",
    name: "Veteran",
    goal: "Finish 100 runs.",
    earned: (_run, totals) => totals.runs >= 100,
  },
];

export function findAchievement(id: string): Achievement | undefined {
  return ACHIEVEMENTS.find((achievement) => achievement.id === id);
}

/** What this run newly earns, in the list's order. */
export function newlyEarned(
  run: RunState,
  totals: Totals,
  had: readonly string[],
): string[] {
  return ACHIEVEMENTS.filter(
    (achievement) =>
      !had.includes(achievement.id) && achievement.earned(run, totals),
  ).map((achievement) => achievement.id);
}

export interface Accessory {
  id: AccessoryId;
  name: string;
}

export const ACCESSORIES: readonly Accessory[] = [
  { id: "cap", name: "Cap" },
  { id: "antenna", name: "Antenna" },
  { id: "headphones", name: "Headphones" },
  { id: "halo", name: "Halo" },
  { id: "party-hat", name: "Party hat" },
  { id: "crown", name: "Crown" },
];

export function isAccessory(value: unknown): value is AccessoryId {
  return ACCESSORIES.some((accessory) => accessory.id === value);
}

/** Accessories these achievements unlock. */
export function unlockedAccessories(
  achievements: readonly string[],
): AccessoryId[] {
  return ACHIEVEMENTS.flatMap((achievement) =>
    achievement.unlocks && achievements.includes(achievement.id)
      ? [achievement.unlocks]
      : [],
  );
}

/** Which achievement unlocks an accessory. */
export function unlockedBy(accessory: AccessoryId): Achievement | undefined {
  return ACHIEVEMENTS.find((achievement) => achievement.unlocks === accessory);
}
