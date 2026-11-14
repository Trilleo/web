/**
 * Judgement ranges: where on a chart's picture each note can be hit for a Justice
 * Critical, a Justice or an Attack, drawn on the lanes under the notes.
 *
 * sdvx.in's pictures are only pixels, so the notes are found in the notes layer
 * (`findNotes`): every ground note is a thin bar, a near-white highlight over one
 * coloured edge, across the cells it covers. The edge's colour says what it is: red a
 * tap, yellow an ExTap, cyan a flick, orange a hold's end and blue a slide's (a start
 * when its body runs up from it). Air notes (green), bodies and damage notes have no
 * window of their own here and are skipped.
 *
 * Windows are in milliseconds, the picture in pixels: sdvx.in draws each chart at its
 * own height per beat, so a measure's height (`pixelsPerMs`, the commonest gap
 * between measures, taken as 4/4) and the song's BPM give pixels per millisecond.
 * Songs that change BPM use their main one, so their ranges are approximate.
 *
 * Close notes (縦連, as players test it): when two notes that overlap sideways (any
 * shared cell, not only the same lane) are close enough for their windows to meet,
 * the windows are split at the midpoint between them. Past it, a note's Justice and
 * Attack are gone across its whole width, its Justice Critical only in the cells the
 * two share (`judgementRanges`).
 *
 * Positions are strip positions (`p`, pixels from the strip's bottom, as charts.ts
 * counts them); time runs upwards, so a note's early side is below it (the judgement
 * line hasn't reached it yet) and its late side above.
 */
import { ChartLayoutError, type ChartLayout, type RgbaImage } from "./charts";
import type { Difficulty } from "./difficulties";

/** The 16 cells notes sit on, inside each column's lane (from its left edge). */
export const PLAYFIELD = {
  left: 27,
  cell: 6,
  cells: 16,
} as const;

/** Notes the ranges are drawn for. */
export type JudgedKind = "tap" | "extap" | "flick" | "hold" | "slide";

export interface ChartNote {
  /** Its line on the strip (p). */
  p: number;
  /** Cells covered: [from, to), 0–16. */
  from: number;
  to: number;
  kind: JudgedKind;
  /** A hold or slide whose start is an ExTap (judged like one). */
  ex?: true;
}

/** Judgements with a window, best first. */
export const JUDGEMENTS = ["critical", "justice", "attack"] as const;
export type Judgement = (typeof JUDGEMENTS)[number];

/**
 * Each judgement's outer edge in ms either side of the note, by how the note is
 * judged. Not published by SEGA: players' measurements (±2, 4 and 6 frames at 60 fps).
 * ExTaps (and ExTap starts) and flicks count every hit within the Attack window as a
 * Justice Critical. Change them here: pictures say which windows they were drawn with.
 */
export const JUDGEMENT_WINDOWS: Record<
  "normal" | "critical",
  Record<Judgement, number>
> = {
  normal: { critical: 33.3, justice: 66.7, attack: 100 },
  critical: { critical: 100, justice: 100, attack: 100 },
};

/** How a note is judged: like a tap, or everything a Justice Critical. */
export function windowsOf(note: Pick<ChartNote, "kind" | "ex">) {
  return note.kind === "extap" || note.kind === "flick" || note.ex
    ? JUDGEMENT_WINDOWS.critical
    : JUDGEMENT_WINDOWS.normal;
}

/** Notes this close (px) are one chord: they don't split each other's windows. */
const CHORD_PX = 2;

type Colour =
  | "none"
  | "white"
  | "red"
  | "orange"
  | "yellow"
  | "green"
  | "cyan"
  | "blue"
  | "purple";

/** Alpha (out of 255) a highlight row needs; edges need EDGE_ALPHA. */
const WHITE_ALPHA = 120;
const EDGE_ALPHA = 150;
/** How far under an air arrow its ground note's edge is looked for, and how faint. */
const UNDER_AIR = 5;
const FAINT_ALPHA = 60;
/** Two bars side by side are two notes when the pixel between them is this much fainter. */
const SPLIT_SHARE = 0.88;
/** Bars in neighbouring cells this many rows apart are one bar. */
const JOIN_ROWS = 2;
/** The same, between a bar read under an air arrow and one read in the open. */
const JOIN_AIR_ROWS = 4;
/** A bar's coloured rows, at most. */
const MAX_BAR_ROWS = 4;
/** Cells a bar may be unread across (an air arrow or an air hold's mark over them). */
const SKIP_CELLS = 2;
/** From a bar's coloured edge up to its line, in rows. */
const LINE_OFFSET = 1;
/** How far past a bar a hold's or slide's body is looked for. */
const BODY_GAP = 6;
/** Below this saturation a pixel is highlight, not colour. */
const WHITE_SATURATION = 0.3;

