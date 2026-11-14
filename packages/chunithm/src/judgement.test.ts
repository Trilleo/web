import { describe, expect, it } from "vitest";
import { COLUMN, type ChartLayout, type RgbaImage } from "./charts";
import {
  JUDGEMENT_COLOURS,
  JUDGEMENT_WINDOWS,
  PLAYFIELD,
  chartBpm,
  countNotes,
  countsAgree,
  drawRanges,
  findNotes,
  judgementRanges,
  pixelsPerMs,
  type ChartNote,
  type RangeBand,
} from "./judgement";
import { blank, drawNote } from "./testing";

const HEIGHT = 400;
const LANE = COLUMN.gutter;

/** One column, the whole height. */
const single: ChartLayout = {
  width: COLUMN.gutter + COLUMN.pitch,
  height: HEIGHT,
  columns: [{ lane: LANE, top: 0 }],
  overlap: COLUMN.overlap,
};

const notesLayer = () => blank(single.width, single.height);
/** The strip position of row `row` in the single column. */
const at = (row: number) => HEIGHT - 1 - row;

describe("finding notes in sdvx.in's notes layer", () => {
  it("finds taps, ExTaps and flicks where they are, by their colour", () => {
    const image = notesLayer();
    drawNote(image, LANE, 300, 0, 4, "tap");
    drawNote(image, LANE, 250, 4, 12, "extap");
    drawNote(image, LANE, 200, 12, 16, "flick");
    expect(findNotes(image, single)).toEqual([
      { p: at(300), from: 0, to: 4, kind: "tap" },
      { p: at(250), from: 4, to: 12, kind: "extap" },
      { p: at(200), from: 12, to: 16, kind: "flick" },
    ]);
  });

  it("parts notes side by side, and keeps a wide note whole", () => {
    const image = notesLayer();
    drawNote(image, LANE, 300, 0, 4, "tap");
    drawNote(image, LANE, 300, 4, 8, "tap");
    drawNote(image, LANE, 200, 2, 14, "tap");
    expect(
      findNotes(image, single).map((note) => [note.p, note.from, note.to]),
    ).toEqual([
      [at(300), 0, 4],
      [at(300), 4, 8],
      [at(200), 2, 14],
    ]);
  });

  it("judges a hold's or slide's start, not its end", () => {
    const image = notesLayer();
    drawNote(image, LANE, 350, 0, 4, "hold");
    drawNote(image, LANE, 250, 0, 4, "hold-end");
    drawNote(image, LANE, 150, 8, 12, "slide");
    expect(findNotes(image, single)).toEqual([
      { p: at(350), from: 0, to: 4, kind: "hold" },
      { p: at(150), from: 8, to: 12, kind: "slide" },
    ]);
  });

  it("judges an ExTap that starts a hold like an ExTap, counted with holds", () => {
    const image = notesLayer();
    drawNote(image, LANE, 300, 4, 8, "extap-hold");
    expect(findNotes(image, single)).toEqual([
      { p: at(300), from: 4, to: 8, kind: "hold", ex: true },
    ]);
  });

  it("finds a tap under an air arrow by its faint edge", () => {
    const image = notesLayer();
    drawNote(image, LANE, 300, 2, 6, "air-tap");
    expect(findNotes(image, single)).toEqual([
      { p: at(300), from: 2, to: 6, kind: "tap" },
    ]);
  });

  it("takes nothing from a hold body's gradient or an empty layer", () => {
    expect(findNotes(notesLayer(), single)).toEqual([]);
    const image = notesLayer();
    // Purple to red to orange, half opaque, many rows: a body, not a bar.
    for (let y = 100; y < 160; y++)
      for (let x = LANE + 30; x < LANE + 60; x++)
        image.data.set(
          [255, 80 + (y - 100) * 2, 120, 170],
          (y * image.width + x) * 4,
        );
    expect(findNotes(image, single)).toEqual([]);
  });

  it("finds a note in two columns' shared band once", () => {
    // Two columns: the first's top band is the second's bottom band.
    const layout: ChartLayout = {
      width: COLUMN.gutter + 2 * COLUMN.pitch,
      height: HEIGHT,
      columns: [
        { lane: COLUMN.gutter, top: 100 },
        { lane: COLUMN.gutter + COLUMN.pitch, top: 0 },
      ],
      overlap: COLUMN.overlap,
    };
    const image = blank(layout.width, layout.height);
    // Row 120 of the first column is row HEIGHT - 48 + 20 of the second.
    drawNote(image, COLUMN.gutter, 120, 0, 4, "tap");
    drawNote(image, COLUMN.gutter + COLUMN.pitch, HEIGHT - 28, 0, 4, "tap");
    const notes = findNotes(image, layout);
    expect(notes).toHaveLength(1);
    expect(notes[0]?.p).toBe(HEIGHT - 1 - 120);
  });

  it("counts as sdvx.in does: taps take ExTaps and hold and slide starts", () => {
    const notes: ChartNote[] = [
      { p: 0, from: 0, to: 4, kind: "tap" },
      { p: 10, from: 0, to: 4, kind: "extap" },
      { p: 20, from: 0, to: 4, kind: "hold" },
      { p: 30, from: 0, to: 4, kind: "slide", ex: true },
      { p: 40, from: 0, to: 4, kind: "flick" },
    ];
    expect(countNotes(notes)).toEqual({ tap: 4, flick: 1 });
    expect(countsAgree({ tap: 95, flick: 10 }, { tap: 100, flick: 10 })).toBe(
      true,
    );
    expect(countsAgree({ tap: 80, flick: 10 }, { tap: 100, flick: 10 })).toBe(
      false,
    );
    expect(countsAgree({ tap: 110, flick: 0 }, { tap: 100, flick: 0 })).toBe(
      false,
    );
    // A handful of flicks is too few to judge by.
    expect(countsAgree({ tap: 100, flick: 1 }, { tap: 100, flick: 4 })).toBe(
      true,
    );
    expect(countsAgree({ tap: 1, flick: 0 }, null)).toBeNull();
  });
});

