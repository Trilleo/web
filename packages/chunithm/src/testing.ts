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

/** The lanes' grey at strip position p: a beat line every BEAT rows, as sdvx.in's. */
export const BEAT = 8;
export const laneAt = (p: number): number[] =>
  p % BEAT === 0 ? [120, 120, 120, 255] : [20, 20, 20, 255];

/**
 * Draws a chart: lanes (`laneAt`) under a strip with a colour per row (`colourAt`)
 * and measure labels at the given positions, cut into columns with these tops that share COLUMN.overlap rows
 * with the next. Returns the three layers and the strip's height.
 */
export function makeChart(height: number, tops: number[], labels: number[]) {
  const width = COLUMN.gutter + tops.length * COLUMN.pitch;
  const bg = blank(width, height);
  const obj = blank(width, height);
  const bar = blank(width, height);
  const set = (image: RgbaImage, x: number, y: number, rgba: number[]) => {
    image.data.set(rgba, (y * width + x) * 4);
  };
  let start = 0;
  tops.forEach((top, k) => {
    const lane = COLUMN.gutter + k * COLUMN.pitch;
    // Column k shows the strip from just below where the last one ended, upwards.
    const first = k === 0 ? 0 : start - COLUMN.overlap;
    for (let y = height - 1; y >= top; y--) {
      const p = first + (height - 1 - y);
      for (let x = lane; x < lane + COLUMN.lane; x++) {
        set(bg, x, y, laneAt(p));
        set(obj, x, y, [...colourAt(p), 255]);
      }
      if (labels.some((label) => p >= label && p < label + 10))
        for (let x = lane - 20; x < lane - 5; x++)
          set(bar, x, y, [255, 255, 255, 255]);
    }
    start = first + (height - top);
  });
  return { bg, obj, bar, total: start };
}
