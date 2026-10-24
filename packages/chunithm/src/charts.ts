/**
 * Joining an sdvx.in chart picture into one strip. Pure: works on RGBA pixels (the
 * site decodes the PNGs and encodes the tiles, apps/web/src/lib/chunithm/build.ts).
 *
 * sdvx.in draws a chart as three layers of the same size, stacked: the lanes (bg),
 * the notes (obj; or the mirrored notes) and the measure numbers (bar). Each is a row
 * of columns COLUMN.pitch apart: a gutter holding the measure numbers, then the lane.
 * A column is read from the bottom up; the next column carries on above where it ends.
 * Every column's content runs down to the image's bottom edge, from its own top (a
 * column holds whole measures, so heights differ), and neighbours overlap: the top
 * COLUMN.overlap rows of one column are the bottom rows of the next.
 *
 * Positions on the joined strip are counted in pixels from its bottom (`p`), where
 * the chart starts, as the viewer reads it.
 */

export const COLUMN = {
  /** From one column's gutter to the next's. */
  pitch: 200,
  /** The measure numbers' strip, left of the lane. */
  gutter: 50,
  lane: 150,
  /** Rows a column shares with the next one. */
  overlap: 48,
} as const;

/** Sizes we accept: anything else isn't one of sdvx.in's chart pictures. */
export const CHART_LIMITS = {
  minHeight: 200,
  maxHeight: 4096,
  maxColumns: 200,
  /** Pixels that may differ (by more than `tolerance` in a channel) in a shared band. */
  mismatch: 0.005,
  tolerance: 8,
};

/** The joined strip is cut into tiles this tall (the last one shorter). */
export const TILE_HEIGHT = 2048;

/** A picture that isn't laid out the way sdvx.in lays out charts. */
export class ChartLayoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ChartLayoutError";
  }
}

export interface RgbaImage {
  width: number;
  height: number;
  /** width × height × 4 bytes, rows top to bottom. */
  data: Uint8Array;
}

export interface ChartLayout {
  width: number;
  height: number;
  /** Each column's lane (left edge) and its first row with anything in it. */
  columns: { lane: number; top: number }[];
  overlap: number;
}

/** A run of the strip: one column's rows, from `bottomRow` upwards. */
interface Segment {
  column: number;
  /** Where it starts on the strip (p). */
  start: number;
  length: number;
  bottomRow: number;
}

/**
 * Finds the columns in the lanes layer: runs of columns that have anything drawn,
 * each a lane wide, on the pitch. Throws ChartLayoutError otherwise.
 */
export function findLayout(bg: RgbaImage): ChartLayout {
  const { width, height, data } = bg;
  if (height < CHART_LIMITS.minHeight || height > CHART_LIMITS.maxHeight)
    throw new ChartLayoutError(`Height ${String(height)} isn't a chart's.`);
  const opaqueAt = (x: number, y: number) =>
    (data[(y * width + x) * 4 + 3] ?? 0) > 0;
  const used = (x: number) => {
    for (let y = 0; y < height; y += 4) if (opaqueAt(x, y)) return true;
    return false;
  };
  const runs: [number, number][] = [];
  let start = -1;
  for (let x = 0; x <= width; x++) {
    const on = x < width && used(x);
    if (on && start < 0) start = x;
    if (!on && start >= 0) {
      runs.push([start, x]);
      start = -1;
    }
  }
  if (runs.length === 0) throw new ChartLayoutError("No lanes found.");
  if (runs.length > CHART_LIMITS.maxColumns)
    throw new ChartLayoutError(`${String(runs.length)} columns is too many.`);
  const columns = runs.map(([left, right], index) => {
    if (right - left !== COLUMN.lane)
      throw new ChartLayoutError(
        `Column ${String(index + 1)} is ${String(right - left)}px wide, not ${String(COLUMN.lane)}.`,
      );
    if (left !== COLUMN.gutter + index * COLUMN.pitch)
      throw new ChartLayoutError(
        `Column ${String(index + 1)} starts at ${String(left)}px, off the grid.`,
      );
    let top = 0;
    search: for (; top < height; top++)
      for (let x = left; x < right; x += 3) if (opaqueAt(x, top)) break search;
    return { lane: left, top };
  });
  for (const [index, column] of columns.entries())
    if (height - column.top <= COLUMN.overlap && index < columns.length - 1)
      throw new ChartLayoutError(`Column ${String(index + 1)} is empty.`);
  return { width, height, columns, overlap: COLUMN.overlap };
}

/**
 * Checks that the columns line up: each column's top band shows the next column's
 * bottom band. Only the band's upper half is compared (gutter included): there, past
 * the shared measure line, the lower column previews what the next one draws for
 * real. In the lower half the next column previews the lower one's end, and sdvx.in
 * sometimes draws that preview differently (side rails left off, as in Oracle's
 * Expert); the strip keeps the lower column's own drawing of it. Throws
 * ChartLayoutError naming the first pair that doesn't line up.
 */
export function checkOverlaps(image: RgbaImage, layout: ChartLayout): void {
  const { width, data } = image;
  const { height, overlap } = layout;
  for (let k = 0; k + 1 < layout.columns.length; k++) {
    const lower = layout.columns[k];
    const upper = layout.columns[k + 1];
    if (!lower || !upper) continue;
    let differing = 0;
    let total = 0;
    for (let i = 0; i < overlap / 2; i++) {
      const a = lower.top + i;
      const b = height - overlap + i;
      for (let x = -COLUMN.gutter; x < COLUMN.lane; x++) {
        const ia = (a * width + lower.lane + x) * 4;
        const ib = (b * width + upper.lane + x) * 4;
        total++;
        for (let c = 0; c < 4; c++)
          if (
            Math.abs((data[ia + c] ?? 0) - (data[ib + c] ?? 0)) >
            CHART_LIMITS.tolerance
          ) {
            differing++;
            break;
          }
      }
    }
    if (differing > total * CHART_LIMITS.mismatch)
      throw new ChartLayoutError(
        `Columns ${String(k + 1)} and ${String(k + 2)} don't line up.`,
      );
  }
}