function colourOf(r: number, g: number, b: number, a: number): Colour {
  if (a < WHITE_ALPHA) return "none";
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const saturation = max === 0 ? 0 : (max - min) / max;
  if (saturation < WHITE_SATURATION) return "white";
  if (a < EDGE_ALPHA) return "none";
  const d = max - min;
  let hue =
    max === r
      ? ((g - b) / d) * 60
      : max === g
        ? ((b - r) / d) * 60 + 120
        : ((r - g) / d) * 60 + 240;
  if (hue < 0) hue += 360;
  if (hue < 20 || hue >= 330) return "red";
  if (hue < 45) return "orange";
  if (hue < 75) return "yellow";
  if (hue < 160) return "green";
  if (hue < 200) return "cyan";
  if (hue < 255) return "blue";
  return "purple";
}

/** The bar colours that make a note, and what each is. */
const BAR_COLOURS: Partial<Record<Colour, JudgedKind>> = {
  red: "tap",
  yellow: "extap",
  cyan: "flick",
  orange: "hold",
  blue: "slide",
};

/** A strip position's column and row, every column it shows in (bands repeat). */
interface ColumnRows {
  column: number;
  lane: number;
  /** The strip position of row 0 plus the row: p = base - row. */
  base: number;
  top: number;
  /** Rows [top, last] are read for this column (its own part, no shared band). */
  last: number;
}

function columnRows(layout: ChartLayout): ColumnRows[] {
  let start = 0;
  return layout.columns.map((column, index) => {
    const bottomRow =
      index === 0 ? layout.height - 1 : layout.height - 1 - layout.overlap;
    const rows = {
      column: index,
      lane: column.lane,
      base: start + bottomRow,
      top: column.top,
      last: bottomRow,
    };
    start += bottomRow - column.top + 1;
    return rows;
  });
}

/** One cell's bar: its edge row and colour. */
interface CellBar {
  row: number;
  colour: Colour;
  /** Found under an air arrow, by its faint edge. */
  underAir?: true;
}

/**
 * Finds the bars in one cell of one column: a run of at most 3 rows of one bar colour
 * with a highlight just above or below it and nothing of that colour within
 * `gap` rows beyond (bodies and air arrows are tall).
 */
