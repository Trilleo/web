/**
 * For tests: chart pictures drawn the way sdvx.in draws them, small enough to build
 * in a test (see charts.ts for the layout).
 */
import { COLUMN, type RgbaImage } from "./charts";

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
