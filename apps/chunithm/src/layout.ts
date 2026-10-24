/**
 * The viewer's geometry, pure. A chart is a strip of tiles (bottom first); positions
 * on it (`p`) count pixels up from the bottom, where the chart starts.
 *
 * - Strip: the whole strip in one column, scrolled from the bottom up.
 * - Sheet: the strip cut into columns as tall as the screen, side by side from the
 *   left, each starting a little below where the last one ended (SHEET_OVERLAP), as
 *   sdvx.in lays charts out, so the eye can carry on across the cut.
 */
import type { ChartManifest } from "@trilleo/chunithm";

export const ZOOMS = [1, 2, 3] as const;
export type Zoom = (typeof ZOOMS)[number];

/** Rows of the strip repeated at the bottom of each sheet column. */
export const SHEET_OVERLAP = 48;
/** The shortest sheet column worth drawing (strip pixels). */
export const MIN_SHEET_COLUMN = 240;

export interface PlacedTile {
  url: string;
  from: number;
  to: number;
}

export function placeTiles(manifest: ChartManifest): PlacedTile[] {
  let from = 0;
  return manifest.tiles.map((tile) => {
    const placed = { url: tile.url, from, to: from + tile.height };
    from += tile.height;
    return placed;
  });
}

/** Tiles that show something in [from, to). */
export function tilesIn(
  tiles: readonly PlacedTile[],
  from: number,
  to: number,
) {
  return tiles.filter((tile) => tile.to > from && tile.from < to);
}

/** Sheet columns: strip ranges [from, to), left to right. */
export function sheetColumns(
  height: number,
  columnHeight: number,
): { from: number; to: number }[] {
  const tall = Math.max(MIN_SHEET_COLUMN, Math.floor(columnHeight));
  const step = tall - SHEET_OVERLAP;
  const columns: { from: number; to: number }[] = [];
  for (let from = 0; from < height; from += step) {
    columns.push({ from, to: Math.min(height, from + tall) });
    if (from + tall >= height) break;
  }
  return columns;
}

/** The measure (1-based) a position is in; 0 before the first. */
export function measureAt(measures: readonly number[], p: number): number {
  let low = 0;
  let high = measures.length;
  while (low < high) {
    const mid = (low + high) >> 1;
    if ((measures[mid] ?? 0) <= p) low = mid + 1;
    else high = mid;
  }
  return low;
}

/** Where measure n starts (1-based, clamped). */
export function measureStart(measures: readonly number[], n: number): number {
  if (measures.length === 0) return 0;
  const index = Math.min(measures.length, Math.max(1, Math.round(n))) - 1;
  return measures[index] ?? 0;
}

/** The sheet column a position is shown in (the first that holds it). */
export function columnOf(
  columns: readonly { from: number; to: number }[],
  p: number,
): number {
  const index = columns.findIndex(
    (column) => p >= column.from && p < column.to,
  );
  return index === -1 ? Math.max(0, columns.length - 1) : index;
}

/**
 * Whether to draw pixels hard-edged: when each picture pixel covers a whole number of
 * screen pixels (zoom × device pixel ratio), so nothing is smoothed into a blur.
 */
export function crisp(zoom: number, devicePixelRatio: number): boolean {
  const scale = zoom * devicePixelRatio;
  return Math.abs(scale - Math.round(scale)) < 0.01;
}
