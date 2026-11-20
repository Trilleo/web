/**
 * What the fusion calculator remembers for someone (tool data): their setup, their own
 * hunting rates, recipes they've chosen over the cheapest, and a fusion checklist.
 * Everything is checked by `isSavedValue`, which the server runs on every save.
 */
import {
  KUUDRA_TIERS,
  LEVEL_SHARDS,
  type KuudraTier,
  type LevelKey,
} from "./hunting";

export interface CalcSettings {
  hunterFortune: number;
  levels: Record<LevelKey, number>;
  frogBonus: boolean;
  excludeChameleon: boolean;
  noWoodenBait: boolean;
  kuudraTier: KuudraTier | "none";
  /** A Kuudra run's time in seconds; null: the tier's usual time. */
  kuudraSeconds: number | null;
  /** Coins earned an hour, to turn Kuudra keys into time; null: keys are free. */
  coinsPerHour: number | null;
  /** Seconds each fusion takes (counted in the total). */
  fusionSeconds: number;
  /** Own hunting rates (shards an hour, before fortune), by Hypixel ID. */
  rates: Record<string, number>;
}

/** A recipe chosen by hand for a shard (null: hunt it), by Hypixel IDs. */
export interface ChosenRecipe {
  shard: string;
  recipe: { inputs: [string, string]; quantity: number } | null;
}

/** Fusions ticked off for one target: each step's signature (plan.ts `stepId`). */
export interface Checklist {
  shard: string;
  quantity: number;
  done: string[];
}

export const LIMITS = {
  hunterFortune: 10_000,
  level: 10,
  kuudraSeconds: 3600,
  coinsPerHour: 1e12,
  fusionSeconds: 3600,
  /** Shards an hour. */
  rate: 1e6,
  rates: 400,
  overrides: 400,
  quantity: 100_000,
  checklistSteps: 2000,
};

export const DEFAULT_SETTINGS: CalcSettings = {
  hunterFortune: 0,
  levels: Object.fromEntries(
    LEVEL_SHARDS.map((shard) => [shard.key, 0]),
  ) as Record<LevelKey, number>,
  frogBonus: false,
  excludeChameleon: false,
  noWoodenBait: false,
  kuudraTier: "none",
  kuudraSeconds: null,
  coinsPerHour: null,
  fusionSeconds: 0,
  rates: {},
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const inRange = (value: unknown, min: number, max: number): value is number =>
  typeof value === "number" &&
  Number.isFinite(value) &&
  value >= min &&
  value <= max;

const SHARD_ID = /^SHARD_[A-Z0-9_]{1,60}$/;

export function isShardId(value: unknown): value is string {
  return typeof value === "string" && SHARD_ID.test(value);
}

export function isCalcSettings(value: unknown): value is CalcSettings {
  if (!isRecord(value) || !isRecord(value.levels) || !isRecord(value.rates))
    return false;
  const levels = value.levels;
  const rates = Object.entries(value.rates);
  return (
    inRange(value.hunterFortune, 0, LIMITS.hunterFortune) &&
    Object.keys(levels).length === LEVEL_SHARDS.length &&
    LEVEL_SHARDS.every((shard) => {
      const level = levels[shard.key];
      return inRange(level, 0, LIMITS.level) && Number.isInteger(level);
    }) &&
    typeof value.frogBonus === "boolean" &&
    typeof value.excludeChameleon === "boolean" &&
    typeof value.noWoodenBait === "boolean" &&
    (value.kuudraTier === "none" ||
      (KUUDRA_TIERS as readonly unknown[]).includes(value.kuudraTier)) &&
    (value.kuudraSeconds === null ||
      inRange(value.kuudraSeconds, 1, LIMITS.kuudraSeconds)) &&
    (value.coinsPerHour === null ||
      inRange(value.coinsPerHour, 0, LIMITS.coinsPerHour)) &&
    inRange(value.fusionSeconds, 0, LIMITS.fusionSeconds) &&
    rates.length <= LIMITS.rates &&
    rates.every(
      ([id, rate]) => isShardId(id) && inRange(rate, 0, LIMITS.rate),
    ) &&
    Object.keys(value).length === Object.keys(DEFAULT_SETTINGS).length
  );
}

export function isChosenRecipe(value: unknown): value is ChosenRecipe {
  if (!isRecord(value) || !isShardId(value.shard)) return false;
  if (value.recipe === null) return Object.keys(value).length === 2;
  if (!isRecord(value.recipe)) return false;
  const { inputs, quantity } = value.recipe;
  return (
    Array.isArray(inputs) &&
    inputs.length === 2 &&
    inputs.every(isShardId) &&
    inRange(quantity, 1, 64) &&
    Number.isInteger(quantity) &&
    Object.keys(value.recipe).length === 2 &&
    Object.keys(value).length === 2
  );
}

export function isChecklist(value: unknown): value is Checklist {
  return (
    isRecord(value) &&
    isShardId(value.shard) &&
    inRange(value.quantity, 1, LIMITS.quantity) &&
    Number.isInteger(value.quantity) &&
    Array.isArray(value.done) &&
    value.done.length <= LIMITS.checklistSteps &&
    value.done.every(
      (step) => typeof step === "string" && step.length <= 200,
    ) &&
    Object.keys(value).length === 3
  );
}

/** Tool data keys the calculator uses. */
export const SAVED_KEYS = {
  settings: "calc-settings",
  overrides: "calc-overrides",
  checklist: "calc-checklist",
} as const;

/** Whatever the calculator saves, as the data API sees it (any of its keys' values). */
export function isSavedValue(value: unknown): boolean {
  if (isCalcSettings(value) || isChecklist(value)) return true;
  return (
    Array.isArray(value) &&
    value.length <= LIMITS.overrides &&
    value.every(isChosenRecipe)
  );
}

/**
 * Settings read back from storage: anything missing or broken falls back to the
 * default, so a save from an older version still loads.
 */
export function readSettings(value: unknown): CalcSettings {
  if (isCalcSettings(value)) return value;
  if (!isRecord(value)) return DEFAULT_SETTINGS;
  const merged = {
    ...DEFAULT_SETTINGS,
    ...value,
    levels: {
      ...DEFAULT_SETTINGS.levels,
      ...(isRecord(value.levels) ? value.levels : {}),
    },
  };
  // Drop unknown keys, then check again; still broken: the defaults.
  const clean = Object.fromEntries(
    Object.keys(DEFAULT_SETTINGS).map((key) => [
      key,
      merged[key as keyof typeof merged],
    ]),
  );
  const levels = Object.fromEntries(
    LEVEL_SHARDS.map((shard) => [shard.key, merged.levels[shard.key]]),
  );
  const candidate = { ...clean, levels };
  return isCalcSettings(candidate) ? candidate : DEFAULT_SETTINGS;
}
