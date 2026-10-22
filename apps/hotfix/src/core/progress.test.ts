import { describe, expect, it } from "vitest";
import { autoplay } from "./autopilot";
import { FPS } from "./content";
import { newRun, replay } from "./engine";
import {
  ACCESSORIES,
  ACHIEVEMENTS,
  MAX_INPUTS,
  MAX_RUN_FRAMES,
  dailySeed,
  dayOf,
  isDay,
  newlyEarned,
  packInputs,
  previousDay,
  resultOf,
  unlockedAccessories,
  unlockedBy,
  unpackInputs,
  type Totals,
} from "./progress";

const NO_TOTALS: Totals = { runs: 1, tokens: 0, furthest: 0, dailyDays: 0 };

describe("the Daily Run", () => {
  it("has one course per UTC day", () => {
    expect(dayOf(Date.UTC(2026, 9, 22, 23, 59))).toBe("2026-10-22");
    expect(dayOf(Date.UTC(2026, 9, 23, 0, 1))).toBe("2026-10-23");
    expect(dailySeed("2026-10-22")).toBe(dailySeed("2026-10-22"));
    expect(dailySeed("2026-10-22")).not.toBe(dailySeed("2026-10-23"));
    expect(previousDay("2026-03-01")).toBe("2026-02-28");
  });

  it("knows a day when it sees one", () => {
    expect(isDay("2026-10-22")).toBe(true);
    expect(isDay("2026-02-30")).toBe(false);
    expect(isDay("22/10/2026")).toBe(false);
    expect(isDay(20261022)).toBe(false);
  });
});

describe("input logs", () => {
  it("pack small, and a real run's log unpacks to the same run", () => {
    const { state, log } = autoplay(newRun(4), FPS * 30);
    const packed = packInputs(log);
    expect(JSON.stringify(packed).length).toBeLessThan(
      JSON.stringify(log).length / 3,
    );
    const unpacked = unpackInputs(JSON.parse(JSON.stringify(packed)));
    expect(unpacked).toEqual(log);
    expect(resultOf(replay(4, unpacked ?? [], state.frame))).toEqual(
      resultOf(state),
    );
  });

  it("refuse anything else", () => {
    expect(unpackInputs("jump")).toBeNull();
    expect(unpackInputs([{ f: 1, i: "jump" }])).toBeNull();
    expect(unpackInputs([1.5])).toBeNull();
    expect(unpackInputs([-1])).toBeNull();
    expect(unpackInputs([(MAX_RUN_FRAMES + 1) * 4])).toBeNull();
    expect(
      unpackInputs(Array.from({ length: MAX_INPUTS + 1 }, () => 0)),
    ).toBeNull();
    expect(unpackInputs([])).toEqual([]);
  });
});

describe("achievements", () => {
  it("have unique ids, and every accessory is unlocked by one", () => {
    const ids = ACHIEVEMENTS.map((achievement) => achievement.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const accessory of ACCESSORIES) {
      expect(unlockedBy(accessory.id), accessory.id).toBeDefined();
    }
  });

  it("a first run says hello; long runs earn the distance ones", () => {
    const short = newRun(1);
    expect(newlyEarned(short, NO_TOTALS, [])).toEqual(["hello-world"]);
    const { state } = autoplay(newRun(2), FPS * 90);
    const earned = newlyEarned(state, NO_TOTALS, ["hello-world"]);
    expect(earned).toContain("server-room");
    expect(earned).toContain("cloud");
    expect(earned).not.toContain("hello-world");
  });

  it("counts totals across runs", () => {
    const run = newRun(1);
    expect(
      newlyEarned(run, { ...NO_TOTALS, dailyDays: 3, runs: 100 }, [
        "hello-world",
      ]),
    ).toEqual(["daily-driver", "veteran"]);
  });

  it("unlock accessories", () => {
    expect(unlockedAccessories(["hello-world", "ship-it", "cloud"])).toEqual([
      "cap",
      "crown",
    ]);
  });
});
