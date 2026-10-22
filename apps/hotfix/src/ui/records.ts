import { isDay, metres, score, type RunMode, type RunState } from "../core";

/** Where this browser keeps your records (a "preferences" key, see consent.ts). */
export const RECORDS_KEY = "trilleo:game:hotfix";

export interface Records {
  best: number;
  /** The longest run, in metres. */
  furthest: number;
  runs: number;
  /** Tokens collected over every run. */
  tokens: number;
  /** The best Daily Run on the last day played. */
  daily: { day: string; best: number } | null;
}

export const NO_RECORDS: Records = {
  best: 0,
  furthest: 0,
  runs: 0,
  tokens: 0,
  daily: null,
};

function count(value: unknown): number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0
    ? value
    : 0;
}

/** Whatever's saved; anything unreadable counts as no records. */
export function loadRecords(storage: Storage | null): Records {
  try {
    const raw = storage?.getItem(RECORDS_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    if (typeof parsed !== "object" || parsed === null) return NO_RECORDS;
    const saved = parsed as Record<string, unknown>;
    const daily = saved.daily as { day?: unknown; best?: unknown } | null;
    return {
      best: count(saved.best),
      furthest: count(saved.furthest),
      runs: count(saved.runs),
      tokens: count(saved.tokens),
      daily:
        typeof daily === "object" && daily !== null && isDay(daily.day)
          ? { day: daily.day, best: count(daily.best) }
          : null,
    };
  } catch {
    return NO_RECORDS;
  }
}

export function saveRecords(storage: Storage | null, records: Records): void {
  try {
    storage?.setItem(RECORDS_KEY, JSON.stringify(records));
  } catch {
    // Full or blocked storage: the records just don't outlive the page.
  }
}

/** The best Daily Run kept for `day` (0 if another day's is kept). */
export function dailyBest(records: Records, day: string): number {
  return records.daily?.day === day ? records.daily.best : 0;
}

/**
 * The records after a finished run, and whether it beat the best score for its
 * mode (a Daily Run against that day's best).
 */
export function afterRun(
  records: Records,
  run: RunState,
  mode: RunMode = "endless",
  day = "",
): { records: Records; newBest: boolean } {
  const points = score(run);
  const totals = {
    furthest: Math.max(records.furthest, metres(run)),
    runs: records.runs + 1,
    tokens: records.tokens + run.tokens,
  };
  if (mode === "daily") {
    const before = dailyBest(records, day);
    return {
      records: {
        ...records,
        ...totals,
        daily: { day, best: Math.max(before, points) },
      },
      newBest: points > before,
    };
  }
  return {
    records: { ...records, ...totals, best: Math.max(records.best, points) },
    newBest: points > records.best,
  };
}
