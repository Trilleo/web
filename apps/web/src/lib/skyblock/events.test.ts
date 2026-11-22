import { describe, expect, it } from "vitest";
import { skyblockTime } from "@trilleo/skyblock/events";
import { eventsIn, utcTime, yearByMonth } from "./events";

describe("the event timer's helpers", () => {
  it("lays a year out by month, marking the current one", () => {
    const now = skyblockTime(527, 8, 11);
    const months = yearByMonth(527, now);
    expect(months).toHaveLength(12);
    expect(months.filter((m) => m.current).map((m) => m.name)).toEqual([
      "Autumn",
    ]);
    const names = (month: number) =>
      months[month - 1]?.starts.map((o) => o.event.slug);
    expect(names(8)).toEqual(["spooky-festival"]);
    expect(names(12)).toEqual([
      "jerrys-workshop",
      "season-of-jerry",
      "new-year-celebration",
    ]);
    // Hourly and monthly events would fill every month: they're left out.
    expect(
      months.flatMap((m) => m.starts).map((o) => o.event.slug),
    ).not.toContain("dark-auction");
    expect(yearByMonth(528, now).some((m) => m.current)).toBe(false);
  });

  it("filters by kind and writes times in UTC", () => {
    expect(eventsIn("farming").map((e) => e.slug)).toEqual([
      "jacobs-farming-contest",
    ]);
    expect(eventsIn(null).length).toBeGreaterThan(5);
    expect(utcTime(Date.UTC(2026, 10, 22, 14, 15))).toBe(
      "Sun 22 Nov, 14:15 UTC",
    );
  });
});
