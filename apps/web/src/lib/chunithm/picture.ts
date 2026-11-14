/**
 * Making a chart's picture from sdvx.in: its three layers, named from its ref as
 * sdvx.in's viewer names them (each a WebP of the same size: lossy colour, lossless
 * alpha), joined into one strip (@trilleo/chunithm's charts.ts) and cut into
 * TILE_HEIGHT WebP tiles. A judgement build also draws each note's judgement ranges
 * under it (@trilleo/chunithm's judgement.ts).
 *
 * No database or storage here, so the same code runs on the server (build.ts, which
 * keeps layers between attempts and uploads the tiles) and on the admin's computer
 * (scripts/chunithm-bundle.ts, which bundles them for /admin/chunithm/import/). What
 * either makes comes out the same, so a bundle's tiles are as good as the server's.
 */
import {
  COLUMN,
  JUDGEMENT_VERSION,
  JUDGEMENT_WINDOWS,
  checkOverlaps,
  countNotes,
  drawOver,
  drawRanges,
  findLayout,
  findMeasures,
  findNotes,
  fitOldLayer,
  isOldLayer,
  judgementRanges,
  pixelsPerMs,
  plainLanes,
  sdvxImages,
  stripHeight,
  stripTile,
  tileRanges,
  type RgbaImage,
  type SdvxImages,
} from "@trilleo/chunithm";
import type {
  ChuniBuildManifest,
  ChuniBuildSource,
  ChuniJudgementInfo,
} from "@trilleo/db";
import { BUILD_LIMITS } from "./limits";
import { giveWay } from "./png";
import {
  FetchError,
  LAYER_DOWNLOAD,
  download,
  type DownloadProgress,
} from "./sources";
import { decodeWebp, isWebp } from "./webp";

/**
 * Bump when the tiles or manifest would come out differently: charts rebuild when
 * viewed, and bundles made by older code are refused on import.
 */
export const BUILD_VERSION = 1;

/** Which notes layer a picture is made from: as played, or sdvx.in's mirrored one. */
export const VARIANTS = ["normal", "mirror"] as const;
export type Variant = (typeof VARIANTS)[number];

/**
 * What a build makes: a variant's picture, or the same with judgement ranges drawn
 * under the notes (built only when someone asks; never bundled or built ahead).
 */
export const BUILD_VARIANTS = [
  ...VARIANTS,
  "judgement",
  "judgement-mirror",
] as const;
export type BuildVariant = (typeof BUILD_VARIANTS)[number];

export function isBuildVariant(value: string): value is BuildVariant {
  return (BUILD_VARIANTS as readonly string[]).includes(value);
}

/** Whether a build draws judgement ranges. */
export function isJudgement(variant: BuildVariant): boolean {
  return variant === "judgement" || variant === "judgement-mirror";
}

/** The notes layer a build uses. */
export function notesVariant(variant: BuildVariant): Variant {
  return variant === "mirror" || variant === "judgement-mirror"
    ? "mirror"
    : "normal";
}

/** What drawing judgement ranges needs: the chart's BPM, and sdvx.in's counts. */
export interface JudgementInput {
  bpm: number;
  expected: { tap: number | null; flick: number | null } | null;
}

/** What went wrong, in words for the admin (and the viewer). */
export class BuildError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BuildError";
  }
}

export type LayerName =
  "lanes" | "notes" | "mirrored notes" | "measure numbers";

/** A layer's URL, bytes, and a tag that changes when sdvx.in redraws it. */
export interface Layer {
  url: string;
  bytes: Uint8Array;
  tag: string;
}

export interface PictureDeps {
  fetch: typeof fetch;
  sdvxOrigin: string;
  encode: (image: RgbaImage) => Promise<Uint8Array>;
  /** Gets a layer; `downloadLayer` unless the caller keeps copies. */
  layer?: (url: string, name: LayerName) => Promise<Layer>;
  /** Told about a layer that wouldn't decode (so a kept copy can go). */
  broken?: (layer: Layer, name: LayerName) => Promise<void>;
  /** Hears how far it has got (the bundling script's progress line). */
  progress?: (step: PictureStep) => void;
}

/** Where making a picture has got. */
export type PictureStep =
  | { stage: "downloading" }
  | { stage: "joining" }
  | ({ stage: "layer"; name: LayerName } & DownloadProgress)
  | { stage: "tiles"; done: number; total: number };

export interface Tile {
  index: number;
  height: number;
  bytes: Uint8Array;
}

/** A made picture, its tiles already handed to `onTile`. */
export interface Picture {
  manifest: Omit<ChuniBuildManifest, "tiles">;
  source: ChuniBuildSource;
  /** The layers' full URLs. */
  urls: { bg: string; obj: string; bar: string };
}