function cellBars(
  notes: RgbaImage,
  x: number,
  top: number,
  last: number,
): CellBar[] {
  const { width, height, data } = notes;
  const colourAt = (y: number): Colour => {
    if (y < 0 || y >= height) return "none";
    const i = (y * width + x) * 4;
    return colourOf(
      data[i] ?? 0,
      data[i + 1] ?? 0,
      data[i + 2] ?? 0,
      data[i + 3] ?? 0,
    );
  };
  const alphaAt = (y: number) =>
    y < 0 || y >= height ? 0 : (data[(y * width + x) * 4 + 3] ?? 0);
  // A highlight row, however faint (flicks' are).
  const paleAt = (y: number) => {
    if (alphaAt(y) < FAINT_ALPHA) return false;
    const i = (y * width + x) * 4;
    return (
      colourOf(data[i] ?? 0, data[i + 1] ?? 0, data[i + 2] ?? 0, 255) ===
      "white"
    );
  };
  const bars: CellBar[] = [];
  let y = top;
  while (y <= last) {
    const colour = colourAt(y);
    if (colour === "green") {
      // An air arrow sits on its ground note, hiding all but the bar's faint edge:
      // the last row under the arrow that shows, in that note's colour.
      let end = y;
      while (end + 1 <= last + 4 && colourAt(end + 1) === "green") end++;
      if (end - y >= 1) {
        let edge = -1;
        for (let k = 1; k <= UNDER_AIR; k++)
          if (alphaAt(end + k) >= FAINT_ALPHA) edge = end + k;
        if (edge >= 0 && edge <= last) {
          const i = (edge * width + x) * 4;
          const under = colourOf(
            data[i] ?? 0,
            data[i + 1] ?? 0,
            data[i + 2] ?? 0,
            255,
          );
          // The faint row is a row under where an uncovered bar's colour ends.
          if (BAR_COLOURS[under])
            bars.push({ row: edge - 1, colour: under, underAir: true });
        }
      }
      y = end + 1;
      continue;
    }
    if (!BAR_COLOURS[colour]) {
      y++;
      continue;
    }
    // Pale bars (ExTaps) waver between their colour and white from row to row.
    let end = y;
    for (;;) {
      if (end + 1 <= last + 4 && colourAt(end + 1) === colour) end++;
      else if (
        colour === "yellow" &&
        end + 2 <= last + 4 &&
        colourAt(end + 1) === "white" &&
        colourAt(end + 2) === colour
      )
        end += 2;
      else break;
    }
    const length = end - y + 1;
    // A bar is thin and fades out right under its edge (a body's gradient doesn't).
    const fades = alphaAt(end + 3) < FAINT_ALPHA;
    // Hold and slide starts have their body above, in their own colours; other bars
    // have nothing of their colour just above (air arrows and bodies are tall).
    const starts = colour === "orange" || colour === "blue";
    let clear = true;
    for (let k = 2; k <= 4 && clear && !starts; k++)
      if (colourAt(y - k) === colour) clear = false;
    // Slide bodies break into cyan patches: a flick needs its highlight.
    const lit = paleAt(y - 1) || paleAt(end + 1);
    if (length <= MAX_BAR_ROWS && fades && clear && (lit || colour !== "cyan"))
      bars.push({ row: end, colour });
    y = end + 1;
  }
  return bars;
}

/** Whether a hold or slide body runs up from row `row` in cell x (rows above it). */
function bodyAbove(notes: RgbaImage, x: number, row: number): boolean {
  return bodyAt(notes, x, row - BODY_GAP);
}

function bodyBelow(notes: RgbaImage, x: number, row: number): boolean {
  return bodyAt(notes, x, row + BODY_GAP);
}

/**
 * A body pixel: hold bodies are half opaque purple to yellow, slide bodies cyan to
 * pink. An air arrow above a note is green and white, so it isn't one.
 */
function bodyAt(notes: RgbaImage, x: number, y: number): boolean {
  if (y < 0 || y >= notes.height) return false;
  const i = (y * notes.width + x) * 4;
  if ((notes.data[i + 3] ?? 0) < FAINT_ALPHA) return false;
  const colour = colourOf(
    notes.data[i] ?? 0,
    notes.data[i + 1] ?? 0,
    notes.data[i + 2] ?? 0,
    255,
  );
  return colour !== "green" && colour !== "white";
}

/** Bar colours by how much they say when cells of a bar disagree. */
const COLOUR_RANK: Colour[] = ["blue", "orange", "yellow", "red", "cyan"];

/**
 * The judged notes in a notes layer, by strip position, earliest first. Each column is
 * read in its own rows only (the band it shares with the next is read there), so no
 * note comes twice.
 *
 * Bars found in neighbouring cells a row or two apart are one note unless a faint
 * pixel parts them (`splitAt`), whatever their colours: a slide's line crosses its
 * start bar in cyan, and an air arrow narrower than its note leaves the note's ends
 * uncovered. A note takes its cells' commonest colour.
 */
