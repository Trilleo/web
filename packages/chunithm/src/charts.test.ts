import { describe, expect, it } from "vitest";
import {
  COLUMN,
  ChartLayoutError,
  TILE_HEIGHT,
  checkOverlaps,
  drawOver,
  findLayout,
  findMeasures,
  fitOldLayer,
  isOldLayer,
  stripHeight,
  stripTile,
  tileRanges,
} from "./index";
import {
  BEAT,
  blank,
  colourAt,
  laneAt,
  makeChart,
  makeOldLayer,
} from "./testing";

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
    checkOverlaps(bg, obj, layout);
    drawOver(bg, obj);
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
    // The second column's lowest rows (its preview of the first, below the measure
    // line they share) drawn otherwise.
    for (let y = height - COLUMN.overlap / 2 + 2; y < height; y++)
      for (let x = 250; x < 400; x++) {
        bg.data.set([255, 0, 0, 255], (y * 650 + x) * 4);
        obj.data.set([255, 0, 0, 0], (y * 650 + x) * 4);
      }
    expect(() => {
      checkOverlaps(bg, obj, layout);
    }).not.toThrow();
    drawOver(bg, obj);
    // …and the strip keeps the first column's own drawing there.
    const tile = stripTile(bg, layout, 0, stripHeight(layout));
    const total = stripHeight(layout);
    const p = height - 1 - 130; // row 130: in the first column's top band, lower half
    const i = ((total - 1 - p) * COLUMN.pitch + COLUMN.gutter + 10) * 4;
    expect([...tile.data.slice(i, i + 4)]).toEqual([...colourAt(p), 255]);
  });

  it("accepts bands drawn differently on a shared measure line", () => {
    const { bg, obj } = makeChart(height, tops, labels);
    const layout = findLayout(bg);
    // As sdvx.in does: what's past the line previewed otherwise, and lane dividers
    // drawn in one column only.
    for (
      let y = height - COLUMN.overlap;
      y < height - COLUMN.measureLine - 4;
      y++
    )
      for (let x = 250; x < 400; x++) obj.data[(y * 650 + x) * 4 + 3] = 0;
    for (let y = height - COLUMN.overlap; y < height; y++)
      for (const x of [290, 330, 370])
        bg.data.set([88, 88, 88, 255], (y * 650 + x) * 4);
    expect(() => {
      checkOverlaps(bg, obj, layout);
    }).not.toThrow();
  });

  it("puts a column's top by its measure line where its lanes start short", () => {
    const { bg } = makeChart(height, tops, labels);
    const clean = findLayout(bg);
    // As in 呪歌-JyuKa-'s Master: the first column's lanes start 4 rows into its band.
    for (let y = 100; y < 104; y++)
      for (let x = 50; x < 200; x++) bg.data[(y * 650 + x) * 4 + 3] = 0;
    expect(findLayout(bg)).toEqual(clean);
  });

  it("refuses columns that don't line up", () => {
    const { bg, obj } = makeChart(height, tops, labels);
    const layout = findLayout(bg);
    // Paint over the second column's shared bottom band.
    for (let y = height - COLUMN.overlap; y < height; y++)
      for (let x = 250; x < 400; x++)
        bg.data.set([255, 0, 0, 255], (y * 650 + x) * 4);
    expect(() => {
      checkOverlaps(bg, obj, layout);
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

describe("lossy layers", () => {
  const tops = [100, 60];
  const height = 400;

  /**
   * A two-column chart whose second column's bottom band is moved `shift` rows down
   * (lanes and notes), with `noise` added to its notes' colour the way lossy WebP
   * wobbles pixels (alternating up and down; alpha is lossless, so it stays).
   */
  const shared = (shift: number, noise: number) => {
    const { bg, obj, lines } = makeChart(height, tops, []);
    const layout = findLayout(bg);
    const upper = layout.columns[1];
    if (!upper) throw new Error("two columns expected");
    const first = layout.height - 1 - (layout.columns[0]?.top ?? 0) + 1;
    for (let y = height - layout.overlap; y < height; y++) {
      const p = first - layout.overlap + (height - 1 - y) - shift;
      for (let x = upper.lane; x < upper.lane + COLUMN.lane; x++) {
        const i = (y * bg.width + x) * 4;
        bg.data.set(laneAt(p, lines), i);
        const wobble = (x + y) % 2 === 0 ? noise : -noise;
        const colour = colourAt(p).map((v) =>
          Math.max(0, Math.min(255, v + wobble)),
        );
        obj.data.set([...colour, p % BEAT === 1 ? 128 : 255], i);
      }
    }
    // The lower column's notes get the same alpha, so only the shift tells them apart.
    const lower = layout.columns[0];
    if (lower)
      for (let y = lower.top; y < lower.top + layout.overlap; y++) {
        const p = first - 1 - (y - lower.top);
        for (let x = lower.lane; x < lower.lane + COLUMN.lane; x++)
          obj.data[(y * bg.width + x) * 4 + 3] = p % BEAT === 1 ? 128 : 255;
      }
    return { bg, obj, layout };
  };

  it("ignores the notes' colour, which lossy WebP wobbles", () => {
    const { bg, obj, layout } = shared(0, 60);
    expect(() => {
      checkOverlaps(bg, obj, layout);
    }).not.toThrow();
  });

  it("still refuses columns a row out", () => {
    for (const shift of [1, -1]) {
      const { bg, obj, layout } = shared(shift, 0);
      expect(() => {
        checkOverlaps(bg, obj, layout);
      }).toThrow("Columns 1 and 2 don't line up.");
    }
  });

  it("compares the notes' alpha where no measure line shows", () => {
    const { bg, obj, layout } = shared(1, 0);
    // Lanes without any lines: only the notes' alpha shows the shift.
    for (let i = 0; i < bg.data.length; i += 4)
      if ((bg.data[i + 3] ?? 0) > 0) bg.data.set([20, 20, 20, 255], i);
    expect(() => {
      checkOverlaps(bg, obj, layout);
    }).toThrow("Columns 1 and 2 don't line up.");
  });

  it("ignores the gutter, where the columns may number measures differently", () => {
    const { bg, obj, layout } = shared(0, 0);
    const upper = layout.columns[1];
    if (!upper) throw new Error("two columns expected");
    for (let y = height - layout.overlap; y < height; y++)
      for (let x = upper.lane - COLUMN.gutter; x < upper.lane; x++)
        bg.data.set([255, 255, 255, 255], (y * bg.width + x) * 4);
    expect(() => {
      checkOverlaps(bg, obj, layout);
    }).not.toThrow();
  });
});

describe("sdvx.in's older, half-size layers", () => {
  const tops = [100, 60, 150];
  const height = 400;
  const labels = [10, 250, 300, 600, 790];

  it("recognises them by their size", () => {
    const { bg, obj } = makeChart(height, tops, labels);
    const old = makeOldLayer(bg);
    expect(old.width).toBe(3 * 104 + 8);
    expect(isOldLayer(old, obj)).toBe(true);
    expect(isOldLayer(bg, obj)).toBe(false);
    expect(isOldLayer({ width: old.width + 1, height: old.height }, obj)).toBe(
      false,
    );
    expect(isOldLayer({ width: old.width, height: 100 }, obj)).toBe(false);
  });

  it("redraws them on the full-size grid, where they line up with the notes", () => {
    const { bg, obj, bar } = makeChart(height, tops, labels);
    const lanes = fitOldLayer(makeOldLayer(bg), obj, true);
    const layout = findLayout(lanes);
    expect(layout).toEqual(findLayout(bg));
    expect(() => {
      checkOverlaps(lanes, obj, layout);
    }).not.toThrow();
    // Measure numbers keep their rows, to the row halving's nearest.
    const measures = findMeasures(fitOldLayer(makeOldLayer(bar), obj), layout);
    expect(measures).toHaveLength(labels.length);
    measures.forEach((p, i) => {
      expect(Math.abs(p - (labels[i] ?? 0))).toBeLessThanOrEqual(1);
    });
  });

  it("clears older lanes that run on above where the notes start", () => {
    // As in Oshama Scramble!'s Master: the older lanes' last column is longer.
    const longer = makeChart(height, [100, 60, 100], labels).bg;
    const { obj } = makeChart(height, tops, labels);
    const lanes = fitOldLayer(makeOldLayer(longer), obj, true);
    expect(findLayout(lanes).columns.map((column) => column.top)).toEqual(tops);
  });
});
