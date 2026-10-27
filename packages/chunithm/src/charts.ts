/**
 * Joining an sdvx.in chart picture into one strip. Pure: works on RGBA pixels (the
 * site decodes the WebP layers and encodes the tiles, apps/web/src/lib/chunithm/).
 *
 * sdvx.in draws a chart as three layers of the same size, stacked: the lanes (bg),
 * the notes (obj; or the mirrored notes) and the measure numbers (bar). Each is a row
 * of columns COLUMN.pitch apart: a gutter holding the measure numbers, then the lane.
 * A column is read from the bottom up; the next column carries on above where it ends.
 * Every column's content runs down to the image's bottom edge, from its own top (a
 * column holds whole measures, so heights differ), and neighbours overlap: the top
 * COLUMN.overlap rows of one column are the bottom rows of the next. The measure line
 * where one column hands over to the next runs across the middle of that band, in
 * the lanes layer, ending on its row COLUMN.measureLine.
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
  /** The shared band's measure line (two rows thick): its last row, from the band's top. */
  measureLine: 24,
} as const;

/** How opaque a lanes-layer pixel must be to count as lane (out of 255). */
export const LANE_ALPHA = 128;

/** Sizes we accept: anything else isn't one of sdvx.in's chart pictures. */
export const CHART_LIMITS = {
  minHeight: 200,
  maxHeight: 4096,
  maxColumns: 200,
  /**
   * A lanes-layer row is a measure line where at least `lineWidth` of the lane's
   * pixels are more than `lineContrast` brighter (out of 255) than the rows `lineGap`
   * above and below. sdvx.in's lines span about 100px between the side rails.
   */
  lineWidth: 80,
  lineContrast: 20,
  lineGap: 3,
  /** How far from where it belongs a column's measure line is looked for. */
  lineSearch: 8,
  /**
   * Where no measure line shows (notes drawn over it): the share of a shared band's
   * lane pixels that may differ. Lined up, sdvx.in's columns mostly match exactly on
   * what's compared, while a row out differs on 2.7% or more.
   */
  mismatch: 0.005,
  /** How far a notes-layer alpha may be off (it's lossless, so this is slack). */
  alphaTolerance: 8,
  /** How far a lanes-layer colour channel may be off (lossy, but flat grey). */
  colourTolerance: 16,
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
  /**
   * Each column's lane (left edge) and its top: its first row with anything in it,
   * or, where the lanes are drawn a few rows short or long, where its measure line
   * puts it.
   */
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
 * Where a measure line ends near row `near` of a lane in the lanes layer: the last
 * row of the line closest to it, within CHART_LIMITS.lineSearch rows, or null.
 */
function measureLineEnd(
  lanes: RgbaImage,
  lane: number,
  near: number,
): number | null {
  const { width, height, data } = lanes;
  const { lineWidth, lineContrast, lineGap, lineSearch } = CHART_LIMITS;
  const luma = (x: number, y: number) => {
    if (y < 0 || y >= height) return 0;
    const i = (y * width + x) * 4;
    const sum = (data[i] ?? 0) + (data[i + 1] ?? 0) + (data[i + 2] ?? 0);
    return (sum / 3) * ((data[i + 3] ?? 0) / 255);
  };
  const isLine = (y: number) => {
    let bright = 0;
    for (let x = lane; x < lane + COLUMN.lane; x++) {
      const v = luma(x, y);
      if (v > luma(x, y - lineGap) + lineContrast)
        if (v > luma(x, y + lineGap) + lineContrast) bright++;
    }
    return bright >= lineWidth;
  };
  let best: number | null = null;
  for (let y = near - lineSearch; y <= near + lineSearch; y++)
    if (isLine(y) && !isLine(y + 1))
      if (best === null || Math.abs(y - near) < Math.abs(best - near)) best = y;
  return best;
}

/**
 * Finds the columns in the lanes layer: runs of columns that have anything drawn,
 * each a lane wide, on the pitch. Throws ChartLayoutError otherwise. A column's top
 * is where its lanes start, unless its measure line says otherwise: sdvx.in draws
 * some columns' lanes a few rows short (06102's Master, by 4).
 */
export function findLayout(bg: RgbaImage): ChartLayout {
  const { width, height, data } = bg;
  if (height < CHART_LIMITS.minHeight || height > CHART_LIMITS.maxHeight)
    throw new ChartLayoutError(`Height ${String(height)} isn't a chart's.`);
  // Lanes are solid; sdvx.in leaves stray, nearly clear pixels beside some (alpha 3
  // at the edge of 《本能》 ～ ReCoda's Master), which mustn't widen a column.
  const opaqueAt = (x: number, y: number) =>
    (data[(y * width + x) * 4 + 3] ?? 0) >= LANE_ALPHA;
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
    if (index < runs.length - 1) {
      const end = measureLineEnd(bg, left, top + COLUMN.measureLine);
      if (end !== null) top = Math.max(0, end - COLUMN.measureLine);
    }
    return { lane: left, top };
  });
  for (const [index, column] of columns.entries())
    if (height - column.top <= COLUMN.overlap && index < columns.length - 1)
      throw new ChartLayoutError(`Column ${String(index + 1)} is empty.`);
  return { width, height, columns, overlap: COLUMN.overlap };
}