export function findNotes(notes: RgbaImage, layout: ChartLayout): ChartNote[] {
  if (notes.width !== layout.width || notes.height !== layout.height)
    throw new ChartLayoutError("The notes layer isn't the layout's size.");
  const found: ChartNote[] = [];
  for (const rows of columnRows(layout)) {
    const left = rows.lane + PLAYFIELD.left;
    const centre = (cell: number) =>
      left + cell * PLAYFIELD.cell + PLAYFIELD.cell / 2;
    const bars = Array.from({ length: PLAYFIELD.cells }, (_, cell) =>
      cellBars(notes, centre(cell), rows.top, rows.last).map((bar) => ({
        ...bar,
        cell,
      })),
    ).flat();
    // Group: same cell (found twice) or nearby cells not parted by a gap.
    const parent = bars.map((_, i) => i);
    const root = (i: number): number => {
      let r = i;
      while (parent[r] !== r) r = parent[r] ?? r;
      parent[i] = r;
      return r;
    };
    for (let i = 0; i < bars.length; i++)
      for (let j = i + 1; j < bars.length; j++) {
        const a = bars[i];
        const b = bars[j];
        if (!a || !b) continue;
        // A bar read under an air arrow sits a few rows off the same bar's ends.
        const rows = a.underAir === b.underAir ? JOIN_ROWS : JOIN_AIR_ROWS;
        if (Math.abs(a.row - b.row) > rows) continue;
        const low = Math.min(a.cell, b.cell);
        const high = Math.max(a.cell, b.cell);
        // Across unread cells (an air arrow over them) only bars of one colour.
        if (
          high - low > 1 &&
          (high - low > SKIP_CELLS + 1 || a.colour !== b.colour)
        )
          continue;
        let joined = true;
        for (let k = low + 1; k <= high && joined; k++)
          if (
            splitAt(
              notes,
              left + k * PLAYFIELD.cell - 1,
              Math.max(a.row, b.row),
            )
          )
            joined = false;
        if (joined) parent[root(j)] = root(i);
      }
    const groups = new Map<number, typeof bars>();
    for (const [i, bar] of bars.entries()) {
      const key = root(i);
      groups.set(key, [...(groups.get(key) ?? []), bar]);
    }
    for (const group of groups.values()) {
      let from = Math.min(...group.map((bar) => bar.cell));
      let to = Math.max(...group.map((bar) => bar.cell)) + 1;
      const seen = group.filter((bar) => !bar.underAir);
      const row = Math.max(
        ...(seen.length > 0 ? seen : group).map((bar) => bar.row),
      );
      // Ends drawn grey (a flick's, an air hold's mark) still belong to the note.
      const solid = (cell: number) =>
        opaqueNear(notes, centre(cell), row) &&
        !splitAt(notes, left + Math.max(cell, from) * PLAYFIELD.cell - 1, row);
      while (from > 0 && solid(from - 1)) from--;
      while (
        to < PLAYFIELD.cells &&
        !splitAt(notes, left + to * PLAYFIELD.cell - 1, row) &&
        opaqueNear(notes, centre(to), row)
      )
        to++;
      const tally = new Map<Colour, number>();
      for (const bar of group)
        tally.set(bar.colour, (tally.get(bar.colour) ?? 0) + 1);
      const colour = [...tally].sort(
        (a, b) =>
          b[1] - a[1] || COLOUR_RANK.indexOf(a[0]) - COLOUR_RANK.indexOf(b[0]),
      )[0]?.[0];
      const kind = colour && BAR_COLOURS[colour];
      if (!colour || !kind) continue;
      const middle = centre(Math.floor((from + to - 1) / 2));
      // A start has its body above and nothing below: a slide's relay points (body
      // both ways) aren't judged on their own.
      const above =
        bodyAbove(notes, middle, row) && !bodyBelow(notes, middle, row);
      // The edge row is a row under the note's line (as measure lines show).
      const p = rows.base - row + LINE_OFFSET;
      // Holds and slides: only starts are judged (their ends have no judgement).
      if (kind === "hold" || kind === "slide") {
        if (above) found.push({ p, from, to, kind });
        continue;
      }
      // A note under an air arrow with a body below it is a hold's or slide's end.
      if (group.every((bar) => bar.underAir) && bodyBelow(notes, middle, row))
        continue;
      // An ExTap starting a hold or slide is judged like an ExTap, counted with it.
      if (kind === "extap" && above) {
        const slide = bodyIsSlide(notes, middle, row);
        found.push({ p, from, to, kind: slide ? "slide" : "hold", ex: true });
        continue;
      }
      found.push({ p, from, to, kind });
    }
  }
  return mergeOverlapping(found);
}

/**
 * One note per place: parts of a note read apart (its middle hidden or unread) that
 * widening has made overlap, on the same line, are one note. Notes at one time can't
 * share cells, so nothing else is merged.
 */
