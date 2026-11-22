/**
 * SkyBlock's calendar events and when they happen. Every event here follows the
 * calendar (calendar.ts), so its times are worked out, never fetched. Events that
 * depend on the mayor, and fire sales or Bingo, come from Hypixel's API instead.
 *
 * The rules were checked against the in-game calendar for Year 527 (as the
 * Skyblocker mod's feed reports it): events.test.ts keeps those dates.
 */
import {
  SB_DAYS_PER_MONTH,
  SB_DAYS_PER_YEAR,
  SB_DAY_MS,
  SB_HOUR_MS,
  SB_MONTH_MS,
  SB_YEAR_MS,
  SKYBLOCK_EPOCH_MS,
  monthName,
  ordinal,
  skyblockDate,
  skyblockTime,
} from "./calendar";

export const EVENT_CATEGORIES = {
  festival: "Festivals",
  farming: "Farming",
  mining: "Mining",
  economy: "Economy",
  politics: "Politics",
  mayor: "Mayor's perks",
} as const;
export type EventCategory = keyof typeof EVENT_CATEGORIES;

export function isEventCategory(value: unknown): value is EventCategory {
  return typeof value === "string" && Object.hasOwn(EVENT_CATEGORIES, value);
}

/** When an event happens, in SkyBlock terms. */
export type EventSchedule =
  /** Every few days, all year round, from a day of the year (0 = Early Spring 1st). */
  | { kind: "cycle"; firstDay: number; everyDays: number; lengthMs: number }
  /** On some days of every month. */
  | { kind: "monthly"; days: readonly number[]; lengthMs: number }
  /** On dates of the year, each lasting some days. */
  | {
      kind: "yearly";
      starts: readonly { month: number; day: number }[];
      lengthDays: number;
    };

export interface SkyBlockEvent {
  /** Its address: /tools/skyblock/events/<slug>/. */
  slug: string;
  name: string;
  category: EventCategory;
  schedule: EventSchedule;
  /** Where it happens. */
  where: string;
  /** The command that takes you there, if there is one. */
  warp: string | null;
  /** One line: what happens. */
  summary: string;
  /** Only while a mayor or minister with this perk is in office (mayor.ts). */
  perk?: string;
  /** Times are limited to this span (a perk's term), ms. */
  during?: { from: number; to: number };
}

/** The calendar events, in the order the board lists them when they tie. */
export const EVENTS: readonly SkyBlockEvent[] = [
  {
    slug: "jacobs-farming-contest",
    name: "Jacob's Farming Contest",
    category: "farming",
    schedule: { kind: "cycle", firstDay: 1, everyDays: 3, lengthMs: SB_DAY_MS },
    where: "The Garden and the farming islands",
    warp: "/warp garden",
    summary:
      "Three crops each time. Farm one of them for 20 minutes to earn medals and Jacob's Tickets.",
  },
  {
    slug: "dark-auction",
    name: "Dark Auction",
    category: "economy",
    schedule: { kind: "cycle", firstDay: 0, everyDays: 3, lengthMs: 0 },
    where: "The Wilderness, in the Hub",
    warp: "/warp da",
    summary: "Sirius auctions rare items. Bids are in coins.",
  },
  {
    slug: "cult-of-the-fallen-star",
    name: "Cult of the Fallen Star",
    category: "mining",
    schedule: {
      kind: "monthly",
      days: [7, 14, 21, 28],
      lengthMs: 6 * SB_HOUR_MS,
    },
    where: "The Dwarven Mines",
    warp: "/warp dwarves",
    summary: "A star falls in the Dwarven Mines for a few minutes.",
  },
  {
    slug: "hoppitys-hunt",
    name: "Hoppity's Hunt",
    category: "festival",
    schedule: {
      kind: "yearly",
      starts: [{ month: 1, day: 1 }],
      lengthDays: 93,
    },
    where: "All of SkyBlock",
    warp: null,
    summary: "Chocolate Rabbits hide across SkyBlock all spring.",
  },
  {
    slug: "traveling-zoo",
    name: "Traveling Zoo",
    category: "economy",
    schedule: {
      kind: "yearly",
      starts: [
        { month: 4, day: 1 },
        { month: 10, day: 1 },
      ],
      lengthDays: 3,
    },
    where: "The Hub",
    warp: "/hub",
    summary: "Oringo sells pets for three days, twice a year.",
  },
  {
    slug: "harvest-feast",
    name: "Harvest Feast",
    category: "festival",
    schedule: { kind: "yearly", starts: [{ month: 7, day: 1 }], lengthDays: 1 },
    where: "SkyBlock",
    warp: null,
    summary: "A one-day festival at the start of autumn.",
  },
  {
    slug: "spooky-festival",
    name: "Spooky Festival",
    category: "festival",
    schedule: {
      kind: "yearly",
      starts: [{ month: 8, day: 29 }],
      lengthDays: 3,
    },
    where: "The Hub",
    warp: "/hub",
    summary:
      "Mobs drop candy for three days. Trade it with the Fear Mongerer in the Hub.",
  },
  {
    slug: "jerrys-workshop",
    name: "Jerry's Workshop",
    category: "festival",
    schedule: {
      kind: "yearly",
      starts: [{ month: 12, day: 1 }],
      lengthDays: 31,
    },
    where: "Jerry's Workshop",
    warp: "/warp jerry",
    summary: "The winter island opens for all of Late Winter.",
  },
  {
    slug: "season-of-jerry",
    name: "Season of Jerry",
    category: "festival",
    schedule: {
      kind: "yearly",
      starts: [{ month: 12, day: 24 }],
      lengthDays: 3,
    },
    where: "Jerry's Workshop",
    warp: "/warp jerry",
    summary: "Jerry's Workshop comes under attack. Defend it in waves.",
  },
  {
    slug: "new-year-celebration",
    name: "New Year Celebration",
    category: "festival",
    schedule: {
      kind: "yearly",
      starts: [{ month: 12, day: 29 }],
      lengthDays: 3,
    },
    where: "The Hub",
    warp: "/hub",
    summary: "The Baker hands out a free New Year Cake for the year to come.",
  },
  {
    slug: "mayor-election",
    name: "Mayor election",
    category: "politics",
    schedule: {
      kind: "yearly",
      starts: [{ month: 6, day: 27 }],
      lengthDays: 279,
    },
    where: "The Election Room, in the Hub",
    warp: null,
    summary:
      "Vote for next year's mayor. When the booth closes, the winner takes office.",
  },
];

