import { describe, expect, it } from "vitest";
import { skyblockTime } from "./calendar";
import { eventBySlug, occurrences, type SkyBlockEvent } from "./events";
import { calendarIcs, foldLine, icsDate, icsText } from "./ics";
import { PERK_EVENTS } from "./mayor";
import {
  REMINDER_LIMITS,
  dueOccurrence,
  formatClock,
  formatLead,
  inQuietHours,
  isTimeZone,
  leadsFor,
  minuteOfDay,
  nextReminderAt,
  parseClock,
  reminderSubject,
} from "./reminders";

function event(slug: string): SkyBlockEvent {
  const found = eventBySlug(slug) ?? PERK_EVENTS.find((e) => e.slug === slug);
  if (!found) throw new Error(slug);
  return found;
}

describe("reminders", () => {
  it("offers only leads shorter than the gap between an event's times", () => {
    expect(leadsFor(event("dark-auction"))).toEqual([0, 5, 15, 30]);
    expect(leadsFor(event("cult-of-the-fallen-star"))).toEqual([
      0, 5, 15, 30, 60,
    ]);
    expect(leadsFor(event("spooky-festival"))).toEqual([
      0, 5, 15, 30, 60, 1440,
    ]);
    // The Zoo comes twice a year, 62 hours apart at the least.
    expect(leadsFor(event("traveling-zoo"))).toContain(1440);
    expect(leadsFor(event("fishing-festival"))).toEqual([0, 5, 15, 30, 60]);
  });

  it("is due from the lead before the start until a little after it", () => {
    const spooky = event("spooky-festival");
    const start = skyblockTime(527, 8, 29);
    expect(dueOccurrence(spooky, 15, start - 16 * 60_000)).toBeNull();
    expect(dueOccurrence(spooky, 15, start - 15 * 60_000)?.start).toBe(start);
    expect(dueOccurrence(spooky, 15, start + 60_000)?.start).toBe(start);
    expect(
      dueOccurrence(spooky, 15, start + REMINDER_LIMITS.graceMs),
    ).toBeNull();
    expect(dueOccurrence(spooky, 0, start)?.start).toBe(start);
    expect(dueOccurrence(spooky, 0, start - 1)).toBeNull();
  });

  it("is due for each hourly time in turn", () => {
    const auction = event("dark-auction");
    const [first, second] = occurrences(
      auction,
      Date.UTC(2026, 10, 22, 12),
      Date.UTC(2026, 10, 22, 14),
    );
    if (!first || !second) throw new Error("no auctions");
    expect(dueOccurrence(auction, 5, first.start - 5 * 60_000)?.start).toBe(
      first.start,
    );
    expect(dueOccurrence(auction, 5, second.start - 4 * 60_000)?.start).toBe(
      second.start,
    );
    expect(nextReminderAt(auction, 5, first.start)).toBe(
      second.start - 5 * 60_000,
    );
  });

  it("writes subjects and leads", () => {
    const now = Date.UTC(2026, 10, 22, 12);
    expect(reminderSubject("Dark Auction", now + 5 * 60_000, now)).toBe(
      "Dark Auction starts in 5 minutes",
    );
    expect(reminderSubject("Dark Auction", now + 30_000, now)).toBe(
      "Dark Auction starts in 1 minute",
    );
    expect(reminderSubject("Dark Auction", now - 60_000, now)).toBe(
      "Dark Auction has started",
    );
    expect(reminderSubject("Spooky Festival", now + 24 * 3_600_000, now)).toBe(
      "Spooky Festival starts in 24 hours",
    );
    expect(formatLead(0)).toBe("When it starts");
    expect(formatLead(15)).toBe("15 minutes before");
    expect(formatLead(1440)).toBe("A day before");
  });

  it("keeps quiet hours in someone's own time zone, across midnight too", () => {
    expect(isTimeZone("Asia/Shanghai")).toBe(true);
    expect(isTimeZone("Mars/Base")).toBe(false);
    expect(isTimeZone("")).toBe(false);
    // 15:30 UTC is 23:30 in Shanghai.
    const at = Date.UTC(2026, 10, 22, 15, 30);
    expect(minuteOfDay(at, "Asia/Shanghai")).toBe(23 * 60 + 30);
    expect(inQuietHours(at, "Asia/Shanghai", 22 * 60, 7 * 60)).toBe(true);
    expect(inQuietHours(at, "UTC", 22 * 60, 7 * 60)).toBe(false);
    expect(inQuietHours(at, "UTC", 15 * 60, 16 * 60)).toBe(true);
    expect(inQuietHours(at, "UTC", null, null)).toBe(false);
    expect(inQuietHours(at, "UTC", 600, 600)).toBe(false);
    expect(parseClock("7:05")).toBe(425);
    expect(parseClock("24:00")).toBeNull();
    expect(formatClock(425)).toBe("07:05");
  });
});

describe("the calendar feed", () => {
  const now = Date.UTC(2026, 10, 22, 12);
  const options = {
    name: "SkyBlock events",
    eventUrl: (slug: string) => `https://www.trilleo.net/e/${slug}/`,
    alarmMinutes: 15,
    now,
    domain: "trilleo.net",
  };

  it("writes each time as an event with a stable UID and an alarm", () => {
    const found = occurrences(
      event("spooky-festival"),
      now,
      now + 200 * 3_600_000,
    );
    const ics = calendarIcs(found, options);
    expect(ics.startsWith("BEGIN:VCALENDAR\r\n")).toBe(true);
    expect(ics.endsWith("END:VCALENDAR\r\n")).toBe(true);
    expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(found.length);
    const first = found[0];
    if (!first) throw new Error("no festival");
    expect(ics).toContain(
      `UID:spooky-festival-${String(first.start)}@trilleo.net`,
    );
    expect(ics).toContain(`DTSTART:${icsDate(first.start)}`);
    expect(ics).toContain("TRIGGER:-PT15M");
    expect(ics).toContain("SUMMARY:Spooky Festival");
    expect(
      ics
        .split("\r\n")
        .every((line) => new TextEncoder().encode(line).length <= 75),
    ).toBe(true);
  });

  it("adds extra words to a time's summary", () => {
    const [contest] = occurrences(
      event("jacobs-farming-contest"),
      now,
      now + 3_600_000,
    );
    if (!contest) throw new Error("no contest");
    const ics = calendarIcs([contest], {
      ...options,
      extra: () => "Wheat, Cactus, Carrot",
    });
    expect(ics).toContain(
      "SUMMARY:Jacob's Farming Contest: Wheat\\, Cactus\\, Carrot",
    );
  });

  it("gives moment-long events a minute, and leaves the alarm out when asked", () => {
    const [auction] = occurrences(event("dark-auction"), now, now + 3_600_000);
    if (!auction) throw new Error("no auction");
    const ics = calendarIcs([auction], { ...options, alarmMinutes: null });
    expect(ics).toContain(`DTEND:${icsDate(auction.start + 60_000)}`);
    expect(ics).not.toContain("VALARM");
  });

  it("escapes text and folds long lines", () => {
    expect(icsDate(Date.UTC(2026, 0, 2, 3, 4, 5))).toBe("20260102T030405Z");
    expect(icsText("a, b; c\\d\ne")).toBe("a\\, b\\; c\\\\d\\ne");
    const long = `DESCRIPTION:${"é".repeat(80)}`;
    const folded = foldLine(long);
    expect(folded.split("\r\n ").join("")).toBe(long);
    for (const line of folded.split("\r\n"))
      expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75);
  });
});