function mergeOverlapping(notes: ChartNote[]): ChartNote[] {
  const sorted = [...notes].sort((a, b) => a.p - b.p || a.from - b.from);
  const out: ChartNote[] = [];
  for (const note of sorted) {
    const same = out.find(
      (other) =>
        Math.abs(other.p - note.p) <= JOIN_ROWS &&
        other.from < note.to &&
        note.from < other.to,
    );
    if (!same) {
      out.push({ ...note });
      continue;
    }
    same.from = Math.min(same.from, note.from);
    same.to = Math.max(same.to, note.to);
  }
  return out;
}

/**
 * Whether the pixel column x parts two bars at row `row`: brightest there (over the
 * bar's rows) well under the brighter cells either side. Neighbouring notes leave a
 * one-pixel gap that their glow only half fills; a wide note's own cell edges are as
 * opaque as its middle.
 */
function splitAt(notes: RgbaImage, x: number, row: number): boolean {
  if (x < 3 || x + 4 >= notes.width) return true;
  const most = (column: number) => {
    let value = 0;
    for (
      let y = Math.max(0, row - 3);
      y <= Math.min(notes.height - 1, row);
      y++
    )
      value = Math.max(
        value,
        notes.data[(y * notes.width + column) * 4 + 3] ?? 0,
      );
    return value;
  };
  // sdvx.in's gap falls on either pixel at the cell edge.
  return [x, x + 1].some((at) => {
    const here = most(at);
    const sides = Math.min(most(at - 3), most(at + 3));
    return here < EDGE_ALPHA || here < sides * SPLIT_SHARE;
  });
}

/** Whether a bar's rows (just above its edge row) are opaque at x. */
function opaqueNear(notes: RgbaImage, x: number, row: number): boolean {
  for (let y = Math.max(0, row - 2); y <= row; y++)
    if ((notes.data[(y * notes.width + x) * 4 + 3] ?? 0) >= EDGE_ALPHA)
      return true;
  return false;
}

/** Whether the body above row `row` is a slide's (cyan) rather than a hold's. */
function bodyIsSlide(notes: RgbaImage, x: number, row: number): boolean {
  const y = row - 8;
  if (y < 0) return false;
  const i = (y * notes.width + x) * 4;
  const colour = colourOf(
    notes.data[i] ?? 0,
    notes.data[i + 1] ?? 0,
    notes.data[i + 2] ?? 0,
    255,
  );
  return colour === "cyan" || colour === "blue";
}

/**
 * Notes found, as sdvx.in (and the game) count them: TAP takes taps, ExTaps and the
 * starts of holds and slides (HOLD and SLIDE count their ticks, which aren't drawn as
 * notes, so they can't be checked).
 */
export interface FoundCounts {
  tap: number;
  flick: number;
}

export function countNotes(notes: ChartNote[]): FoundCounts {
  const counts: FoundCounts = { tap: 0, flick: 0 };
  for (const note of notes)
    counts[note.kind === "flick" ? "flick" : "tap"] += 1;
  return counts;
}

/**
 * How far found counts may fall short of sdvx.in's (or run over) before the admin is
 * shown the chart: some notes hide under others, so a few always go unfound.
 */
export const COUNT_CHECK = { under: 0.9, over: 1.02 };

/** Whether found counts are close enough to sdvx.in's (null: nothing to compare). */
export function countsAgree(
  found: FoundCounts,
  expected: { tap: number | null; flick: number | null } | null,
): boolean | null {
  const taps = expected?.tap ?? null;
  if (taps === null) return null;
  const flicks = expected?.flick ?? null;
  const close = (got: number, want: number) =>
    got >= want * COUNT_CHECK.under &&
    got <= Math.ceil(want * COUNT_CHECK.over);
  // A handful of flicks is too few to judge by.
  return (
    close(found.tap, taps) &&
    (flicks === null || flicks < 10 || close(found.flick, flicks))
  );
}

/** otoge-db's words for a difficulty, where a BPM is the chart's own. */
const BPM_DIFFICULTY: Record<Difficulty, string> = {
  basic: "BASIC",
  advanced: "ADVANCED",
  expert: "EXPERT",
  master: "MASTER",
  ultima: "ULTIMA",
  worldsend: "WORLD'S END",
};

/**
 * A chart's BPM from the song's (otoge-db's, one number: the song's main BPM), or the
 * chart's own where it gives one: "440(MASTER譜面のみ220)" is 220 for the Master. Null
 * when there's no number.
 */
