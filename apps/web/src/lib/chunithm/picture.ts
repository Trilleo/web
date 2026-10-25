/**
 * Making a chart's picture from sdvx.in: the chart page's script for its three
 * layers, the layers themselves (each a PNG of the same size), joined into one strip
 * (@trilleo/chunithm's charts.ts) and cut into TILE_HEIGHT WebP tiles.
 *
 * No database or storage here, so the same code runs on the server (build.ts, which
 * keeps layers between attempts and uploads the tiles) and on the admin's computer
 * (scripts/chunithm-bundle.ts, which bundles them for /admin/chunithm/import/). What
 * either makes comes out the same, so a bundle's tiles are as good as the server's.
 */
import {
  COLUMN,
  checkOverlaps,
  drawOver,
  findLayout,
  findMeasures,
  parseSdvxImages,
  sdvxImageScript,
  stripHeight,
  stripTile,
  tileRanges,
  type RgbaImage,
  type SdvxImages,
} from "@trilleo/chunithm";
import type { ChuniBuildManifest, ChuniBuildSource } from "@trilleo/db";
import { BUILD_LIMITS } from "./limits";
import { decodePng, giveWay, isPng } from "./png";
import {
  FETCH_LIMITS,
  FetchError,
  LAYER_DOWNLOAD,
  download,
  fetchText,
} from "./sources";

/**
 * Bump when the tiles or manifest would come out differently: charts rebuild when
 * viewed, and bundles made by older code are refused on import.
 */
export const BUILD_VERSION = 1;

export const VARIANTS = ["normal", "mirror"] as const;
export type Variant = (typeof VARIANTS)[number];

/** What went wrong, in words for the admin (and the viewer). */
export class BuildError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BuildError";
  }
}

export type LayerName = "lanes" | "notes" | "measure numbers";

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
}

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

/** The chart page's three layers, read from its script (never guessed). */
export async function readImages(
  fetcher: typeof fetch,
  origin: string,
  path: string,
): Promise<SdvxImages> {
  const script = sdvxImageScript(path);
  if (!script) throw new BuildError(`"${path}" isn't an sdvx.in chart page.`);
  const text = await fetchText(
    fetcher,
    new URL(script, origin).href,
    FETCH_LIMITS.maxPageBytes,
  );
  const images = parseSdvxImages(text, path);
  if (!images)
    throw new BuildError(
      `sdvx.in's script for ${path} names no picture for it.`,
    );
  return images;
}

/** Downloads a layer (no redirects: sdvx.in sends missing files to an HTML page). */
export async function downloadLayer(
  fetcher: typeof fetch,
  url: string,
  name: LayerName,
): Promise<Layer> {
  let file;
  try {
    file = await download(fetcher, url, "image/png", {
      ...LAYER_DOWNLOAD,
      maxBytes: BUILD_LIMITS.maxLayerBytes,
    });
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
  if (!isPng(bytes))
    throw new BuildError(
      `sdvx.in's ${name} layer for this chart isn't a picture.`,
    );
  return { url, bytes, tag: layerTag(file.headers, bytes.byteLength) };
}

/**
 * Makes the chart's picture: one layer at a time, to keep memory down (lanes, notes
 * over them, numbers on top), then each tile, bottom first, to `onTile`.
 */
export async function makePicture(
  deps: PictureDeps,
  path: string,
  variant: Variant,
  onTile: (tile: Tile) => Promise<void>,
): Promise<Picture> {
  const images = await readImages(deps.fetch, deps.sdvxOrigin, path);
  const notes = variant === "mirror" ? images.mirror : images.obj;
  if (!notes)
    throw new BuildError("sdvx.in has no mirrored notes for this chart.");
  const get = (src: string, name: LayerName) => {
    const url = new URL(src, deps.sdvxOrigin).href;
    return deps.layer
      ? deps.layer(url, name)
      : downloadLayer(deps.fetch, url, name);
  };
  const decode = async (layer: Layer, name: LayerName) => {
    try {
      return await decodePng(layer.bytes);
    } catch (error) {
      await deps.broken?.(layer, name);
      throw new BuildError(
        `The ${name} layer can't be read: ${error instanceof Error ? error.message : "broken"}`,
      );
    }
  };

  const bgLayer = await get(images.bg, "lanes");
  const picture = await decode(bgLayer, "lanes");
  const layout = findLayout(picture);
  const notesLayer = await get(notes, "notes");
  const notesImage = await decode(notesLayer, "notes");
  sameSize(picture, notesImage, "notes");
  await giveWay();
  drawOver(picture, notesImage);
  await giveWay();
  const barLayer = await get(images.bar, "measure numbers");
  const barImage = await decode(barLayer, "measure numbers");
  sameSize(picture, barImage, "measure numbers");
  const measures = findMeasures(barImage, layout);
  await giveWay();
  drawOver(picture, barImage);
  await giveWay();
  checkOverlaps(picture, layout);

  const height = stripHeight(layout);
  for (const [index, [from, to]] of tileRanges(height).entries()) {
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
    },
    source: {
      path,
      bg: images.bg,
      obj: notes,
      bar: images.bar,
      tags: { bg: bgLayer.tag, obj: notesLayer.tag, bar: barLayer.tag },
    },
    urls: { bg: bgLayer.url, obj: notesLayer.url, bar: barLayer.url },
  };
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