describe("a chart's BPM and scale", () => {
  it("reads the song's BPM, or the chart's own", () => {
    expect(chartBpm("125", "master")).toBe(125);
    expect(chartBpm("440(MASTER譜面のみ220)", "master")).toBe(220);
    expect(chartBpm("440(MASTER譜面のみ220)", "expert")).toBe(440);
    expect(chartBpm("", "master")).toBeNull();
    expect(chartBpm(null, "master")).toBeNull();
    expect(chartBpm("?", "master")).toBeNull();
  });

  it("measures pixels per millisecond from the commonest measure", () => {
    // sdvx.in drew Contrapasso -inferno- (243 BPM) at 240px a measure.
    expect(pixelsPerMs([0, 240, 480, 600, 840, 1080], 243)).toBeCloseTo(
      0.243,
      6,
    );
    expect(pixelsPerMs([0, 240], 243)).toBeNull();
    expect(pixelsPerMs([], 120)).toBeNull();
  });
});

/** px per ms that makes the normal windows 10, 20 and 30px. */
const SCALE = 10 / JUDGEMENT_WINDOWS.normal.critical;

const bandsOf = (bands: RangeBand[], judgement: string, side: string) =>
  bands
    .filter((band) => band.judgement === judgement && band.side === side)
    .map(({ p0, p1, from, to, cut }) => ({
      p0: Math.round(p0 * 10) / 10,
      p1: Math.round(p1 * 10) / 10,
      from,
      to,
      cut,
    }));

