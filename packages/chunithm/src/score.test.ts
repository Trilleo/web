import { describe, expect, it } from "vitest";
import {
  MAX_SCORE,
  RANKS,
  allowance,
  formatRating,
  justiceLeft,
  maxRating,
  parseRating,
  rankOf,
  ratingOf,
  scoreForRating,
  scoreOf,
} from "./index";

const none = { justice: 0, attack: 0, miss: 0 };

describe("scores", () => {
  it("gives 1,010,000 for all Justice Critical, 1,000,000 for all Justice", () => {
    expect(scoreOf(1234, none)).toBe(MAX_SCORE);
    expect(scoreOf(1234, { ...none, justice: 1234 })).toBe(1_000_000);
    expect(scoreOf(1000, { ...none, attack: 1000 })).toBe(500_000);
    expect(scoreOf(1000, { ...none, miss: 1000 })).toBe(0);
  });

  it("rounds down", () => {
    // 2 of 3 Justice Critical, 1 Justice: (202 + 100) × 10000 / 3 = 1,006,666.67.
    expect(scoreOf(3, { ...none, justice: 1 })).toBe(1_006_666);
  });

  it("refuses counts that don't fit the chart", () => {
    expect(scoreOf(10, { justice: 5, attack: 5, miss: 1 })).toBeNull();
    expect(scoreOf(10, { ...none, justice: -1 })).toBeNull();
    expect(scoreOf(10, { ...none, justice: 1.5 })).toBeNull();
    expect(scoreOf(0, none)).toBeNull();
  });

  it("names ranks by their borders", () => {
    expect(rankOf(MAX_SCORE)).toBe("SSS+");
    expect(rankOf(1_009_000)).toBe("SSS+");
    expect(rankOf(1_008_999)).toBe("SSS");
    expect(rankOf(999_999)).toBe("S+");
    expect(rankOf(499_999)).toBe("D");
  });
});

describe("allowances", () => {
  it("works out the most of each judgement a rank allows", () => {
    // 1,000 notes: SSS+ leaves 1,000 points, a tenth of a note's share... in loss units 100.
    expect(allowance(1000, 1_009_000)).toEqual({
      justice: 100,
      attack: 1,
      miss: 0,
    });
    expect(allowance(1000, 1_007_500)).toEqual({
      justice: 250,
      attack: 4,
      miss: 2,
    });
    // SS and below allow every note to be a Justice.
    expect(allowance(1000, 1_000_000)?.justice).toBe(1000);
    expect(allowance(1000, MAX_SCORE + 1)).toBeNull();
  });

  it("matches counting play by play", () => {
    for (const notes of [1, 7, 333, 1000, 1999, 3547]) {
      for (const rank of RANKS.slice(0, 9)) {
        const allowed = allowance(notes, rank.min);
        if (!allowed) throw new Error("no allowance");
        for (const kind of ["justice", "attack", "miss"] as const) {
          const most = allowed[kind];
          expect(
            scoreOf(notes, { ...none, [kind]: most }),
          ).toBeGreaterThanOrEqual(rank.min);
          if (most < notes)
            expect(scoreOf(notes, { ...none, [kind]: most + 1 })).toBeLessThan(
              rank.min,
            );
        }
      }
    }
  });

  it("trades Justice for Attacks and Misses", () => {
    // SSS on 1,000 notes: 250 units; an Attack and a Miss spend 152 of them.
    expect(justiceLeft(1000, 1_007_500, 1, 1)).toBe(98);
    const score = scoreOf(1000, { justice: 98, attack: 1, miss: 1 });
    expect(score).toBeGreaterThanOrEqual(1_007_500);
    expect(scoreOf(1000, { justice: 99, attack: 1, miss: 1 })).toBeLessThan(
      1_007_500,
    );
    expect(justiceLeft(1000, 1_009_000, 2, 0)).toBeNull();
    // Never more Justice than there are notes left.
    expect(justiceLeft(100, 700_000, 0, 20)).toBe(80);
  });
});

describe("play rating", () => {
  it("follows the bonus table", () => {
    const at = (score: number) => ratingOf(150, score);
    expect(at(MAX_SCORE)).toBe(1715);
    expect(at(1_009_000)).toBe(1715);
    expect(at(1_008_000)).toBe(1705);
    expect(at(1_007_500)).toBe(1700);
    expect(at(1_006_000)).toBe(1670);
    expect(at(1_005_000)).toBe(1650);
    expect(at(1_000_000)).toBe(1600);
    expect(at(990_000)).toBe(1560);
    expect(at(975_000)).toBe(1500);
    expect(at(950_000)).toBe(1350);
    expect(at(925_000)).toBe(1200);
    expect(at(900_000)).toBe(1000);
    expect(at(800_000)).toBe(500);
    expect(at(500_000)).toBe(0);
    expect(ratingOf(10, 950_000)).toBe(0);
  });

  it("never falls as the score rises", () => {
    let last = 0;
    for (let score = 0; score <= MAX_SCORE; score += 997) {
      const rating = ratingOf(143, score);
      expect(rating).toBeGreaterThanOrEqual(last);
      last = rating;
    }
  });

  it("finds the lowest score for a rating", () => {
    expect(scoreForRating(150, 1700)).toBe(1_007_500);
    expect(scoreForRating(150, 1650)).toBe(1_005_000);
    expect(scoreForRating(150, 1701)).toBe(1_007_600);
    expect(scoreForRating(150, 1716)).toBeNull();
    expect(maxRating(150)).toBe(1715);
  });

  it("reads and writes ratings in hundredths", () => {
    expect(parseRating("16.5")).toBe(1650);
    expect(parseRating(" 16.05 ")).toBe(1605);
    expect(parseRating("17")).toBe(1700);
    expect(parseRating("16.505")).toBeNull();
    expect(parseRating("abc")).toBeNull();
    expect(formatRating(1605)).toBe("16.05");
  });
});