export function chartBpm(
  text: string | null,
  difficulty: Difficulty,
): number | null {
  if (!text) return null;
  const own = new RegExp(
    `${BPM_DIFFICULTY[difficulty]}[^0-9(（]*?(\\d+(?:\\.\\d+)?)`,
  ).exec(text);
  const match = own ?? /\d+(?:\.\d+)?/.exec(text);
  const bpm = match ? Number(own ? match[1] : match[0]) : NaN;
  return Number.isFinite(bpm) && bpm >= 10 && bpm <= 2000 ? bpm : null;
}

/** Fewest measures a chart needs before its measure height is trusted. */
const MIN_MEASURES = 3;

/**
 * Pixels per millisecond at `bpm`: sdvx.in draws every beat of a chart the same height
 * (its BPM changes don't show), so the commonest gap between measures is a 4/4
 * measure. Null without enough measures (plain lanes have none).
 */
export function pixelsPerMs(measures: number[], bpm: number): number | null {
  if (measures.length < MIN_MEASURES || bpm <= 0) return null;
  const tally = new Map<number, number>();
  for (let i = 1; i < measures.length; i++) {
    const gap = (measures[i] ?? 0) - (measures[i - 1] ?? 0);
    if (gap > 0) tally.set(gap, (tally.get(gap) ?? 0) + 1);
  }
  const best = [...tally].sort((a, b) => b[1] - a[1] || a[0] - b[0])[0];
  if (!best) return null;
  const beat = best[0] / 4;
  return (beat * bpm) / 60_000;
}

/** Which side of its note a band is: early below (before the line reaches it). */
export type Side = "early" | "late";

/** A rectangle of one judgement on the strip: positions [p0, p1), cells [from, to). */
export interface RangeBand {
  p0: number;
  p1: number;
  from: number;
  to: number;
  judgement: Judgement;
  side: Side;
  /** Its far edge is a midpoint with the next note (the windows split there). */
  cut: boolean;
  /** It ends where its note does: a pixel short, as sdvx.in parts neighbouring notes. */
  edge?: true;
}

/** How a chart's ranges were drawn (kept with the picture, shown in the viewer). */
export interface JudgementInfo {
  /** Bumped when ranges would be drawn differently (JUDGEMENT_VERSION). */
  version: number;
  bpm: number;
  pxPerMs: number;
  windows: typeof JUDGEMENT_WINDOWS;
  found: FoundCounts;
  /** sdvx.in's counts at the time, for the admin's check. */
  expected: { tap: number | null; flick: number | null } | null;
}

/** Bump when found notes or drawn ranges would come out differently. */
export const JUDGEMENT_VERSION = 1;

const overlaps = (a: ChartNote, b: ChartNote) => a.from < b.to && b.from < a.to;

/**
 * Every note's ranges as bands, with close notes' windows split at their midpoint:
 * past it a note keeps no Justice or Attack anywhere, and no Justice Critical in the
 * cells the two share. Notes within CHORD_PX of each other are a chord and don't split.
 */