describe("judgement ranges", () => {
  it("rings a tap with each judgement, early below and late above", () => {
    const bands = judgementRanges(
      [{ p: 100, from: 4, to: 8, kind: "tap" }],
      SCALE,
    );
    const j = (JUDGEMENT_WINDOWS.normal.justice * 10) / 33.3;
    const a = (JUDGEMENT_WINDOWS.normal.attack * 10) / 33.3;
    expect(bandsOf(bands, "critical", "early")).toEqual([
      { p0: 90, p1: 100, from: 4, to: 8, cut: false },
    ]);
    expect(bandsOf(bands, "critical", "late")).toEqual([
      { p0: 100, p1: 110, from: 4, to: 8, cut: false },
    ]);
    expect(bandsOf(bands, "justice", "late")).toEqual([
      {
        p0: 110,
        p1: Math.round((100 + j) * 10) / 10,
        from: 4,
        to: 8,
        cut: false,
      },
    ]);
    expect(bandsOf(bands, "attack", "early")).toEqual([
      {
        p0: Math.round((100 - a) * 10) / 10,
        p1: Math.round((100 - j) * 10) / 10,
        from: 4,
        to: 8,
        cut: false,
      },
    ]);
  });

  it("makes an ExTap or a flick a Justice Critical all the way out", () => {
    for (const kind of ["extap", "flick"] as const) {
      const bands = judgementRanges([{ p: 100, from: 0, to: 4, kind }], SCALE);
      expect(new Set(bands.map((band) => band.judgement))).toEqual(
        new Set(["critical"]),
      );
      expect(bandsOf(bands, "critical", "late")[0]?.p1).toBeCloseTo(
        100 + JUDGEMENT_WINDOWS.critical.critical * SCALE,
        1,
      );
    }
  });

  it("splits close notes' windows halfway, across the whole note", () => {
    // 30px apart in the same cells: the midpoint is 15px from each.
    const bands = judgementRanges(
      [
        { p: 100, from: 0, to: 4, kind: "tap" },
        { p: 130, from: 0, to: 4, kind: "tap" },
      ],
      SCALE,
    );
    const late = bands.filter(
      (band) => band.side === "late" && band.p0 >= 100 && band.p1 <= 115.01,
    );
    expect(
      late.map((band) => [band.judgement, band.p0, band.p1, band.cut]),
    ).toEqual([
      ["critical", 100, 110, false],
      ["justice", 110, 115, true],
    ]);
    // Nothing of the first note's reaches past the midpoint.
    expect(bands.filter((band) => band.p0 < 115 && band.p1 > 115)).toEqual([]);
  });

  it("cuts a Justice Critical only where the notes overlap", () => {
    // 12px apart, overlapping in cells 2–3: midpoint 6px out.
    const bands = judgementRanges(
      [
        { p: 100, from: 0, to: 4, kind: "tap" },
        { p: 112, from: 2, to: 6, kind: "tap" },
      ],
      SCALE,
    );
    const first = bands.filter(
      (band) => band.side === "late" && band.p0 === 100,
    );
    expect(
      first.map((band) => [band.judgement, band.from, band.to, band.p1]),
    ).toEqual([
      ["critical", 0, 2, 110],
      ["critical", 2, 4, 106],
    ]);
    // Its Justice and Attack are gone on that side.
    expect(
      bands.filter(
        (band) =>
          band.side === "late" &&
          band.p0 >= 100 &&
          band.p0 < 112 &&
          band.judgement !== "critical",
      ),
    ).toEqual([]);
  });

  it("leaves chords and notes in other lanes alone", () => {
    const alone = judgementRanges(
      [{ p: 100, from: 0, to: 4, kind: "tap" }],
      SCALE,
    ).length;
    const chord = judgementRanges(
      [
        { p: 100, from: 0, to: 4, kind: "tap" },
        { p: 101, from: 2, to: 6, kind: "tap" },
      ],
      SCALE,
    );
    expect(chord.every((band) => !band.cut)).toBe(true);
    const apart = judgementRanges(
      [
        { p: 100, from: 0, to: 4, kind: "tap" },
        { p: 110, from: 8, to: 12, kind: "tap" },
      ],
      SCALE,
    );
    expect(apart).toHaveLength(alone * 2);
    expect(apart.every((band) => !band.cut)).toBe(true);
  });
});

describe("drawing ranges", () => {
  const pixel = (image: RgbaImage, x: number, y: number) =>
    Array.from(
      image.data.subarray(
        (y * image.width + x) * 4,
        (y * image.width + x) * 4 + 4,
      ),
    );

  it("tints the note's cells on the lanes, and nothing beside them", () => {
    const picture = blank(single.width, single.height);
    picture.data.fill(0);
    for (let i = 3; i < picture.data.length; i += 4) picture.data[i] = 255;
    const bands = judgementRanges(
      [{ p: at(200), from: 4, to: 8, kind: "tap" }],
      SCALE,
    );
    drawRanges(picture, single, bands);
    const x = LANE + PLAYFIELD.left + 5 * PLAYFIELD.cell;
    // Early (below the note, rows under 200) in the Justice Critical's gold.
    const [r, g, b] = pixel(picture, x, 205);
    const [cr, cg, cb] = JUDGEMENT_COLOURS.critical;
    expect(r).toBeGreaterThan(cb);
    expect(Math.abs((r ?? 0) / (g ?? 1) - cr / cg)).toBeLessThan(0.1);
    expect(b).toBeLessThan(r ?? 0);
    // Other cells and far rows stay black.
    expect(pixel(picture, LANE + PLAYFIELD.left + 1, 205)).toEqual([
      0, 0, 0, 255,
    ]);
    expect(pixel(picture, x, 300)).toEqual([0, 0, 0, 255]);
  });

  it("draws in both columns where a position shows twice", () => {
    const layout: ChartLayout = {
      width: COLUMN.gutter + 2 * COLUMN.pitch,
      height: HEIGHT,
      columns: [
        { lane: COLUMN.gutter, top: 100 },
        { lane: COLUMN.gutter + COLUMN.pitch, top: 0 },
      ],
      overlap: COLUMN.overlap,
    };
    const picture = blank(layout.width, layout.height);
    const p = HEIGHT - 1 - 120;
    drawRanges(picture, layout, [
      {
        p0: p,
        p1: p + 1,
        from: 0,
        to: 4,
        judgement: "attack",
        side: "late",
        cut: false,
      },
    ]);
    const x = (lane: number) => lane + PLAYFIELD.left + 1;
    expect(pixel(picture, x(COLUMN.gutter), 120)[3]).toBeGreaterThan(0);
    expect(
      pixel(picture, x(COLUMN.gutter + COLUMN.pitch), HEIGHT - 28)[3],
    ).toBeGreaterThan(0);
  });
});
