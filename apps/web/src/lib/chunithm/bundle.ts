/**
 * Charts built on the admin's computer: the to-do list /admin/chunithm/ hands out
 * (which charts have no picture), and the bundles the bundling script
 * (scripts/chunithm-bundle.ts) makes from it for /admin/chunithm/import/.
 *
 * A bundle is a ZIP (zip-writer.ts, entries stored): BUNDLE_INDEX lists the charts,
 * each with its sdvx.in ref, the layers' tags (so the usual check against sdvx.in
 * notices a redraw later), the manifest and its tiles' files. Tiles are made by
 * picture.ts, the server's own code, so they're what a server build would make; the
 * import checks the bundle all the same (`checkBundleChart`, and each tile's bytes).
 *
 * Pure: no database or storage, so the script can use it too.
 */
import { COLUMN, TILE_HEIGHT, tileRanges } from "@trilleo/chunithm";
import type { ChuniBuildManifest, ChuniBuildSource } from "@trilleo/db";
import { BUNDLE_MAX_BYTES } from "./limits";
import { VARIANTS, type Variant } from "./picture";

/** 2: charts by sdvx.in ref (its new viewer), not by its older site's page. */
export const TODO_FORMAT = 2;
export const BUNDLE_FORMAT = 2;
/** The bundle's list of charts, at the archive's root. */
export const BUNDLE_INDEX = "bundle.json";

export const BUNDLE_LIMITS = {
  /** The script starts a new bundle past this (the upload's cap is BUNDLE_LIMITS.maxBytes). */
  targetBytes: 200 * 1024 * 1024,
  /** What the import purpose takes. */
  maxBytes: BUNDLE_MAX_BYTES,
  maxCharts: 1000,
  /** A tile is about 100 KB; a whole Master about 2 MB. */
  maxTileBytes: 4 * 1024 * 1024,
  maxIndexBytes: 4 * 1024 * 1024,
  /** Entries listed (and so imported) at most per bundle. */
  maxEntries: 40_000,
};

export interface TodoChart {
  chartId: number;
  songId: number;
  title: string;
  difficulty: string;
  sdvxRef: string;
  variant: Variant;
}

/** What /admin/chunithm/todo.json hands the script. */
export interface Todo {
  kind: "chunithm-todo";
  format: typeof TODO_FORMAT;
  buildVersion: number;
  createdAt: string;
  charts: TodoChart[];
}

export interface BundleTile {
  /** The entry's name in the archive (`tileFile`). */
  file: string;
  height: number;
}

export interface BundleChart {
  chartId: number;
  variant: Variant;
  sdvxRef: string;
  source: ChuniBuildSource;
  manifest: Omit<ChuniBuildManifest, "tiles">;
  tiles: BundleTile[];
}

export interface BundleIndex {
  kind: "chunithm-bundle";
  format: typeof BUNDLE_FORMAT;
  buildVersion: number;
  createdAt: string;
  charts: BundleChart[];
}

/** Where a chart's tile goes in the archive. */
export function tileFile(chartId: number, variant: Variant, index: number) {
  return `${String(chartId)}-${variant}/${String(index)}.webp`;
}

type Shape = Record<string, unknown>;

