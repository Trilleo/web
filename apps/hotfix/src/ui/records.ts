import { metres, score, type RunState } from "../core";

/** Where this browser keeps your records (a "preferences" key, see consent.ts). */
export const RECORDS_KEY = "trilleo:game:hotfix";

export interface Records {
  best: number;
  /** The longest run, in metres. */
  furthest: number;
  runs: number;
  /** Tokens collected over every run. */
  tokens: number;
}

export const NO_RECORDS: Records = { best: 0, furthest: 0, runs: 0, tokens: 0 };

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
    return {
      best: count(saved.best),
      furthest: count(saved.furthest),
      runs: count(saved.runs),
      tokens: count(saved.tokens),
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

/** The records after a finished run, and whether it beat the best score. */
export function afterRun(
  records: Records,
  run: RunState,
): { records: Records; newBest: boolean } {
  const points = score(run);
  return {
    records: {
      best: Math.max(records.best, points),
      furthest: Math.max(records.furthest, metres(run)),
      runs: records.runs + 1,
      tokens: records.tokens + run.tokens,
    },
    newBest: points > records.best,
  };
}
