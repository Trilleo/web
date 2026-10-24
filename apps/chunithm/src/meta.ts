import { isDifficulty, type Difficulty } from "@trilleo/chunithm";
import type { ToolMeta } from "@trilleo/tool-kit";

/**
 * What the tool keeps per person (this browser, or the account): favourite charts
 * and recently viewed ones, one item each, keyed by chart ("f-2710-master",
 * "r-2710-master").
 */
export type SavedChart =
  | { kind: "favourite" }
  /** `at`: when it was last viewed (ISO). */
  | { kind: "recent"; at: string };

/** Recently viewed charts kept; older ones are dropped. */
export const RECENT_MAX = 50;
/** Favourites one person may keep (the data API allows 500 keys a tool). */
export const FAVOURITES_MAX = 400;

const KEY = /^([fr])-(\d{1,6})-([a-z]+)$/;

export function savedKey(
  kind: SavedChart["kind"],
  songId: number,
  difficulty: Difficulty,
): string {
  return `${kind === "favourite" ? "f" : "r"}-${String(songId)}-${difficulty}`;
}

/** A saved item's chart, from its key; null for a key that isn't one. */
export function chartOfKey(
  key: string,
): { kind: SavedChart["kind"]; songId: number; difficulty: Difficulty } | null {
  const match = KEY.exec(key);
  if (!match) return null;
  const [, kind, id = "", difficulty = ""] = match;
  if (!isDifficulty(difficulty)) return null;
  return {
    kind: kind === "f" ? "favourite" : "recent",
    songId: Number(id),
    difficulty,
  };
}

export function isSavedChart(value: unknown): value is SavedChart {
  if (typeof value !== "object" || value === null) return false;
  const record = value as Record<string, unknown>;
  if (record.kind === "favourite") return Object.keys(record).length === 1;
  return (
    record.kind === "recent" &&
    Object.keys(record).length === 2 &&
    typeof record.at === "string" &&
    record.at.length <= 40 &&
    !Number.isNaN(Date.parse(record.at))
  );
}

/** Kept separate from the app, so the server can read it without loading React. */
export const meta: ToolMeta = {
  slug: "chunithm",
  name: "CHUNITHM charts",
  description:
    "Every CHUNITHM chart as one picture, read from the bottom up. Search in English, Japanese or Chinese, and keep your favourites.",
  status: "live",
  icon: "chunithm",
  isValidValue: isSavedChart,
};
