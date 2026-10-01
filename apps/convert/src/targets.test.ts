import { describe, expect, it } from "vitest";
import {
  AUDIO_TARGETS,
  IMAGE_TARGETS,
  fitWithin,
  imageTarget,
  trimProblem,
  uniqueNames,
} from "./targets";

describe("fitWithin", () => {
  it("shrinks to fit, keeping the aspect ratio", () => {
    expect(fitWithin(4000, 3000, 1600, null)).toEqual({
      width: 1600,
      height: 1200,
    });
    expect(fitWithin(4000, 3000, 1600, 900)).toEqual({
      width: 1200,
      height: 900,
    });
    expect(fitWithin(3000, 4000, null, 1000)).toEqual({
      width: 750,
      height: 1000,
    });
  });

  it("never enlarges, and never goes below 1 px", () => {
    expect(fitWithin(300, 200, 1600, 1600)).toEqual({
      width: 300,
      height: 200,
    });
    expect(fitWithin(300, 200, null, null)).toEqual({
      width: 300,
      height: 200,
    });
    expect(fitWithin(5000, 2, 100, null)).toEqual({ width: 100, height: 1 });
  });
});

describe("trimProblem", () => {
  it("accepts open and valid ranges", () => {
    expect(trimProblem(null, null)).toBeNull();
    expect(trimProblem(2, null)).toBeNull();
    expect(trimProblem(null, 10)).toBeNull();
    expect(trimProblem(1.5, 3)).toBeNull();
  });

  it("explains bad ones", () => {
    expect(trimProblem(-1, null)).toMatch(/negative/);
    expect(trimProblem(null, 0)).toMatch(/after 0/);
    expect(trimProblem(5, 5)).toMatch(/after the start/);
  });
});

describe("uniqueNames", () => {
  it("numbers repeats, ignoring case", () => {
    expect(
      uniqueNames(["a.png", "b.png", "A.png", "a.png", "a (2).png"]),
    ).toEqual(["a.png", "b.png", "A (2).png", "a (3).png", "a (2) (2).png"]);
    expect(uniqueNames(["README", "README"])).toEqual(["README", "README (2)"]);
  });
});

describe("targets", () => {
  it("have unique ids and extensions", () => {
    for (const list of [IMAGE_TARGETS, AUDIO_TARGETS]) {
      const ids = list.map((target) => target.id as string);
      expect(new Set(ids).size).toBe(ids.length);
    }
    expect(imageTarget("jpeg").ext).toBe("jpg");
    expect(() => imageTarget("nope" as "png")).toThrow();
  });
});