/**
 * Checks that the columns line up: each column's top band shows the next column's
 * bottom band. The measure line they hand over on decides: it must end on the band's
 * row COLUMN.measureLine in both (findLayout has already put the lower column's top
 * by it, so this checks the next column's band is where the layout says).
 *
 * The bands' drawing can't decide: sdvx.in draws each column on its own, and the two
 * often differ while lining up (measured on 1,904 pairs): notes a row apart from
 * rounding, a measure line one row thicker, lane dividers in one only, what's past
 * the line previewed differently (11029's Master), measure numbers placed or labelled
 * differently in the gutter. So only where notes hide a line is the drawing compared,
 * on what WebP keeps nearly exactly: the notes' alpha (lossless) and the lanes' flat
 * colour, in the lane, the band's upper half. Throws ChartLayoutError naming the
 * first pair that doesn't line up.
 */
export function checkOverlaps(
  lanes: RgbaImage,
  notes: RgbaImage,
  layout: ChartLayout,
): void {
  const { height, overlap } = layout;
  for (let k = 0; k + 1 < layout.columns.length; k++) {
    const lower = layout.columns[k];
    const upper = layout.columns[k + 1];
    if (!lower || !upper) continue;
    const band = height - overlap;
    const lowerLine = measureLineEnd(
      lanes,
      lower.lane,
      lower.top + COLUMN.measureLine,
    );
    const upperLine = measureLineEnd(
      lanes,
      upper.lane,
      band + COLUMN.measureLine,
    );
    const linedUp =
      lowerLine !== null && upperLine !== null
        ? lowerLine - lower.top === COLUMN.measureLine &&
          upperLine - band === COLUMN.measureLine
        : drawnAlike(lanes, notes, layout, lower, upper);
    if (!linedUp)
      throw new ChartLayoutError(
        `Columns ${String(k + 1)} and ${String(k + 2)} don't line up.`,
      );
  }
}