/** A layer's tag: sdvx.in's ETag (or Last-Modified) and size. */
export function layerTag(headers: Headers, size: number): string {
  return `${headers.get("etag") ?? headers.get("last-modified") ?? ""}|${String(size)}`;
}

/** The chart's three layers on sdvx.in (site paths), from its ref. */
export function imagesOf(ref: string): SdvxImages {
  const images = sdvxImages(ref);
  if (!images) throw new BuildError(`"${ref}" isn't one of sdvx.in's charts.`);
  return images;
}

/** Downloads a layer (no redirects: sdvx.in sends missing files to an HTML page). */
export async function downloadLayer(
  fetcher: typeof fetch,
  url: string,
  name: LayerName,
  onProgress?: (progress: DownloadProgress) => void,
): Promise<Layer> {
  let file;
  try {
    file = await download(
      fetcher,
      url,
      "image/webp",
      { ...LAYER_DOWNLOAD, maxBytes: BUILD_LIMITS.maxLayerBytes },
      onProgress,
    );
  } catch (error) {
    const reason =
      error instanceof FetchError
        ? error.message.slice(url.length + 2)
        : error instanceof Error
          ? error.message
          : "failed";
    throw new BuildError(
      reason === "too large"
        ? `The ${name} layer is too large.`
        : `The ${name} layer couldn't be downloaded: ${reason}. It's tried again later.`,
    );
  }
  if (file.status !== 200)
    throw new BuildError(
      `sdvx.in has no ${name} layer for this chart (HTTP ${String(file.status)}).`,
    );
  const { bytes } = file;
  if (!isWebp(bytes))
    throw new BuildError(
      `sdvx.in's ${name} layer for this chart isn't a picture.`,
    );
  return { url, bytes, tag: layerTag(file.headers, bytes.byteLength) };
}

/** A chart's three layers, downloaded ahead of joining (`fetchLayers`). */
export interface Fetched {
  images: SdvxImages;
  /** By full URL. */
  layers: Map<string, Layer>;
}

/** The notes layer the variant uses, and its name. */
function notesOf(images: SdvxImages, variant: Variant): [string, LayerName] {
  return variant === "mirror"
    ? [images.mirror, "mirrored notes"]
    : [images.obj, "notes"];
}

/**
 * Downloads a chart's three layers (compressed, a few MB each), for `makePicture` to
 * join later: the bundling script downloads several charts at once this way while
 * joining them one at a time.
 */
export async function fetchLayers(
  deps: Pick<PictureDeps, "fetch" | "sdvxOrigin" | "progress">,
  ref: string,
  variant: Variant,
): Promise<Fetched> {
  const images = imagesOf(ref);
  deps.progress?.({ stage: "downloading" });
  const layers = new Map<string, Layer>();
  const named: [string, LayerName][] = [
    [images.bg, "lanes"],
    notesOf(images, variant),
    [images.bar, "measure numbers"],
  ];
  for (const [src, name] of named) {
    const url = new URL(src, deps.sdvxOrigin).href;
    const progress = deps.progress;
    layers.set(
      url,
      await downloadLayer(
        deps.fetch,
        url,
        name,
        progress &&
          ((step) => {
            progress({ stage: "layer", name, ...step });
          }),
      ),
    );
  }
  return { images, layers };
}

/**
 * Makes the chart's picture: one layer at a time, to keep memory down (lanes, notes
 * over them, numbers on top), then each tile, bottom first, to `onTile`. With
 * `fetched` (from `fetchLayers`) nothing is downloaded. With `judgement`, the notes
 * are found and their judgement ranges drawn on the lanes before the notes go over
 * them (the measure numbers are read first then, to measure them).
 */