export function eventBySlug(slug: string): SkyBlockEvent | undefined {
  return EVENTS.find((event) => event.slug === slug);
}

export interface Occurrence {
  event: SkyBlockEvent;
  /** Real start and end, ms. A moment-long event (the Dark Auction) ends as it starts. */
  start: number;
  end: number;
}

export function lengthOf(schedule: EventSchedule): number {
  return schedule.kind === "yearly"
    ? schedule.lengthDays * SB_DAY_MS
    : schedule.lengthMs;
}

/**
 * The times an event overlaps [from, to): those that end after `from` (or start at
 * it, for a moment-long one) and start before `to`, in order.
 */
export function occurrences(
  event: SkyBlockEvent,
  from: number,
  to: number,
): Occurrence[] {
  const schedule = event.schedule;
  const length = lengthOf(schedule);
  const starts: number[] = [];
  const earliest = from - length;
  if (schedule.kind === "cycle") {
    const period = schedule.everyDays * SB_DAY_MS;
    const anchor = SKYBLOCK_EPOCH_MS + schedule.firstDay * SB_DAY_MS;
    for (
      let at = anchor + Math.ceil((earliest - anchor) / period) * period;
      at < to;
      at += period
    ) {
      starts.push(at);
    }
  } else if (schedule.kind === "monthly") {
    const first = SKYBLOCK_EPOCH_MS;
    let month = Math.floor((earliest - first) / SB_MONTH_MS);
    for (; first + month * SB_MONTH_MS < to; month++) {
      for (const day of schedule.days) {
        starts.push(first + month * SB_MONTH_MS + (day - 1) * SB_DAY_MS);
      }
    }
  } else {
    const firstYear = skyblockDate(earliest).year;
    const lastYear = skyblockDate(to).year;
    for (let year = firstYear; year <= lastYear; year++) {
      for (const start of schedule.starts) {
        starts.push(skyblockTime(year, start.month, start.day));
      }
    }
  }
  const during = event.during;
  return starts
    .filter((start) => !during || (start >= during.from && start < during.to))
    .filter((start) =>
      length === 0
        ? start >= from && start < to
        : start + length > from && start < to,
    )
    .sort((a, b) => a - b)
    .map((start) => ({ event, start, end: start + length }));
}

/** Every event's times in [from, to), in order of start (ties in EVENTS' order). */
export function eventsBetween(
  from: number,
  to: number,
  events: readonly SkyBlockEvent[] = EVENTS,
): Occurrence[] {
  return events
    .flatMap((event) => occurrences(event, from, to))
    .sort((a, b) => a.start - b.start);
}

/**
 * The next `count` times an event starts after `now` (fewer for one limited to a
 * term that ends first).
 */
export function nextOccurrences(
  event: SkyBlockEvent,
  now: number,
  count: number,
): Occurrence[] {
  const found: Occurrence[] = [];
  const until = event.during?.to ?? Infinity;
  // A year holds at least one of every event; look a year at a time.
  for (
    let from = now;
    found.length < count && from < until;
    from += SB_YEAR_MS
  ) {
    for (const occurrence of occurrences(event, from, from + SB_YEAR_MS)) {
      if (occurrence.start > now && found.length < count) {
        found.push(occurrence);
      }
    }
  }
  return found;
}

export function nextOccurrence(
  event: SkyBlockEvent,
  now: number,
): Occurrence | null {
  return nextOccurrences(event, now, 1)[0] ?? null;
}

