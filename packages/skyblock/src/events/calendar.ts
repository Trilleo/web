/**
 * The SkyBlock calendar: a fixed clock that started at Year 1, Early Spring 1st, and
 * runs 72 times faster than ours. A day is 20 real minutes, a month 31 days, a year
 * 12 months (124 real hours), so every date can be worked out from the time alone.
 * The epoch is the one mods and the in-game calendar agree on (1560275700 s).
 */

export const SKYBLOCK_EPOCH_MS = 1_560_275_700_000;
/** A SkyBlock hour: 50 real seconds. */
export const SB_HOUR_MS = 50_000;
export const SB_DAY_MS = 24 * SB_HOUR_MS;
export const SB_DAYS_PER_MONTH = 31;
export const SB_MONTH_MS = SB_DAYS_PER_MONTH * SB_DAY_MS;
export const SB_MONTHS_PER_YEAR = 12;
export const SB_DAYS_PER_YEAR = SB_DAYS_PER_MONTH * SB_MONTHS_PER_YEAR;
export const SB_YEAR_MS = SB_MONTHS_PER_YEAR * SB_MONTH_MS;

/** The months in order, as the game names them; month 1 is Early Spring. */
export const SB_MONTHS = [
  "Early Spring",
  "Spring",
  "Late Spring",
  "Early Summer",
  "Summer",
  "Late Summer",
  "Early Autumn",
  "Autumn",
  "Late Autumn",
  "Early Winter",
  "Winter",
  "Late Winter",
] as const;

export const SB_SEASONS = ["Spring", "Summer", "Autumn", "Winter"] as const;
export type SbSeason = (typeof SB_SEASONS)[number];

export interface SkyBlockDate {
  year: number;
  /** 1–12. */
  month: number;
  /** 1–31. */
  day: number;
  /** 0–23. */
  hour: number;
  /** 0–59. */
  minute: number;
}

/** The SkyBlock date and time at a real moment. */
export function skyblockDate(ms: number): SkyBlockDate {
  const since = ms - SKYBLOCK_EPOCH_MS;
  const year = Math.floor(since / SB_YEAR_MS);
  const inYear = since - year * SB_YEAR_MS;
  const month = Math.floor(inYear / SB_MONTH_MS);
  const inMonth = inYear - month * SB_MONTH_MS;
  const day = Math.floor(inMonth / SB_DAY_MS);
  const inDay = inMonth - day * SB_DAY_MS;
  const hour = Math.floor(inDay / SB_HOUR_MS);
  const minute = Math.floor(((inDay - hour * SB_HOUR_MS) * 60) / SB_HOUR_MS);
  return { year: year + 1, month: month + 1, day: day + 1, hour, minute };
}

/** The real moment a SkyBlock day (and hour) starts. */
export function skyblockTime(
  year: number,
  month: number,
  day: number,
  hour = 0,
): number {
  return (
    SKYBLOCK_EPOCH_MS +
    (year - 1) * SB_YEAR_MS +
    (month - 1) * SB_MONTH_MS +
    (day - 1) * SB_DAY_MS +
    hour * SB_HOUR_MS
  );
}

/** When a SkyBlock year starts (Early Spring 1st). */
export function yearStart(year: number): number {
  return skyblockTime(year, 1, 1);
}

export function monthName(month: number): string {
  return SB_MONTHS[(((month - 1) % 12) + 12) % 12] ?? "";
}

export function seasonOf(month: number): SbSeason {
  return (
    SB_SEASONS[Math.floor(((((month - 1) % 12) + 12) % 12) / 3)] ?? "Spring"
  );
}

export function ordinal(n: number): string {
  const tens = n % 100;
  if (tens >= 11 && tens <= 13) return `${String(n)}th`;
  const suffix = ["th", "st", "nd", "rd"][n % 10] ?? "th";
  return `${String(n)}${n % 10 > 3 ? "th" : suffix}`;
}

/** "Late Winter 24th", or with the year, "Late Winter 24th, Year 527". */
export function formatSkyblockDate(
  date: Pick<SkyBlockDate, "year" | "month" | "day">,
  withYear = true,
): string {
  const base = `${monthName(date.month)} ${ordinal(date.day)}`;
  return withYear ? `${base}, Year ${String(date.year)}` : base;
}

/** The game's clock: "6:40am". Minutes move in tens, as the game shows them. */
export function formatSkyblockClock(
  date: Pick<SkyBlockDate, "hour" | "minute">,
): string {
  const minute = Math.floor(date.minute / 10) * 10;
  const hour12 = date.hour % 12 === 0 ? 12 : date.hour % 12;
  return `${String(hour12)}:${String(minute).padStart(2, "0")}${date.hour < 12 ? "am" : "pm"}`;
}