export async function makePicture(
  deps: PictureDeps,
  ref: string,
  variant: Variant,
  onTile: (tile: Tile) => Promise<void>,
  fetched?: Fetched,
  /** Draws judgement ranges under the notes (judgement.ts). */
  judgement?: JudgementInput,
): Promise<Picture> {
  deps.progress?.({ stage: fetched ? "joining" : "downloading" });
  const images = fetched?.images ?? imagesOf(ref);
  const [notes, notesName] = notesOf(images, variant);
  const get = (src: string, name: LayerName) => {
    const url = new URL(src, deps.sdvxOrigin).href;
    const ready = fetched?.layers.get(url);
    if (ready) return Promise.resolve(ready);
    const progress = deps.progress;
    return deps.layer
      ? deps.layer(url, name)
      : downloadLayer(
          deps.fetch,
          url,
          name,
          progress &&
            ((step) => {
              progress({ stage: "layer", name, ...step });
            }),
        );
  };
  const decode = async (layer: Layer, name: LayerName) => {
    try {
      return await decodeWebp(layer.bytes);
    } catch (error) {
      await deps.broken?.(layer, name);
      throw new BuildError(
        `The ${name} layer can't be read: ${error instanceof Error ? error.message : "broken"}`,
      );
    }
  };

  const bgLayer = await get(images.bg, "lanes");
  const lanesImage = await decode(bgLayer, "lanes");
  const notesLayer = await get(notes, notesName);
  const notesImage = await decode(notesLayer, notesName);
  // A few charts' lanes are still sdvx.in's older, half-size drawing (OLD_COLUMN).
  const fitted = isOldLayer(lanesImage, notesImage)
    ? fitOldLayer(lanesImage, notesImage, true)
    : lanesImage;
  // A few Ultima charts have no lanes of their own: the song's are another
  // difficulty's, another size. Their notes go on plain lanes (`plainLanes`).
  const plain =
    sizeOf(fitted) === sizeOf(notesImage) ? null : plainLanes(notesImage);
  const picture = plain ?? fitted;
  sameSize(picture, notesImage, notesName);
  const layout = findLayout(picture);
  checkOverlaps(picture, notesImage, layout);
  // Downloaded even for plain lanes, so its tag notices sdvx.in drawing proper ones.
  const readBar = async () => {
    const layer = await get(images.bar, "measure numbers");
    const drawn = await decode(layer, "measure numbers");
    return { layer, drawn };
  };
  const fitBar = (drawn: RgbaImage) => {
    const image = isOldLayer(drawn, notesImage)
      ? fitOldLayer(drawn, notesImage)
      : drawn;
    sameSize(picture, image, "measure numbers");
    return image;
  };
  let bar: { layer: Layer; drawn: RgbaImage } | null = null;
  let fittedBar: RgbaImage | null = null;
  let measures: number[] = [];
  let drawn: ChuniJudgementInfo | undefined;
  if (judgement) {
    // The ranges go under the notes and are measured by the measures: numbers first.
    if (plain)
      throw new BuildError(
        "This chart is on plain lanes without measure lines, so its judgement ranges can't be measured.",
      );
    bar = await readBar();
    fittedBar = fitBar(bar.drawn);
    measures = findMeasures(fittedBar, layout);
    const pxPerMs = pixelsPerMs(measures, judgement.bpm);
    if (pxPerMs === null)
      throw new BuildError(
        "This chart has too few measures to measure its judgement ranges.",
      );
    const notes = findNotes(notesImage, layout);
    await giveWay();
    drawRanges(picture, layout, judgementRanges(notes, pxPerMs));
    drawn = {
      version: JUDGEMENT_VERSION,
      bpm: judgement.bpm,
      pxPerMs: Math.round(pxPerMs * 10_000) / 10_000,
      windows: JUDGEMENT_WINDOWS,
      found: countNotes(notes),
      expected: judgement.expected,
    };
  }
  await giveWay();
  drawOver(picture, notesImage);
  await giveWay();
  bar ??= await readBar();
  const barLayer = bar.layer;
  if (!plain) {
    const barImage = fittedBar ?? fitBar(bar.drawn);
    if (!fittedBar) measures = findMeasures(barImage, layout);
    await giveWay();
    drawOver(picture, barImage);
  }

  const height = stripHeight(layout);
  const ranges = tileRanges(height);
  for (const [index, [from, to]] of ranges.entries()) {
    deps.progress?.({ stage: "tiles", done: index, total: ranges.length });
    await giveWay();
    const bytes = await deps.encode(stripTile(picture, layout, from, to));
    await onTile({ index, height: to - from, bytes });
  }
  return {
    manifest: {
      width: COLUMN.pitch,
      height,
      gutter: COLUMN.gutter,
      lane: COLUMN.lane,
      measures,
      columns: layout.columns.length,
      ...(plain ? { plainLanes: true as const } : {}),
      ...(drawn ? { judgement: drawn } : {}),
    },
    source: {
      ref,
      path: "",
      bg: images.bg,
      obj: notes,
      bar: images.bar,
      tags: { bg: bgLayer.tag, obj: notesLayer.tag, bar: barLayer.tag },
    },
    urls: { bg: bgLayer.url, obj: notesLayer.url, bar: barLayer.url },
  };
}

function sizeOf(image: { width: number; height: number }): string {
  return `${String(image.width)}×${String(image.height)}`;
}

function sameSize(
  a: { width: number; height: number },
  b: { width: number; height: number },
  name: LayerName,
) {
  if (a.width !== b.width || a.height !== b.height)
    throw new BuildError(
      `The ${name} layer is ${String(b.width)}×${String(b.height)}, the lanes ${String(a.width)}×${String(a.height)}.`,
    );
}
