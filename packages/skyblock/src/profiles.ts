/**
 * SkyBlock profiles, pure. A player can have several profiles in the game, each with
 * its own attributes and shards; the site keeps one set of the tool's data per
 * profile. The first profile an account had ("Main") keeps its data on the tool's
 * plain keys (so data from before profiles stays where it was); every other keeps
 * its data under a prefix (`p<id>-`), so one profile's keys never touch another's.
 */

export const PROFILE_LIMITS = {
  /** Profiles an account can have (Hypixel allows a few; co-ops and spares add some). */
  perUser: 10,
  /** Longest profile name, in characters (Hypixel's fruit names are shorter). */
  nameLength: 32,
} as const;

/** The name the first profile gets. */
export const MAIN_PROFILE_NAME = "Main";

/** Hypixel's game modes, as the site names them. */
export const GAME_MODES = {
  classic: "Classic",
  ironman: "Ironman",
  stranded: "Stranded",
  bingo: "Bingo",
} as const;

export type GameMode = keyof typeof GAME_MODES;

export function isGameMode(value: unknown): value is GameMode {
  return typeof value === "string" && Object.hasOwn(GAME_MODES, value);
}

/** The key prefix for a profile that isn't the first: "p12-". */
export function profileKeyPrefix(id: number): string {
  return `p${String(id)}-`;
}

/** A name made safe (trimmed, spaces collapsed), or null if it can't be one. */
export function cleanProfileName(name: string): string | null {
  const trimmed = name.trim().replace(/\s+/g, " ");
  return trimmed.length >= 1 && trimmed.length <= PROFILE_LIMITS.nameLength
    ? trimmed
    : null;
}

/** A Hypixel profile ID (a UUID, with or without dashes) as stored: 32 lower-case hex digits. */
export function normalizeProfileUuid(value: string): string | null {
  const hex = value.trim().toLowerCase().replace(/-/g, "");
  return /^[0-9a-f]{32}$/.test(hex) ? hex : null;
}