function segments(layout: ChartLayout): Segment[] {
  const list: Segment[] = [];
  let start = 0;
  layout.columns.forEach((column, index) => {
    // The first column keeps its bottom; the others' bottoms are the band below
    // them, already in the column before.
    const bottomRow =
      index === 0 ? layout.height - 1 : layout.height - 1 - layout.overlap;
    const length = bottomRow - column.top + 1;
    list.push({ column: index, start, length, bottomRow });
    start += length;
  });
  return list;
}

/** The joined strip's height. */
export function stripHeight(layout: ChartLayout): number {
  return segments(layout).reduce((sum, segment) => sum + segment.length, 0);
}

/** For each strip position p, its column and row in the source picture. */
function locate(
  list: Segment[],
  p: number,
): { column: number; row: number } | null {
  for (const segment of list)
    if (p >= segment.start && p < segment.start + segment.length)
      return {
        column: segment.column,
        row: segment.bottomRow - (p - segment.start),
      };
  return null;
}

/**
 * Copies strip rows [from, to) (positions from the bottom) into an image COLUMN.pitch
 * wide, top row first, flattened onto black (opaque).
 */
export function stripTile(
  image: RgbaImage,
  layout: ChartLayout,
  from: number,
  to: number,
): RgbaImage {
  const list = segments(layout);
  const width = COLUMN.pitch;
  const height = to - from;
  const out = new Uint8Array(width * height * 4);
  for (let y = 0; y < height; y++) {
    const p = to - 1 - y;
    const at = locate(list, p);
    if (!at) continue;
    const lane = layout.columns[at.column]?.lane ?? 0;
    const left = lane - COLUMN.gutter;
    for (let x = 0; x < width; x++) {
      const sx = left + x;
      const o = (y * width + x) * 4;
      if (sx < 0 || sx >= image.width) {
        out[o + 3] = 255;
        continue;
      }
      const i = (at.row * image.width + sx) * 4;
      const alpha = image.data[i + 3] ?? 0;
      out[o] = Math.round(((image.data[i] ?? 0) * alpha) / 255);
      out[o + 1] = Math.round(((image.data[i + 1] ?? 0) * alpha) / 255);
      out[o + 2] = Math.round(((image.data[i + 2] ?? 0) * alpha) / 255);
      out[o + 3] = 255;
    }
  }
  return { width, height, data: out };
}

/** Tile bounds on the strip, bottom first: [from, to) positions. */
export function tileRanges(height: number): [number, number][] {
  const ranges: [number, number][] = [];
  for (let from = 0; from < height; from += TILE_HEIGHT)
    ranges.push([from, Math.min(height, from + TILE_HEIGHT)]);
  return ranges;
}

/**
 * Where each measure starts on the strip (p, measure 1 first), from the numbers in
 * the gutter of the measure-number layer: each label's bottom row is its line.
 */
export function findMeasures(bar: RgbaImage, layout: ChartLayout): number[] {
  const list = segments(layout);
  const total = stripHeight(layout);
  const measures: number[] = [];
  let inLabel = false;
  for (let p = 0; p < total; p++) {
    const at = locate(list, p);
    let marked = false;
    if (at) {
      const lane = layout.columns[at.column]?.lane ?? 0;
      for (let x = lane - COLUMN.gutter; x < lane && !marked; x++)
        if ((bar.data[(at.row * bar.width + x) * 4 + 3] ?? 0) > 0)
          marked = true;
    }
    if (marked && !inLabel) measures.push(p);
    inLabel = marked;
  }
  return measures;
}

/** Layers on top of the lanes, in place: `over` drawn over `under` (both RGBA). */
export function drawOver(under: RgbaImage, over: RgbaImage): void {
  if (under.width !== over.width || under.height !== over.height)
    throw new ChartLayoutError("The layers aren't the same size.");
  const a = under.data;
  const b = over.data;
  for (let i = 0; i < a.length; i += 4) {
    const ob = b[i + 3] ?? 0;
    if (ob === 0) continue;
    if (ob === 255) {
      a[i] = b[i] ?? 0;
      a[i + 1] = b[i + 1] ?? 0;
      a[i + 2] = b[i + 2] ?? 0;
      a[i + 3] = 255;
      continue;
    }
    const oa = a[i + 3] ?? 0;
    const outA = ob + (oa * (255 - ob)) / 255;
    for (let c = 0; c < 3; c++)
      a[i + c] = Math.round(
        ((b[i + c] ?? 0) * ob + ((a[i + c] ?? 0) * oa * (255 - ob)) / 255) /
          outA,
      );
    a[i + 3] = Math.round(outA);
  }
}

/** What the viewer needs to show a built chart (kept by the site, served as JSON). */
export interface ChartManifest {
  v: 1;
  /** The strip's width (COLUMN.pitch): gutter, then lane. */
  width: number;
  height: number;
  gutter: number;
  lane: number;
  /** Bottom first; each `height` rows of the strip. */
  tiles: { url: string; height: number }[];
  /** Where each measure starts, from the bottom; measure 1 first. */
  measures: number[];
  columns: number;
}
