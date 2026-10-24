import { describe, expect, it } from "vitest";
import { chartOfKey, isSavedChart, savedKey } from "./meta";

describe("saved charts", () => {
  it("keys favourites and recent views by chart", () => {
    expect(savedKey("favourite", 2710, "master")).toBe("f-2710-master");
    expect(savedKey("recent", 2710, "expert")).toBe("r-2710-expert");
    expect(chartOfKey("f-2710-master")).toEqual({
      kind: "favourite",
      songId: 2710,
      difficulty: "master",
    });
    expect(chartOfKey("f-2710-hardest")).toBeNull();
    expect(chartOfKey("x")).toBeNull();
  });

  it("accepts only what the tool saves", () => {
    expect(isSavedChart({ kind: "favourite" })).toBe(true);
    expect(
      isSavedChart({ kind: "recent", at: "2026-10-24T08:00:00.000Z" }),
    ).toBe(true);
    expect(isSavedChart({ kind: "recent", at: "soon" })).toBe(false);
    expect(isSavedChart({ kind: "favourite", extra: 1 })).toBe(false);
    expect(isSavedChart({ kind: "other" })).toBe(false);
    expect(isSavedChart(null)).toBe(false);
  });
});
