// eslint-disable-next-line @typescript-eslint/triple-slash-reference -- the site compiles this package's sources, and these ambient types must come along (an import of a .d.ts can't)
/// <reference path="./vendor.d.ts" />
/**
 * Image conversion in the browser: decode anything the browser reads (plus TIFF and
 * HEIC through small decoders), resize on a canvas, encode to the target. Codec
 * libraries load only when a file needs them.
 */
import type { FileType } from "@trilleo/tool-kit";
import { fitWithin, imageTarget, type ImageOptions } from "./targets";
import { encodeBmp, encodeIco } from "./writers";

/** Refuse images bigger than this many pixels (a canvas this big uses ~400 MB). */
export const MAX_PIXELS = 100_000_000;

/** A problem to show as is (unlike unexpected errors, which get a generic message). */
export class ConvertError extends Error {
  override name = "ConvertError";
}

function canvasOf(width: number, height: number): HTMLCanvasElement {
  if (width * height > MAX_PIXELS)
    throw new ConvertError("This image is too large to convert in a browser.");
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

function context(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const ctx = canvas.getContext("2d", { willReadFrequently: false });
  if (!ctx) throw new ConvertError("This browser can't draw images.");
  return ctx;
}

function fromRgba(
  rgba: Uint8Array | Uint8ClampedArray,
  width: number,
  height: number,
): HTMLCanvasElement {
  const canvas = canvasOf(width, height);
  const pixels = new Uint8ClampedArray(width * height * 4);
  pixels.set(rgba.subarray(0, pixels.length));
  context(canvas).putImageData(new ImageData(pixels, width, height), 0, 0);
  return canvas;
}

async function decodeTiff(file: File): Promise<HTMLCanvasElement> {
  const UTIF = await import("utif2");
  const buffer = await file.arrayBuffer();
  const [ifd] = UTIF.decode(buffer);
  if (!ifd) throw new ConvertError("This TIFF has no image in it.");
  UTIF.decodeImage(buffer, ifd);
  return fromRgba(UTIF.toRGBA8(ifd), ifd.width, ifd.height);
}

async function decodeHeic(file: File): Promise<HTMLCanvasElement> {
  const { default: load } =
    await import("libheif-js/libheif-wasm/libheif-bundle.mjs");
  const libheif = await load();
  const images = new libheif.HeifDecoder().decode(
    new Uint8Array(await file.arrayBuffer()),
  );
  const image = images.find((candidate) => candidate.is_primary()) ?? images[0];
  if (!image) throw new ConvertError("This HEIC file has no image in it.");
  try {
    const width = image.get_width();
    const height = image.get_height();
    const target = {
      data: new Uint8ClampedArray(width * height * 4),
      width,
      height,
    };
    const decoded = await new Promise<{ data: Uint8ClampedArray }>(
      (resolve, reject) => {
        image.display(target, (result) => {
          if (result) resolve(result);
          else reject(new ConvertError("This HEIC image couldn't be decoded."));
        });
      },
    );
    return fromRgba(decoded.data, width, height);
  } finally {
    for (const each of images) each.free();
  }
}

/** SVGs draw through an <img>; ones without a size get 1024 px on the long side. */
async function decodeSvg(file: File): Promise<HTMLCanvasElement> {
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    let width = image.naturalWidth || 1024;
    let height = image.naturalHeight || 1024;
    if (width < 1024 && height < 1024) {
      const scale = 1024 / Math.max(width, height);
      width = Math.round(width * scale);
      height = Math.round(height * scale);
    }
    const canvas = canvasOf(width, height);
    context(canvas).drawImage(image, 0, 0, width, height);
    return canvas;
  } catch {
    throw new ConvertError("This SVG couldn't be drawn.");
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Decodes the file at its full size. EXIF orientation is applied. */
export async function decodeImage(
  file: File,
  type: FileType | null,
): Promise<HTMLCanvasElement | ImageBitmap> {
  switch (type?.ext) {
    case "tiff":
      return decodeTiff(file);
    case "heic":
      // Safari reads HEIC itself; elsewhere libheif does.
      try {
        return await createImageBitmap(file);
      } catch {
        return decodeHeic(file);
      }
    case "svg":
      return decodeSvg(file);
    default:
      try {
        return await createImageBitmap(file, {
          imageOrientation: "from-image",
        });
      } catch {
        throw new ConvertError("This browser can't read this image.");
      }
  }
}

/**
 * Draws `source` at the new size. Big reductions go down in halving steps, which
 * looks much better than one smoothing pass.
 */
export function resize(
  source: HTMLCanvasElement | ImageBitmap,
  width: number,
  height: number,
  background: string | null,
): HTMLCanvasElement {
  let current: HTMLCanvasElement | ImageBitmap = source;
  let currentWidth = source.width;
  let currentHeight = source.height;
  while (currentWidth / 2 >= width && currentHeight / 2 >= height) {
    const half = canvasOf(
      Math.round(currentWidth / 2),
      Math.round(currentHeight / 2),
    );
    const ctx = context(half);
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(current, 0, 0, half.width, half.height);
    current = half;
    currentWidth = half.width;
    currentHeight = half.height;
  }
  const canvas = canvasOf(width, height);
  const ctx = context(canvas);
  if (background) {
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, width, height);
  }
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(current, 0, 0, width, height);
  return canvas;
}

function canvasBlob(
  canvas: HTMLCanvasElement,
  mime: string,
  quality?: number,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        // Browsers that can't write a format quietly hand back a PNG instead.
        if (blob?.type === mime) resolve(blob);
        else reject(new ConvertError("This browser can't write this format."));
      },
      mime,
      quality,
    );
  });
}