function isShape(value: unknown): value is Shape {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

const isId = (value: unknown): value is number =>
  typeof value === "number" && Number.isInteger(value) && value > 0;
const isCount = (value: unknown): value is number =>
  typeof value === "number" && Number.isInteger(value) && value >= 0;
const isText = (value: unknown): value is string =>
  typeof value === "string" && value.length > 0 && value.length <= 500;
const isVariant = (value: unknown): value is Variant =>
  VARIANTS.includes(value as Variant);

/** The to-do list, or what's wrong with it. */
export function parseTodo(value: unknown): Todo | string {
  if (!isShape(value) || value.kind !== "chunithm-todo")
    return "That isn't a CHUNITHM to-do list.";
  if (value.format !== TODO_FORMAT)
    return `This script reads to-do lists of format ${String(TODO_FORMAT)}; update your checkout.`;
  if (!isCount(value.buildVersion) || !Array.isArray(value.charts))
    return "The to-do list is damaged.";
  const charts: TodoChart[] = [];
  for (const chart of value.charts) {
    if (
      !isShape(chart) ||
      !isId(chart.chartId) ||
      !isId(chart.songId) ||
      !isText(chart.title) ||
      !isText(chart.difficulty) ||
      !isText(chart.sdvxRef) ||
      !isVariant(chart.variant)
    )
      return "The to-do list has a damaged chart.";
    charts.push({
      chartId: chart.chartId,
      songId: chart.songId,
      title: chart.title,
      difficulty: chart.difficulty,
      sdvxRef: chart.sdvxRef,
      variant: chart.variant,
    });
  }
  return {
    kind: "chunithm-todo",
    format: TODO_FORMAT,
    buildVersion: value.buildVersion,
    createdAt: typeof value.createdAt === "string" ? value.createdAt : "",
    charts,
  };
}

function parseSource(value: unknown): ChuniBuildSource | null {
  if (!isShape(value) || !isShape(value.tags)) return null;
  const { ref, bg, obj, bar, tags } = value;
  if (![ref, bg, obj, bar].every(isText)) return null;
  if (![tags.bg, tags.obj, tags.bar].every((tag) => typeof tag === "string"))
    return null;
  return {
    ref: ref as string,
    path: "",
    bg: bg as string,
    obj: obj as string,
    bar: bar as string,
    tags: {
      bg: tags.bg as string,
      obj: tags.obj as string,
      bar: tags.bar as string,
    },
  };
}

function parseManifest(
  value: unknown,
): Omit<ChuniBuildManifest, "tiles"> | null {
  if (!isShape(value) || !Array.isArray(value.measures)) return null;
  const { width, height, gutter, lane, columns, measures } = value;
  if (![width, height, gutter, lane, columns].every(isCount)) return null;
  if (!measures.every(isCount)) return null;
  return {
    width: width as number,
    height: height as number,
    gutter: gutter as number,
    lane: lane as number,
    columns: columns as number,
    measures,
    ...(value.plainLanes === true ? { plainLanes: true as const } : {}),
  };
}

/** The bundle's index, or what's wrong with it. */
export function parseBundleIndex(value: unknown): BundleIndex | string {
  if (!isShape(value) || value.kind !== "chunithm-bundle")
    return "That isn't a CHUNITHM bundle.";
  if (value.format !== BUNDLE_FORMAT)
    return `The site reads bundles of format ${String(BUNDLE_FORMAT)}, not ${String(value.format)}.`;
  if (!isCount(value.buildVersion) || !Array.isArray(value.charts))
    return "The bundle's list of charts is damaged.";
  if (value.charts.length > BUNDLE_LIMITS.maxCharts)
    return `A bundle holds at most ${String(BUNDLE_LIMITS.maxCharts)} charts.`;
  const charts: BundleChart[] = [];
  for (const chart of value.charts) {
    if (!isShape(chart) || !isId(chart.chartId) || !isVariant(chart.variant))
      return "The bundle has a damaged chart.";
    const source = parseSource(chart.source);
    const manifest = parseManifest(chart.manifest);
    if (
      !source ||
      !manifest ||
      !isText(chart.sdvxRef) ||
      !Array.isArray(chart.tiles)
    )
      return `Chart ${String(chart.chartId)} is damaged in the bundle.`;
    const tiles: BundleTile[] = [];
    for (const tile of chart.tiles) {
      if (!isShape(tile) || !isText(tile.file) || !isCount(tile.height))
        return `Chart ${String(chart.chartId)} is damaged in the bundle.`;
      tiles.push({ file: tile.file, height: tile.height });
    }
    charts.push({
      chartId: chart.chartId,
      variant: chart.variant,
      sdvxRef: chart.sdvxRef,
      source,
      manifest,
      tiles,
    });
  }
  return {
    kind: "chunithm-bundle",
    format: BUNDLE_FORMAT,
    buildVersion: value.buildVersion,
    createdAt: typeof value.createdAt === "string" ? value.createdAt : "",
    charts,
  };
}

/**
 * Whether a bundled chart is laid out as picture.ts lays charts out: the column
 * sizes, tiles cut from the bottom TILE_HEIGHT apart, measures on the strip, its
 * source from its own chart on sdvx.in, its tiles named where `tileFile` puts them. Null when it
 * is; otherwise why not.
 */
export function checkBundleChart(chart: BundleChart): string | null {
  const { manifest, tiles, source } = chart;
  if (
    manifest.width !== COLUMN.pitch ||
    manifest.gutter !== COLUMN.gutter ||
    manifest.lane !== COLUMN.lane
  )
    return "its columns aren't sdvx.in's size";
  if (manifest.height <= 0 || manifest.columns <= 0)
    return "its picture is empty";
  const ranges = tileRanges(manifest.height);
  if (
    tiles.length !== ranges.length ||
    tiles.some(
      (tile, index) =>
        tile.file !== tileFile(chart.chartId, chart.variant, index) ||
        tile.height !== (ranges[index]?.[1] ?? 0) - (ranges[index]?.[0] ?? 0) ||
        tile.height > TILE_HEIGHT,
    )
  )
    return "its tiles don't add up to its height";
  // Only plain lanes (picture.ts) come without measure numbers.
  if (
    (manifest.measures.length === 0) !== (manifest.plainLanes === true) ||
    manifest.measures.some(
      (at, index) =>
        at > manifest.height || at < (manifest.measures[index - 1] ?? 0),
    )
  )
    return "its measures don't fit the picture";
  if (source.ref !== chart.sdvxRef)
    return "its layers come from another of sdvx.in's charts";
  return null;
}

/**
 * A WebP file's pixel size from its header (lossy VP8, lossless VP8L or extended
 * VP8X), or null when the bytes aren't WebP.
 */
export function webpSize(
  bytes: Uint8Array,
): { width: number; height: number } | null {
  if (bytes.length < 30) return null;
  const text = (from: number, to: number) =>
    String.fromCharCode(...bytes.subarray(from, to));
  if (text(0, 4) !== "RIFF" || text(8, 12) !== "WEBP") return null;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const chunk = text(12, 16);
  if (chunk === "VP8 ") {
    // A key frame: its start code, then 14-bit width and height.
    if (bytes[23] !== 0x9d || bytes[24] !== 0x01 || bytes[25] !== 0x2a)
      return null;
    return {
      width: view.getUint16(26, true) & 0x3fff,
      height: view.getUint16(28, true) & 0x3fff,
    };
  }
  if (chunk === "VP8L") {
    if (bytes[20] !== 0x2f) return null;
    const bits = view.getUint32(21, true);
    return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 };
  }
  if (chunk === "VP8X") {
    const u24 = (at: number) =>
      (bytes[at] ?? 0) |
      ((bytes[at + 1] ?? 0) << 8) |
      ((bytes[at + 2] ?? 0) << 16);
    return { width: u24(24) + 1, height: u24(27) + 1 };
  }
  return null;
}
