/**
 * For tests: chart pictures drawn the way sdvx.in draws them, small enough to build
 * in a test (see charts.ts for the layout).
 */
import { COLUMN, OLD_COLUMN, type RgbaImage } from "./charts";

export const blank = (width: number, height: number): RgbaImage => ({
  width,
  height,
  data: new Uint8Array(width * height * 4),
});

/** The colour a test strip has at position p (from the bottom), opaque. */
export const colourAt = (p: number): [number, number, number] => [
  p % 251,
  Math.floor(p / 251) % 251,
  128,
];

/**
 * The lanes' grey at strip position p: a faint beat line every BEAT rows, and a
 * measure line at the positions in `lines` (sdvx.in's run across each shared band).
 */
export const BEAT = 8;
export const laneAt = (
  p: number,
  lines: ReadonlySet<number> = new Set(),
): number[] => {
  if (lines.has(p)) return [120, 120, 120, 255];
  return p % BEAT === 0 ? [40, 40, 40, 255] : [20, 20, 20, 255];
};

/**
 * Draws a chart: lanes (`laneAt`) under a strip with a colour per row (`colourAt`)
 * and measure labels at the given positions, cut into columns with these tops that
 * share COLUMN.overlap rows with the next, with the measure line they hand over on
 * across the middle of each shared band. Returns the three layers, the strip's
 * height and the measure lines' positions.
 */
export function makeChart(height: number, tops: number[], labels: number[]) {
  const width = COLUMN.gutter + tops.length * COLUMN.pitch;
  const bg = blank(width, height);
  const obj = blank(width, height);
  const bar = blank(width, height);
  const set = (image: RgbaImage, x: number, y: number, rgba: number[]) => {
    image.data.set(rgba, (y * width + x) * 4);
  };
  // Column k shows the strip from just below where the last one ended, upwards.
  const firsts: number[] = [];
  const lines = new Set<number>();
  let start = 0;
  tops.forEach((top, k) => {
    const first = k === 0 ? 0 : start - COLUMN.overlap;
    firsts.push(first);
    start = first + (height - top);
    // The band's rows measureLine - 1 and measureLine, from its top (p = start - 1).
    if (k < tops.length - 1)
      for (const row of [COLUMN.measureLine - 1, COLUMN.measureLine])
        lines.add(start - 1 - row);
  });
  tops.forEach((top, k) => {
    const lane = COLUMN.gutter + k * COLUMN.pitch;
    const first = firsts[k] ?? 0;
    for (let y = height - 1; y >= top; y--) {
      const p = first + (height - 1 - y);
      for (let x = lane; x < lane + COLUMN.lane; x++) {
        set(bg, x, y, laneAt(p, lines));
        set(obj, x, y, [...colourAt(p), 255]);
      }
      if (labels.some((label) => p >= label && p < label + 10))
        for (let x = lane - 20; x < lane - 5; x++)
          set(bar, x, y, [255, 255, 255, 255]);
    }
  });
  return { bg, obj, bar, total: start, lines };
}

/**
 * A full-size layer drawn the way sdvx.in's older site drew it (see OLD_COLUMN): half
 * the rows, lanes squeezed to OLD_COLUMN.lane, the gutter's right part halved.
 */
export function makeOldLayer(image: RgbaImage): RgbaImage {
  const columns = (image.width - COLUMN.gutter) / COLUMN.pitch;
  const width = columns * OLD_COLUMN.pitch + OLD_COLUMN.margin;
  const height = Math.ceil(image.height / 2);
  const old = blank(width, height);
  const copy = (sx: number, sy: number, x: number, y: number) => {
    const i = (Math.min(sy, image.height - 1) * image.width + sx) * 4;
    old.data.set(image.data.subarray(i, i + 4), (y * width + x) * 4);
  };
  for (let y = 0; y < height; y++)
    for (let k = 0; k < columns; k++) {
      const left = k * COLUMN.pitch;
      const oldLeft = k * OLD_COLUMN.pitch;
      for (
        let r = OLD_COLUMN.gutter - OLD_COLUMN.label;
        r < OLD_COLUMN.gutter;
        r++
      )
        copy(
          left + COLUMN.gutter - 2 * (OLD_COLUMN.gutter - r),
          2 * y,
          oldLeft + r,
          y,
        );
      for (let x = 0; x < OLD_COLUMN.lane; x++)
        copy(
          left +
            COLUMN.gutter +
            Math.floor((x * COLUMN.lane) / OLD_COLUMN.lane),
          2 * y,
          oldLeft + OLD_COLUMN.gutter + x,
          y,
        );
    }
  return old;
}

