import { describe, expect, it } from "vitest";
import {
  SB_DAY_MS,
  SB_YEAR_MS,
  formatSkyblockClock,
  formatSkyblockDate,
  ordinal,
  seasonOf,
  skyblockDate,
  skyblockTime,
} from "./calendar";
import {
  EVENTS,
  cadence,
  currentOccurrence,
  eventBoard,
  eventBySlug,
  eventsBetween,
  formatCountdown,
  formatDuration,
  nextOccurrence,
  nextOccurrences,
  occurrences,
  scheduleInWords,
  type SkyBlockEvent,
} from "./events";

/**
 * Year 527 as the in-game calendar has it (the Skyblocker mod's feed, read on
 * 22 November 2026): each event's start in Unix seconds and its length in seconds.
 */
const YEAR_527: Record<string, [number, number][]> = {
  "mayor-election": [
    [1794852900, 334800],
    [1795299300, 334800],
  ],
  "dark-auction": [[1795082100, 0]],
  "hoppitys-hunt": [[1795082100, 111600]],
  "jacobs-farming-contest": [[1795083300, 1200]],
  "cult-of-the-fallen-star": [[1795089300, 300]],
  "traveling-zoo": [
    [1795193700, 3600],
    [1795416900, 3600],
  ],
  "harvest-feast": [[1795305300, 1200]],
  "spooky-festival": [[1795376100, 3600]],
  "jerrys-workshop": [[1795491300, 37200]],
  "season-of-jerry": [[1795518900, 3600]],
  "new-year-celebration": [[1795524900, 3600]],
};

function event(slug: string): SkyBlockEvent {
  const found = eventBySlug(slug);
  if (!found) throw new Error(slug);
  return found;
}

describe("the calendar", () => {
  it("dates the start of Year 527 as the game does", () => {
    const start = 1795082100_000;
    expect(skyblockDate(start)).toEqual({
      year: 527,
      month: 1,
      day: 1,
      hour: 0,
      minute: 0,
    });
    expect(skyblockTime(527, 1, 1)).toBe(start);
    expect(skyblockDate(start - 1)).toMatchObject({
      year: 526,
      month: 12,
      day: 31,
      hour: 23,
      minute: 59,
    });
  });

  it("runs a day in 20 minutes and a year in 124 hours", () => {
    expect(SB_DAY_MS).toBe(20 * 60_000);
    expect(SB_YEAR_MS).toBe(124 * 3_600_000);
    const noon = skyblockTime(527, 8, 29, 12);
    expect(skyblockDate(noon + 25_000)).toEqual({
      year: 527,
      month: 8,
      day: 29,
      hour: 12,
      minute: 30,
    });
  });

  it("writes dates and the clock in the game's words", () => {
    expect(formatSkyblockDate({ year: 527, month: 12, day: 24 })).toBe(
      "Late Winter 24th, Year 527",
    );
    expect(formatSkyblockDate({ year: 1, month: 2, day: 1 }, false)).toBe(
      "Spring 1st",
    );
    expect([
      "1st",
      "2nd",
      "3rd",
      "4th",
      "11th",
      "12th",
      "13th",
      "21st",
      "22nd",
      "31st",
    ]).toEqual([1, 2, 3, 4, 11, 12, 13, 21, 22, 31].map(ordinal));
    expect(formatSkyblockClock({ hour: 0, minute: 7 })).toBe("12:00am");
    expect(formatSkyblockClock({ hour: 18, minute: 45 })).toBe("6:40pm");
    expect(seasonOf(1)).toBe("Spring");
    expect(seasonOf(12)).toBe("Winter");
  });
});