function pixelsOf(canvas: HTMLCanvasElement): ImageData {
  return context(canvas).getImageData(0, 0, canvas.width, canvas.height);
}

async function encodeAvif(
  canvas: HTMLCanvasElement,
  quality: number,
): Promise<Blob> {
  // The single-threaded encoder only: the threaded one needs cross-origin isolation.
  const [{ default: factory }, { initEmscriptenModule }] = await Promise.all([
    import("@jsquash/avif/codec/enc/avif_enc.js"),
    import("@jsquash/avif/utils.js"),
  ]);
  const { defaultOptions } = await import("@jsquash/avif/meta.js");
  const module = await initEmscriptenModule(factory);
  const pixels = pixelsOf(canvas);
  const output = module.encode(
    new Uint8Array(pixels.data.buffer),
    pixels.width,
    pixels.height,
    {
      ...defaultOptions,
      quality,
    },
  );
  if (!output) throw new ConvertError("AVIF encoding failed.");
  return new Blob([output.slice()], { type: "image/avif" });
}

async function encodeGif(canvas: HTMLCanvasElement): Promise<Blob> {
  const { GIFEncoder, applyPalette, quantize } = await import("gifenc");
  const { data, width, height } = pixelsOf(canvas);
  const palette = quantize(data, 256, {
    format: "rgba4444",
    oneBitAlpha: true,
  });
  const index = applyPalette(data, palette, "rgba4444");
  const transparentIndex = palette.findIndex((color) => color[3] === 0);
  const gif = GIFEncoder();
  gif.writeFrame(index, width, height, {
    palette,
    ...(transparentIndex >= 0 ? { transparent: true, transparentIndex } : {}),
  });
  gif.finish();
  return new Blob([gif.bytes().slice()], { type: "image/gif" });
}

async function encodeTiff(canvas: HTMLCanvasElement): Promise<Blob> {
  const UTIF = await import("utif2");
  const { data, width, height } = pixelsOf(canvas);
  return new Blob(
    [UTIF.encodeImage(new Uint8Array(data.buffer), width, height)],
    {
      type: "image/tiff",
    },
  );
}

/** One square PNG per size: the image fitted inside, centered on transparency. */
async function encodeIcoFile(
  source: HTMLCanvasElement | ImageBitmap,
  sizes: readonly number[],
): Promise<Blob> {
  if (sizes.length === 0)
    throw new ConvertError("Pick at least one icon size.");
  const images = [];
  for (const size of [...sizes].sort((a, b) => a - b)) {
    // Unlike other targets, icons scale small sources up to fill the square.
    const scale = Math.min(size / source.width, size / source.height);
    const width = Math.max(1, Math.round(source.width * scale));
    const height = Math.max(1, Math.round(source.height * scale));
    const square = canvasOf(size, size);
    const ctx = context(square);
    ctx.imageSmoothingQuality = "high";
    const scaled = resize(source, width, height, null);
    ctx.drawImage(
      scaled,
      Math.round((size - width) / 2),
      Math.round((size - height) / 2),
    );
    const png = new Uint8Array(
      await (await canvasBlob(square, "image/png")).arrayBuffer(),
    );
    images.push({ size, png });
  }
  return new Blob([encodeIco(images).slice()], { type: "image/x-icon" });
}

export interface ImageResult {
  blob: Blob;
  width: number;
  height: number;
}

/** Converts one image file with the given options. */
export async function convertImage(
  file: File,
  type: FileType | null,
  options: ImageOptions,
): Promise<ImageResult> {
  const target = imageTarget(options.target);
  const source = await decodeImage(file, type);
  try {
    if (target.id === "ico") {
      const largest = Math.max(...options.icoSizes);
      return {
        blob: await encodeIcoFile(source, options.icoSizes),
        width: largest,
        height: largest,
      };
    }
    const { width, height } = fitWithin(
      source.width,
      source.height,
      options.maxWidth,
      options.maxHeight,
    );
    const canvas = resize(
      source,
      width,
      height,
      target.alpha ? null : options.background,
    );
    const quality = options.quality / 100;
    let blob: Blob;
    switch (target.id) {
      case "avif":
        blob = await encodeAvif(canvas, options.quality);
        break;
      case "gif":
        blob = await encodeGif(canvas);
        break;
      case "bmp":
        blob = new Blob([encodeBmp(pixelsOf(canvas)).slice()], {
          type: "image/bmp",
        });
        break;
      case "tiff":
        blob = await encodeTiff(canvas);
        break;
      default:
        blob = await canvasBlob(
          canvas,
          target.mime,
          target.lossy ? quality : undefined,
        );
    }
    return { blob, width, height };
  } finally {
    if ("close" in source) source.close();
  }
}

/** Formats this browser can write with a canvas (the rest are always available). */
export async function canvasWrites(mime: string): Promise<boolean> {
  try {
    await canvasBlob(canvasOf(1, 1), mime, 0.8);
    return true;
  } catch {
    return false;
  }
}
