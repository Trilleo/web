/**
 * Which three crops each Jacob's Farming Contest uses. Hypixel's API doesn't say:
 * players' mods read it from the in-game calendar, and the Skyblocker mod publishes
 * it (hysky.de/api/calendar: each event's start in Unix seconds, and for contests the
 * crops in `extras`). The site fetches that feed (apps/web/src/lib/skyblock/feeds.ts);
 * this reads it, keeping only contests whose start is a real contest time and crops
 * it knows.
 */
import { SB_DAY_MS, SKYBLOCK_EPOCH_MS } from "./calendar";

/** The crops a contest can use, in the game's names. */
export const JACOB_CROPS = [
  "Cactus",
  "Carrot",
  "Cocoa Beans",
  "Melon",
  "Moonflower",
  "Mushroom",
  "Nether Wart",
  "Potato",
  "Pumpkin",
  "Sugar Cane",
  "Sunflower",
  "Wheat",
  "Wild Rose",
] as const;
export type JacobCrop = (typeof JACOB_CROPS)[number];

/** Other names feeds use for the same crop. */
const CROP_ALIASES: Record<string, JacobCrop> = {
  "Melon Slice": "Melon",
  "Red Mushroom": "Mushroom",
  "Brown Mushroom": "Mushroom",
  "Cocoa Bean": "Cocoa Beans",
  "Nether Warts": "Nether Wart",
  Carrots: "Carrot",
  Potatoes: "Potato",
};

export function isJacobCrop(value: unknown): value is JacobCrop {
  return (JACOB_CROPS as readonly unknown[]).includes(value);
}

export function cropName(value: string): JacobCrop | null {
  const trimmed = value.trim();
  return isJacobCrop(trimmed) ? trimmed : (CROP_ALIASES[trimmed] ?? null);
}

/** Contests and their crops, keyed by the contest's start (ms, as a string). */
export interface JacobSchedule {
  contests: Record<string, JacobCrop[]>;
}

/** At most this many contests are kept (a SkyBlock year has 124). */
const MAX_CONTESTS = 400;

/** Whether a moment is a contest's start (every 3 SkyBlock days from day 2). */
export function isContestStart(ms: number): boolean {
  const offset = ms - SKYBLOCK_EPOCH_MS - SB_DAY_MS;
  return offset % (3 * SB_DAY_MS) === 0;
}

/** The Skyblocker calendar feed: an array of { timestamp, event, extras }. */
export function readJacobCrops(body: unknown): JacobSchedule {
  if (!Array.isArray(body)) throw new Error("The crop calendar isn't a list.");
  const contests: Record<string, JacobCrop[]> = {};
  for (const item of body) {
    if (Object.keys(contests).length >= MAX_CONTESTS) break;
    if (typeof item !== "object" || item === null) continue;
    const row = item as Record<string, unknown>;
    if (typeof row.event !== "string" || !row.event.startsWith("Jacob"))
      continue;
    const seconds = row.timestamp;
    if (typeof seconds !== "number" || !Number.isInteger(seconds)) continue;
    const start = seconds * 1000;
    if (!isContestStart(start)) continue;
    const crops = (Array.isArray(row.extras) ? row.extras : [])
      .flatMap((extra) =>
        typeof extra === "string" ? (cropName(extra) ?? []) : [],
      )
      .filter((crop, i, all) => all.indexOf(crop) === i);
    if (crops.length === 3) contests[String(start)] = crops;
  }
  if (Object.keys(contests).length === 0)
    throw new Error("The crop calendar lists no contests.");
  return { contests };
}

/** A contest's crops, if known. */
export function contestCrops(
  schedule: JacobSchedule | null,
  start: number,
): JacobCrop[] | null {
  return schedule?.contests[String(start)] ?? null;
}