/** The time an event is on at `now`, if it is (moment-long ones never are). */
export function currentOccurrence(
  event: SkyBlockEvent,
  now: number,
): Occurrence | null {
  return (
    occurrences(event, now, now + 1).find(
      (occurrence) => occurrence.start <= now && occurrence.end > now,
    ) ?? null
  );
}

export interface EventBoard {
  /** What's on now, ending soonest first. */
  running: Occurrence[];
  /** Each event's next start, soonest first (none for a term that's ending). */
  next: Occurrence[];
}

export function eventBoard(
  now: number,
  events: readonly SkyBlockEvent[] = EVENTS,
): EventBoard {
  const running = events
    .map((event) => currentOccurrence(event, now))
    .filter((occurrence): occurrence is Occurrence => occurrence !== null)
    .sort((a, b) => a.end - b.end);
  const next = events
    .map((event) => nextOccurrence(event, now))
    .filter((occurrence): occurrence is Occurrence => occurrence !== null)
    .sort((a, b) => a.start - b.start);
  return { running, next };
}

/** How often an event comes round, in words. */
export function cadence(event: SkyBlockEvent): string {
  const schedule = event.schedule;
  if (schedule.kind === "cycle") {
    const realMinutes = (schedule.everyDays * SB_DAY_MS) / 60_000;
    return realMinutes === 60
      ? "Every hour"
      : `Every ${String(realMinutes)} minutes`;
  }
  if (schedule.kind === "monthly") {
    return `${String(schedule.days.length)} times a SkyBlock month`;
  }
  return schedule.starts.length === 1
    ? "Once a SkyBlock year"
    : `${String(schedule.starts.length)} times a SkyBlock year`;
}

/**
 * When an event happens, in the game's words: "Every hour, at :15",
 * "The 7th, 14th, 21st and 28th of every month", "Autumn 29th to 31st".
 */
export function scheduleInWords(event: SkyBlockEvent): string {
  const schedule = event.schedule;
  if (schedule.kind === "cycle") {
    const anchor = SKYBLOCK_EPOCH_MS + schedule.firstDay * SB_DAY_MS;
    const minute = Math.floor((anchor % 3_600_000) / 60_000);
    return `${cadence(event)}, at :${String(minute).padStart(2, "0")}`;
  }
  if (schedule.kind === "monthly") {
    const span = Math.round(schedule.lengthMs / SB_DAY_MS);
    if (span > 1 && schedule.days.length === 1) {
      const day = schedule.days[0] ?? 1;
      return `The ${ordinal(day)} to ${ordinal(day + span - 1)} of every month`;
    }
    const days = schedule.days.map(ordinal);
    const list =
      days.length > 1
        ? `${days.slice(0, -1).join(", ")} and ${days.at(-1) ?? ""}`
        : (days[0] ?? "");
    return `The ${list} of every month`;
  }
  if (event.perk && schedule.lengthDays >= SB_DAYS_PER_YEAR) return "All term";
  const spans = schedule.starts.map((start) => {
    const first =
      start.month * SB_DAYS_PER_MONTH + start.day - SB_DAYS_PER_MONTH;
    const last = first + schedule.lengthDays - 1;
    const endMonth = ((Math.ceil(last / SB_DAYS_PER_MONTH) - 1) % 12) + 1;
    const endDay = ((last - 1) % SB_DAYS_PER_MONTH) + 1;
    const from = `${monthName(start.month)} ${ordinal(start.day)}`;
    if (schedule.lengthDays === 1) return from;
    return endMonth === start.month && last <= 12 * SB_DAYS_PER_MONTH
      ? `${from} to ${ordinal(endDay)}`
      : `${from} to ${monthName(endMonth)} ${ordinal(endDay)}`;
  });
  return spans.length > 1
    ? `${spans.slice(0, -1).join(", ")}, and ${spans.at(-1) ?? ""}`
    : (spans[0] ?? "");
}

/** A length of real time in words: "20 minutes", "1 hour", "3 days 2 hours". */
export function formatDuration(ms: number): string {
  if (ms <= 0) return "a moment";
  const minutes = Math.round(ms / 60_000);
  if (minutes < 60) return plural(minutes, "minute");
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours < 24) {
    return rest === 0
      ? plural(hours, "hour")
      : `${plural(hours, "hour")} ${plural(rest, "minute")}`;
  }
  const days = Math.floor(hours / 24);
  const restHours = hours % 24;
  return restHours === 0
    ? plural(days, "day")
    : `${plural(days, "day")} ${plural(restHours, "hour")}`;
}

/** A countdown: "4d 2h", "2h 05m", "12m 04s", "40s". */
export function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const days = Math.floor(total / 86_400);
  const hours = Math.floor((total % 86_400) / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  if (days > 0) return `${String(days)}d ${String(hours)}h`;
  if (hours > 0) return `${String(hours)}h ${pad(minutes)}m`;
  if (minutes > 0) return `${String(minutes)}m ${pad(seconds)}s`;
  return `${String(seconds)}s`;
}

function plural(n: number, word: string): string {
  return `${String(n)} ${word}${n === 1 ? "" : "s"}`;
}