/** Notes `drawNote` draws, as sdvx.in draws them. */
export type TestNote =
  | "tap"
  | "extap"
  | "flick"
  | "hold"
  | "hold-end"
  | "slide"
  | "extap-hold"
  | "air-tap";

type Rgba = [number, number, number, number];

/** Rows of a bar, from its line's row (0) down: each the pixel drawn there. */
const SPRITES: Record<string, [number, Rgba][]> = {
  // Highlight, then the coloured edge a row under the line, then a faint fade.
  tap: [
    [-1, [255, 236, 236, 240]],
    [0, [255, 220, 219, 237]],
    [1, [250, 110, 116, 200]],
    [2, [179, 41, 65, 97]],
  ],
  extap: [
    [-1, [255, 255, 200, 222]],
    [0, [255, 255, 194, 240]],
    [1, [253, 255, 140, 255]],
    [2, [224, 246, 196, 34]],
  ],
  flick: [
    [0, [197, 248, 255, 133]],
    [1, [163, 254, 253, 255]],
    [2, [90, 235, 250, 118]],
  ],
  hold: [
    [0, [255, 211, 192, 255]],
    [1, [255, 184, 109, 217]],
    [2, [224, 151, 96, 109]],
  ],
  slide: [
    [0, [199, 220, 255, 231]],
    [1, [128, 135, 233, 207]],
    [2, [51, 79, 224, 50]],
  ],
  // Under an air arrow only the bar's faint edge shows.
  air: [
    [-6, [39, 249, 7, 254]],
    [-5, [39, 249, 7, 254]],
    [-4, [42, 248, 3, 253]],
    [-3, [81, 252, 40, 253]],
    [-2, [162, 250, 84, 213]],
    [-1, [249, 207, 100, 110]],
    [2, [212, 89, 37, 86]],
    [3, [240, 86, 83, 38]],
  ],
};
const HOLD_BODY: Rgba = [230, 120, 252, 153];
const SLIDE_BODY: Rgba = [140, 210, 255, 251];

/**
 * Draws a note on a notes layer, its line on row `row` of the column whose lane starts
 * at `lane`, across cells [from, to) of the 16 (judgement.ts's PLAYFIELD: 6px cells
 * from 27px into the lane), leaving the pixel between neighbouring notes clear as
 * sdvx.in does. Holds and slides get a body above (their end, "hold-end", one below).
 */
export function drawNote(
  image: RgbaImage,
  lane: number,
  row: number,
  from: number,
  to: number,
  kind: TestNote,
): void {
  const x0 = lane + 27 + from * 6;
  const x1 = lane + 27 + to * 6 - 1;
  const put = (y: number, rgba: Rgba) => {
    if (y < 0 || y >= image.height) return;
    for (let x = x0; x < x1; x++)
      image.data.set(rgba, (y * image.width + x) * 4);
  };
  const body = (first: number, last: number, rgba: Rgba) => {
    for (let y = first; y <= last; y++) put(y, rgba);
  };
  if (kind === "hold" || kind === "extap-hold")
    body(row - 30, row - 2, HOLD_BODY);
  if (kind === "hold-end") body(row + 3, row + 30, HOLD_BODY);
  if (kind === "slide") body(row - 30, row - 1, SLIDE_BODY);
  const sprite =
    kind === "air-tap"
      ? SPRITES.air
      : kind === "extap-hold"
        ? SPRITES.extap
        : kind === "hold-end"
          ? SPRITES.hold
          : SPRITES[kind];
  for (const [dy, rgba] of sprite ?? []) put(row + dy, rgba);
}
