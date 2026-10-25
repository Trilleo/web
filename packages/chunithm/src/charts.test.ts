import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  COLUMN,
  ChartLayoutError,
  TILE_HEIGHT,
  checkOverlaps,
  drawOver,
  findLayout,
  findMeasures,
  parseSdvxImages,
  sdvxImageScript,
  stripHeight,
  stripTile,
  tileRanges,
} from "./index";
import { blank, colourAt, makeChart } from "./testing";

const fixture = (name: string) =>
  readFileSync(new URL(`./fixtures/${name}`, import.meta.url), "utf8");

describe("joining a chart", () => {
  const tops = [100, 60, 150];
  const height = 400;
  const labels = [10, 250, 300, 600, 790];

  it("finds the columns and their tops", () => {
    const { bg } = makeChart(height, tops, labels);
    expect(findLayout(bg)).toEqual({
      width: 650,
      height,
      columns: [
        { lane: 50, top: 100 },
        { lane: 250, top: 60 },
        { lane: 450, top: 150 },
      ],
      overlap: COLUMN.overlap,
    });
  });

  it("stacks the columns into one strip, dropping the shared rows", () => {
    const { bg, obj, total } = makeChart(height, tops, labels);
    const layout = findLayout(bg);
    drawOver(bg, obj);
    checkOverlaps(bg, layout);
    expect(stripHeight(layout)).toBe(total);
    const tile = stripTile(bg, layout, 0, total);
    // Row y of the tile is strip position total - 1 - y: every row has its colour.
    for (let y = 0; y < total; y++) {
      const p = total - 1 - y;
      const i = (y * COLUMN.pitch + COLUMN.gutter + 10) * 4;
      expect([...tile.data.slice(i, i + 4)]).toEqual([...colourAt(p), 255]);
    }
  });

  it("finds where each measure starts", () => {
    const { bg, bar } = makeChart(height, tops, labels);
    expect(findMeasures(bar, findLayout(bg))).toEqual(labels);
  });

  it("accepts a next column that previews the last one's end differently", () => {
    const { bg, obj } = makeChart(height, tops, labels);
    const layout = findLayout(bg);
    drawOver(bg, obj);
    // The second column's lowest rows (its preview of the first) drawn otherwise.
    for (let y = height - COLUMN.overlap / 2; y < height; y++)
      for (let x = 250; x < 400; x++)
        bg.data.set([255, 0, 0, 255], (y * 650 + x) * 4);
    expect(() => {
      checkOverlaps(bg, layout);
    }).not.toThrow();
    // …and the strip keeps the first column's own drawing there.
    const tile = stripTile(bg, layout, 0, stripHeight(layout));
    const total = stripHeight(layout);
    const p = height - 1 - 130; // row 130: in the first column's top band, lower half
    const i = ((total - 1 - p) * COLUMN.pitch + COLUMN.gutter + 10) * 4;
    expect([...tile.data.slice(i, i + 4)]).toEqual([...colourAt(p), 255]);
  });

  it("refuses columns that don't line up", () => {
    const { bg, obj } = makeChart(height, tops, labels);
    const layout = findLayout(bg);
    drawOver(bg, obj);
    // Paint over the second column's shared bottom band.
    for (let y = height - COLUMN.overlap; y < height; y++)
      for (let x = 250; x < 400; x++)
        bg.data.set([255, 0, 0, 255], (y * 650 + x) * 4);
    expect(() => {
      checkOverlaps(bg, layout);
    }).toThrow("Columns 1 and 2 don't line up.");
  });

  it("isn't thrown by nearly clear stray pixels beside a lane", () => {
    const { bg } = makeChart(height, tops, labels);
    const clean = findLayout(bg);
    // As in 《本能》 ～ ReCoda's Master: a few pixels at alpha 3 just past a lane.
    const x = COLUMN.gutter + COLUMN.lane;
    for (let y = 200; y < 208; y++) bg.data[(y * bg.width + x) * 4 + 3] = 3;
    expect(findLayout(bg)).toEqual(clean);
  });

  it("refuses pictures that aren't laid out like sdvx.in's", () => {
    const wrong = blank(650, 400);
    expect(() => findLayout(wrong)).toThrow(ChartLayoutError);
    const narrow = makeChart(400, [100], []).bg;
    for (let y = 0; y < 400; y++)
      narrow.data.fill(0, (y * 250 + 190) * 4, (y * 250 + 200) * 4);
    expect(() => findLayout(narrow)).toThrow("is 140px wide");
    expect(() => findLayout(blank(650, 100))).toThrow("isn't a chart's");
  });

  it("flattens onto black and draws layers over each other", () => {
    const under = blank(1, 1);
    under.data.set([100, 100, 100, 255]);
    const over = blank(1, 1);
    over.data.set([200, 0, 0, 128]);
    drawOver(under, over);
    expect([...under.data]).toEqual([150, 50, 50, 255]);
    expect(() => {
      drawOver(blank(1, 1), blank(2, 1));
    }).toThrow("aren't the same size");
  });

  it("cuts the strip into tiles from the bottom", () => {
    expect(tileRanges(5000)).toEqual([
      [0, TILE_HEIGHT],
      [TILE_HEIGHT, 2 * TILE_HEIGHT],
      [2 * TILE_HEIGHT, 5000],
    ]);
    expect(tileRanges(0)).toEqual([]);
  });
});

describe("sdvx.in's chart layers", () => {
  it("finds the script that draws a chart page", () => {
    expect(sdvxImageScript("11/11061mst")).toBe("/chunithm/11/js/11061data.js");
    expect(sdvxImageScript("end/01066end2")).toBe(
      "/chunithm/end/js/01066end2.js",
    );
    expect(sdvxImageScript("ult/11006ult")).toBe(
      "/chunithm/ult/js/11006ult.js",
    );
    expect(sdvxImageScript("x")).toBeNull();
  });

  it("reads the three layers and the mirrored notes", () => {
    expect(parseSdvxImages(fixture("11061data.txt"), "11/11061mst")).toEqual({
      bg: "/chunithm/11/bg/11061bg.png",
      obj: "/chunithm/11/obj/data11061mst.png",
      bar: "/chunithm/11/bg/11061bar.png",
      mirror: "/chunithm/11/obj/mirror11061mst.png",
    });
    expect(
      parseSdvxImages(fixture("01066end2-images.txt"), "end/01066end2"),
    ).toEqual({
      bg: "/chunithm/end/bg/01066bg.png",
      obj: "/chunithm/end/obj/data01066end2.png",
      bar: "/chunithm/end/bg/01066bar.png",
      mirror: "/chunithm/end/obj/mirror01066end2.png",
    });
    // Basic has no picture in this script.
    expect(parseSdvxImages(fixture("11061data.txt"), "11/11061bsc")).toBeNull();
  });
});
