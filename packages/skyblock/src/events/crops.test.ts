import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { skyblockTime } from "./calendar";
import {
  contestCrops,
  cropName,
  isContestStart,
  readJacobCrops,
} from "./crops";
import { eventBySlug, occurrences } from "./events";

/** The Skyblocker calendar feed as read on 22 November 2026 (three contests and an auction). */
const FIXTURE: unknown = JSON.parse(
  readFileSync(new URL("./fixtures/crops.json", import.meta.url), "utf8"),
);

describe("Jacob's crops", () => {
  it("reads each contest's crops by its start, in the game's names", () => {
    const schedule = readJacobCrops(FIXTURE);
    expect(Object.keys(schedule.contests)).toHaveLength(3);
    expect(contestCrops(schedule, 1795083300_000)).toEqual([
      "Wheat",
      "Nether Wart",
      "Cocoa Beans",
    ]);
    // "Melon Slice" is the game's Melon.
    expect(contestCrops(schedule, 1795090500_000)).toContain("Melon");
    expect(contestCrops(schedule, 1)).toBeNull();
    expect(contestCrops(null, 1795083300_000)).toBeNull();
  });

  it("keeps only real contest times and known crops", () => {
    const contest = eventBySlug("jacobs-farming-contest");
    if (!contest) throw new Error("no contest");
    const [first] = occurrences(
      contest,
      skyblockTime(527, 1, 1),
      skyblockTime(527, 1, 4),
    );
    expect(first && isContestStart(first.start)).toBe(true);
    expect(isContestStart(skyblockTime(527, 1, 1))).toBe(false);
    const read = readJacobCrops([
      {
        event: "Jacob's Farming Contest",
        timestamp: 1795083300,
        extras: ["Wheat", "Gold", "Potato"],
      },
      {
        event: "Jacob's Farming Contest",
        timestamp: 1795083301,
        extras: ["Wheat", "Carrot", "Potato"],
      },
      {
        event: "Jacob's Farming Contest",
        timestamp: 1795086900,
        extras: ["Wheat", "Carrot", "Potato"],
      },
    ]);
    expect(Object.keys(read.contests)).toEqual(["1795086900000"]);
    expect(() => readJacobCrops([])).toThrow();
    expect(() => readJacobCrops({})).toThrow();
    expect(cropName("Cocoa Bean")).toBe("Cocoa Beans");
    expect(cropName("Diamond")).toBeNull();
  });
});
