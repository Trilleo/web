/**
 * The event timer's page helpers: the server's side of times (UTC text the browser
 * rewrites, see components/skyblock/event-clock.ts) and the year laid out by month.
 * The rules themselves are @trilleo/skyblock/events.
 */
import {
  EVENTS,
  SB_MONTHS,
  occurrences,
  skyblockDate,
  yearStart,
  SB_YEAR_MS,
  type EventCategory,
  type Occurrence,
  type SkyBlockEvent,
} from "@trilleo/skyblock/events";

/** A time as the server writes it before the browser rewrites it in its own zone. */
export function utcTime(ms: number): string {
  return `${new Date(ms).toLocaleString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
  })} UTC`;
}

export function isoTime(ms: number): string {
  return new Date(ms).toISOString();
}

/** The calendar's events plus any the mayor's perks add, of one kind or all. */
export function eventsIn(
  category: EventCategory | null,
  extra: readonly SkyBlockEvent[] = [],
): readonly SkyBlockEvent[] {
  const all = [...EVENTS, ...extra];
  return category === null
    ? all
    : all.filter((event) => event.category === category);
}

export interface YearMonth {
  month: number;
  name: string;
  /** Events that start this month, besides the ones that come round all year. */
  starts: Occurrence[];
  current: boolean;
}

/**
 * A SkyBlock year by month: what starts in each, for the events that happen a few
 * times a year (the hourly and monthly ones would fill every month).
 */
export function yearByMonth(
  year: number,
  now: number,
  events: readonly SkyBlockEvent[] = EVENTS,
): YearMonth[] {
  const start = yearStart(year);
  const yearly = events.filter((event) => event.schedule.kind === "yearly");
  const found = yearly
    .flatMap((event) => occurrences(event, start, start + SB_YEAR_MS))
    .filter((occurrence) => occurrence.start >= start)
    .sort((a, b) => a.start - b.start);
  const today = skyblockDate(now);
  return SB_MONTHS.map((name, index) => ({
    month: index + 1,
    name,
    starts: found.filter(
      (occurrence) => skyblockDate(occurrence.start).month === index + 1,
    ),
    current: today.year === year && today.month === index + 1,
  }));
}
