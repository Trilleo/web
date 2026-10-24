import { describe, expect, it } from "vitest";
import {
  SHEET_OVERLAP,
  columnOf,
  crisp,
  measureAt,
  measureStart,
  placeTiles,
  sheetColumns,
  tilesIn,
} from "./layout";

const manifest = {
  v: 1 as const,
  width: 200,
  height: 5000,
  gutter: 50,
  lane: 150,
  tiles: [
    { url: "a", height: 2048 },
    { url: "b", height: 2048 },
    { url: "c", height: 904 },
  ],
  measures: [24, 408, 792, 1176],
  columns: 3,
};

describe("the viewer's geometry", () => {
  it("places tiles from the bottom", () => {
    const tiles = placeTiles(manifest);
    expect(tiles).toEqual([
      { url: "a", from: 0, to: 2048 },
      { url: "b", from: 2048, to: 4096 },
      { url: "c", from: 4096, to: 5000 },
    ]);
    expect(tilesIn(tiles, 2000, 2100).map((t) => t.url)).toEqual(["a", "b"]);
    expect(tilesIn(tiles, 4096, 5000).map((t) => t.url)).toEqual(["c"]);
  });

  it("cuts the sheet into columns that overlap a little", () => {
    const columns = sheetColumns(5000, 1000);
    expect(columns[0]).toEqual({ from: 0, to: 1000 });
    expect(columns[1]).toEqual({
      from: 1000 - SHEET_OVERLAP,
      to: 2000 - SHEET_OVERLAP,
    });
    expect(columns.at(-1)?.to).toBe(5000);
    expect(columnOf(columns, 1500)).toBe(1);
    // Never absurdly short columns, even on a tiny screen.
    expect(sheetColumns(5000, 10)[0]).toEqual({ from: 0, to: 240 });
  });

  it("finds measures", () => {
    expect(measureAt(manifest.measures, 0)).toBe(0);
    expect(measureAt(manifest.measures, 24)).toBe(1);
    expect(measureAt(manifest.measures, 500)).toBe(2);
    expect(measureAt(manifest.measures, 99999)).toBe(4);
    expect(measureStart(manifest.measures, 3)).toBe(792);
    expect(measureStart(manifest.measures, 99)).toBe(1176);
    expect(measureStart(manifest.measures, -2)).toBe(24);
    expect(measureStart([], 3)).toBe(0);
  });

  it("draws hard edges only on whole-pixel scales", () => {
    expect(crisp(1, 1)).toBe(true);
    expect(crisp(1, 2)).toBe(true);
    expect(crisp(2, 1.5)).toBe(true);
    expect(crisp(1, 1.25)).toBe(false);
  });
});