export function judgementRanges(
  notes: ChartNote[],
  pxPerMs: number,
): RangeBand[] {
  const sorted = [...notes].sort((a, b) => a.p - b.p || a.from - b.from);
  const reach = JUDGEMENT_WINDOWS.critical.attack * pxPerMs * 2 + CHORD_PX;
  const bands: RangeBand[] = [];
  for (const [index, note] of sorted.entries()) {
    const windows = windowsOf(note);
    for (const side of ["early", "late"] as const) {
      const sign = side === "late" ? 1 : -1;
      // Midpoints with the overlapping notes on this side: the nearest cuts the whole
      // note; each cell keeps the nearest among the notes that share it.
      let whole = Infinity;
      const cells = new Array<number>(PLAYFIELD.cells).fill(Infinity);
      for (let k = index + sign; k >= 0 && k < sorted.length; k += sign) {
        const other = sorted[k];
        if (!other) break;
        const apart = (other.p - note.p) * sign;
        if (apart > reach) break;
        if (apart <= CHORD_PX || !overlaps(note, other)) continue;
        const half = apart / 2;
        whole = Math.min(whole, half);
        for (
          let c = Math.max(note.from, other.from);
          c < Math.min(note.to, other.to);
          c++
        )
          cells[c] = Math.min(cells[c] ?? Infinity, half);
      }
      const span = (inner: number, outer: number, limit: number) => {
        const far = Math.min(outer, limit);
        return far > inner ? { inner, far, cut: limit < outer } : null;
      };
      const push = (
        part: { inner: number; far: number; cut: boolean },
        from: number,
        to: number,
        judgement: Judgement,
      ) => {
        const a = note.p + sign * part.inner;
        const b = note.p + sign * part.far;
        bands.push({
          p0: Math.min(a, b),
          p1: Math.max(a, b),
          from,
          to,
          judgement,
          side,
          cut: part.cut,
          ...(to === note.to ? { edge: true as const } : {}),
        });
      };
      // Justice Critical, cell by cell (runs of cells with the same limit).
      const critical = windows.critical * pxPerMs;
      let run = note.from;
      for (let c = note.from + 1; c <= note.to; c++) {
        if (c < note.to && cells[c] === cells[run]) continue;
        const part = span(0, critical, cells[run] ?? Infinity);
        if (part) push(part, run, c, "critical");
        run = c;
      }
      // Justice and Attack, across the whole note.
      let inner = critical;
      for (const judgement of ["justice", "attack"] as const) {
        const outer = windows[judgement] * pxPerMs;
        const part = span(inner, outer, whole);
        if (part) push(part, note.from, note.to, judgement);
        inner = Math.max(inner, outer);
      }
    }
  }
  return bands;
}

/**
 * The ranges' colours, as the game shows its judgements: Justice Critical gold,
 * Justice orange, Attack green. Early bands are a little stronger than late ones.
 */
export const JUDGEMENT_COLOURS: Record<Judgement, [number, number, number]> = {
  critical: [255, 226, 92],
  justice: [255, 128, 40],
  attack: [64, 200, 104],
};
export const SIDE_OPACITY: Record<Side, number> = { early: 0.78, late: 0.5 };
/** The line where close notes' windows split. */
const CUT_COLOUR: [number, number, number] = [255, 255, 255];
const CUT_OPACITY = 0.8;

/**
 * Draws the bands on a picture laid out as `layout` (the lanes, before the notes go
 * over them), in place, in every column a position shows in (shared bands too).
 */
export function drawRanges(
  picture: RgbaImage,
  layout: ChartLayout,
  bands: RangeBand[],
): void {
  if (picture.width !== layout.width || picture.height !== layout.height)
    throw new ChartLayoutError("The picture isn't the layout's size.");
  const { width, data } = picture;
  const blend = (
    x: number,
    y: number,
    rgb: [number, number, number],
    a: number,
  ) => {
    const i = (y * width + x) * 4;
    const under = (data[i + 3] ?? 0) / 255;
    const out = a + under * (1 - a);
    if (out <= 0) return;
    for (let c = 0; c < 3; c++)
      data[i + c] = Math.round(
        ((rgb[c] ?? 0) * a + (data[i + c] ?? 0) * under * (1 - a)) / out,
      );
    data[i + 3] = Math.round(out * 255);
  };
  const columns = columnRows(layout);
  for (const band of bands) {
    const rgb = JUDGEMENT_COLOURS[band.judgement];
    const a = SIDE_OPACITY[band.side];
    for (const rows of columns) {
      // Rows of this column (its shared band below included): p = base - row.
      const top = Math.max(rows.top, Math.floor(rows.base - band.p1) + 1);
      const bottom = Math.min(
        layout.height - 1,
        Math.floor(rows.base - band.p0),
      );
      if (top > bottom) continue;
      const x0 = rows.lane + PLAYFIELD.left + band.from * PLAYFIELD.cell;
      const x1 =
        rows.lane +
        PLAYFIELD.left +
        band.to * PLAYFIELD.cell -
        (band.edge ? 1 : 0);
      for (let y = top; y <= bottom; y++)
        for (let x = x0; x < x1; x++) blend(x, y, rgb, a);
      if (band.cut) {
        const y = band.side === "late" ? top : bottom;
        for (let x = x0; x < x1; x++) blend(x, y, CUT_COLOUR, CUT_OPACITY);
      }
    }
  }
}
