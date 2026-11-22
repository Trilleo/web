import { describe, expect, it } from "vitest";
import { electionPath, shareSeries, sparkline } from "./elections";

describe("election helpers", () => {
  it("turns hourly votes into each candidate's share", () => {
    const series = shareSeries(
      [
        { hour: new Date(0), votes: { a: 30, b: 10 } },
        { hour: new Date(1), votes: { a: 50, b: 50 } },
        { hour: new Date(2), votes: {} },
      ],
      ["a", "b"],
    );
    expect(series.get("a")).toEqual([0.75, 0.5, 0]);
    expect(series.get("b")).toEqual([0.25, 0.5, 0]);
  });

  it("draws a sparkline across the box, scaled to a peak", () => {
    expect(sparkline([0, 0.5, 1], 100, 10)).toBe("0.0,10.0 50.0,5.0 100.0,0.0");
    expect(sparkline([0.25], 100, 10, 0.5)).toBe("50.0,5.0");
    expect(sparkline([], 100, 10)).toBe("");
    expect(electionPath(527)).toBe("/tools/skyblock/events/elections/527/");
  });
});