/** Whether two columns' shared band is drawn alike (see checkOverlaps). */
function drawnAlike(
  lanes: RgbaImage,
  notes: RgbaImage,
  layout: ChartLayout,
  lower: { lane: number; top: number },
  upper: { lane: number; top: number },
): boolean {
  const { width } = lanes;
  const { height, overlap } = layout;
  const { alphaTolerance, colourTolerance } = CHART_LIMITS;
  const rows = overlap / 2;
  let differing = 0;
  for (let y = 0; y < rows; y++)
    for (let x = 0; x < COLUMN.lane; x++) {
      const ia = ((lower.top + y) * width + lower.lane + x) * 4;
      const ib = ((height - overlap + y) * width + upper.lane + x) * 4;
      let differs =
        Math.abs((notes.data[ia + 3] ?? 0) - (notes.data[ib + 3] ?? 0)) >
        alphaTolerance;
      for (let c = 0; c < 4 && !differs; c++)
        differs =
          Math.abs((lanes.data[ia + c] ?? 0) - (lanes.data[ib + c] ?? 0)) >
          colourTolerance;
      if (differs) differing++;
    }
  return differing <= rows * COLUMN.lane * CHART_LIMITS.mismatch;
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

/**
 * sdvx.in's older drawing of a layer: a few charts (Oshama Scramble!'s and
 * 乗り切れ受験ウォーズ's Masters) still have their lanes, and sometimes their measure
 * numbers, as a half-size picture from its older site, under full-size notes. Its
 * columns are OLD_COLUMN.pitch apart (a gutter, then a lane), every row is half a row
 * of the full-size grid, counted from the top, and the picture is `margin` wider than
 * its columns. sdvx.in's viewer stretches it over the notes; `fitOldLayer` redraws
 * it on the full-size grid instead.
 */
export const OLD_COLUMN = {
  pitch: 104,
  gutter: 20,
  lane: 71,
  margin: 8,
  /** The gutter's columns kept, from its right: wider, it holds the last lane's BPM. */
  label: 12,
} as const;

/** Whether `layer` is sdvx.in's older, half-size drawing of a picture `size` big. */
export function isOldLayer(
  layer: { width: number; height: number },
  size: { width: number; height: number },
): boolean {
  const columns = (size.width - COLUMN.gutter) / COLUMN.pitch;
  return (
    Number.isInteger(columns) &&
    layer.width === columns * OLD_COLUMN.pitch + OLD_COLUMN.margin &&
    Math.abs(layer.height * 2 - size.height) <= COLUMN.overlap
  );
}

/**
 * Redraws an older, half-size layer (see OLD_COLUMN) the size of `notes`: rows
 * doubled from the top, lanes stretched to COLUMN.lane, and the measure numbers
 * doubled and set against the lane, as sdvx.in sets them. Its BPM changes, drawn past
 * the lane, are left out. For the lanes, `clip` clears each column above where its
 * notes start: the notes are the current drawing, and the older lanes may run on.
 */
export function fitOldLayer(
  old: RgbaImage,
  notes: RgbaImage,
  clip = false,
): RgbaImage {
  const { width, height } = notes;
  const out = new Uint8Array(width * height * 4);
  const columns = (width - COLUMN.gutter) / COLUMN.pitch;
  const keep = OLD_COLUMN.label * 2;
  for (let y = 0; y < height; y++) {
    const sy = Math.min(Math.floor((y + 1) / 2), old.height - 1);
    for (let k = 0; k < columns; k++) {
      const left = k * COLUMN.pitch;
      const oldLeft = k * OLD_COLUMN.pitch;
      for (let dx = COLUMN.gutter - keep; dx < COLUMN.pitch; dx++) {
        const sx =
          dx < COLUMN.gutter
            ? oldLeft + OLD_COLUMN.gutter - Math.ceil((COLUMN.gutter - dx) / 2)
            : oldLeft +
              OLD_COLUMN.gutter +
              Math.floor(
                ((dx - COLUMN.gutter) * OLD_COLUMN.lane) / COLUMN.lane,
              );
        const i = (sy * old.width + sx) * 4;
        out.set(old.data.subarray(i, i + 4), (y * width + left + dx) * 4);
      }
    }
  }
  if (clip)
    for (let k = 0; k < columns; k++) {
      const lane = COLUMN.gutter + k * COLUMN.pitch;
      let top = 0;
      search: for (; top < height; top++)
        for (let x = lane; x < lane + COLUMN.lane; x++)
          if ((notes.data[(top * width + x) * 4 + 3] ?? 0) > 0) break search;
      for (let y = 0; y < top; y++)
        out.fill(
          0,
          (y * width + lane) * 4,
          (y * width + lane + COLUMN.lane) * 4,
        );
    }
  return { width, height, data: out };
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