describe("events", () => {
  it("matches the in-game calendar for Year 527", () => {
    for (const [slug, times] of Object.entries(YEAR_527)) {
      const found = occurrences(
        event(slug),
        1794852900_000,
        1795528500_000,
      ).map((o) => [o.start / 1000, (o.end - o.start) / 1000]);
      for (const time of times) expect(found, slug).toContainEqual(time);
    }
  });

  it("holds the hourly events at :55 and :15 past the hour", () => {
    const from = Date.UTC(2026, 10, 22, 0, 0);
    const to = from + 6 * 3_600_000;
    for (const [slug, minute] of [
      ["dark-auction", 55],
      ["jacobs-farming-contest", 15],
    ] as const) {
      const found = occurrences(event(slug), from, to);
      expect(found).toHaveLength(6);
      for (const o of found)
        expect(new Date(o.start).getUTCMinutes()).toBe(minute);
    }
  });

  it("counts every event's times in a year", () => {
    const from = skyblockTime(527, 1, 1);
    const count = (slug: string) =>
      occurrences(event(slug), from, from + SB_YEAR_MS).filter(
        (o) => o.start >= from,
      ).length;
    expect(count("jacobs-farming-contest")).toBe(124);
    expect(count("dark-auction")).toBe(124);
    expect(count("cult-of-the-fallen-star")).toBe(48);
    expect(count("traveling-zoo")).toBe(2);
    expect(count("spooky-festival")).toBe(1);
  });

  it("finds what's on and what's next", () => {
    const spooky = event("spooky-festival");
    const during = skyblockTime(527, 8, 30);
    expect(currentOccurrence(spooky, during)?.start).toBe(
      skyblockTime(527, 8, 29),
    );
    expect(currentOccurrence(spooky, skyblockTime(527, 9, 1))).toBeNull();
    expect(nextOccurrence(spooky, during).start).toBe(skyblockTime(528, 8, 29));
    // The Dark Auction is a moment: never "on", always next.
    const auction = event("dark-auction");
    const at = skyblockTime(527, 1, 4);
    expect(currentOccurrence(auction, at)).toBeNull();
    expect(nextOccurrence(auction, at).start).toBe(skyblockTime(527, 1, 7));
  });

  it("carries the election across the new year", () => {
    const election = event("mayor-election");
    const springOf528 = skyblockTime(528, 2, 10);
    expect(currentOccurrence(election, springOf528)?.start).toBe(
      skyblockTime(527, 6, 27),
    );
    expect(currentOccurrence(election, skyblockTime(528, 3, 27))).toBeNull();
  });

  it("lists the next times and the board in order", () => {
    const now = skyblockTime(527, 12, 25, 6);
    const zoo = nextOccurrences(event("traveling-zoo"), now, 3).map((o) =>
      skyblockDate(o.start),
    );
    expect(zoo.map((d) => [d.year, d.month])).toEqual([
      [528, 4],
      [528, 10],
      [529, 4],
    ]);
    const board = eventBoard(now);
    expect(board.next).toHaveLength(EVENTS.length);
    expect(board.running.map((o) => o.event.slug)).toEqual(
      expect.arrayContaining(["season-of-jerry", "jerrys-workshop"]),
    );
    const starts = board.next.map((o) => o.start);
    expect(starts).toEqual([...starts].sort((a, b) => a - b));
    const between = eventsBetween(now, now + 3_600_000).map((o) => o.start);
    expect(between.length).toBeGreaterThan(0);
    expect(between).toEqual([...between].sort((a, b) => a - b));
  });

  it("gives every event a unique address and a cadence", () => {
    expect(new Set(EVENTS.map((e) => e.slug)).size).toBe(EVENTS.length);
    expect(cadence(event("dark-auction"))).toBe("Every hour");
    expect(cadence(event("cult-of-the-fallen-star"))).toBe(
      "4 times a SkyBlock month",
    );
    expect(cadence(event("traveling-zoo"))).toBe("2 times a SkyBlock year");
  });

  it("says when each event happens in the game's words", () => {
    const words = (slug: string) => scheduleInWords(event(slug));
    expect(words("jacobs-farming-contest")).toBe("Every hour, at :15");
    expect(words("dark-auction")).toBe("Every hour, at :55");
    expect(words("cult-of-the-fallen-star")).toBe(
      "The 7th, 14th, 21st and 28th of every month",
    );
    expect(words("spooky-festival")).toBe("Autumn 29th to 31st");
    expect(words("traveling-zoo")).toBe(
      "Early Summer 1st to 3rd, and Early Winter 1st to 3rd",
    );
    expect(words("hoppitys-hunt")).toBe("Early Spring 1st to Late Spring 31st");
    expect(words("harvest-feast")).toBe("Early Autumn 1st");
    expect(words("mayor-election")).toBe(
      "Late Summer 27th to Late Spring 26th",
    );
  });

  it("writes lengths and countdowns", () => {
    expect(formatDuration(0)).toBe("a moment");
    expect(formatDuration(20 * 60_000)).toBe("20 minutes");
    expect(formatDuration(3_600_000)).toBe("1 hour");
    expect(formatDuration(279 * SB_DAY_MS)).toBe("3 days 21 hours");
    expect(formatCountdown(40_500)).toBe("40s");
    expect(formatCountdown(12 * 60_000 + 4_000)).toBe("12m 04s");
    expect(formatCountdown(2 * 3_600_000 + 5 * 60_000)).toBe("2h 05m");
    expect(formatCountdown(4 * 86_400_000 + 2 * 3_600_000)).toBe("4d 2h");
  });
});
