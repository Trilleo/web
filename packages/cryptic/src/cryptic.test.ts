import { describe, expect, it } from "vitest";
import {
  addDays,
  answerFits,
  checkGuess,
  dayEnd,
  dayOf,
  enumerationOf,
  formatEnumeration,
  isDay,
  letterCount,
  normalizeAnswer,
  parseEnumeration,
  streaks,
} from "./index";

describe("enumerations", () => {
  it("read the usual ways of writing them", () => {
    expect(parseEnumeration("(6)")).toEqual({ lengths: [6], joins: [] });
    expect(parseEnumeration("4, 3")).toEqual({ lengths: [4, 3], joins: [","] });
    expect(parseEnumeration("(5-4,2)")).toEqual({
      lengths: [5, 4, 2],
      joins: ["-", ","],
    });
    for (const bad of ["", "()", "6a", "4,,3", "0", "21", "(4,3"])
      expect(parseEnumeration(bad), bad).toBeNull();
  });

  it("print in brackets and count letters", () => {
    const enumeration = parseEnumeration("5-4,2");
    expect(enumeration && formatEnumeration(enumeration)).toBe("(5-4,2)");
    expect(enumeration && letterCount(enumeration)).toBe(11);
  });

  it("come from an answer as written", () => {
    const of = (answer: string) => {
      const e = enumerationOf(answer);
      return e && formatEnumeration(e);
    };
    expect(of("Listen")).toBe("(6)");
    expect(of("ice cream")).toBe("(3,5)");
    expect(of("well-known fact")).toBe("(4-5,4)");
    expect(of("don't")).toBe("(4)");
    expect(of("  ")).toBeNull();
    const two = parseEnumeration("3,5");
    expect(two && answerFits("ICE CREAM", two)).toBe(true);
    expect(two && answerFits("ICECREAM", two)).toBe(false);
  });
});

describe("guesses", () => {
  const enumeration = parseEnumeration("3,5");
  if (!enumeration) throw new Error("enumeration");

  it("compare letters only", () => {
    expect(normalizeAnswer("Café-au lait!")).toBe("CAFEAULAIT");
    expect(checkGuess("icecream", "ICE CREAM", enumeration)).toEqual({
      kind: "correct",
    });
    expect(checkGuess("Ice-Créam", "ICE CREAM", enumeration).kind).toBe(
      "correct",
    );
    expect(checkGuess("ice crumb", "ICE CREAM", enumeration).kind).toBe(
      "wrong",
    );
  });

  it("don't count the wrong number of letters", () => {
    expect(checkGuess("ice", "ICE CREAM", enumeration)).toEqual({
      kind: "length",
      letters: 8,
      got: 3,
    });
  });
});

describe("days", () => {
  it("are UTC days", () => {
    expect(dayOf(new Date("2026-10-23T23:59:59Z"))).toBe("2026-10-23");
    expect(addDays("2026-10-31", 1)).toBe("2026-11-01");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
    expect(dayEnd("2026-10-23").toISOString()).toBe("2026-10-24T00:00:00.000Z");
    expect(isDay("2026-02-29")).toBe(false);
    expect(isDay("2028-02-29")).toBe(true);
    expect(isDay("2026-1-01")).toBe(false);
  });
});

describe("streaks", () => {
  const days = ["2026-10-19", "2026-10-20", "2026-10-22", "2026-10-23"];

  it("count puzzles in a row, skipping days without one", () => {
    expect(
      streaks(
        days,
        new Set(["2026-10-19", "2026-10-20", "2026-10-22"]),
        "2026-10-23",
      ),
    ).toEqual({ current: 3, best: 3 });
  });

  it("keep today's open until it ends", () => {
    expect(
      streaks(days, new Set(["2026-10-22", "2026-10-23"]), "2026-10-23"),
    ).toEqual({
      current: 2,
      best: 2,
    });
    expect(streaks(days, new Set(["2026-10-20"]), "2026-10-23")).toEqual({
      current: 0,
      best: 1,
    });
    expect(streaks([], new Set(), "2026-10-23")).toEqual({
      current: 0,
      best: 0,
    });
  });
});
