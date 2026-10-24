/**
 * A small PNG decoder for sdvx.in's chart layers, on Node's zlib: 8-bit, not
 * interlaced, RGBA, RGB, grey (with or without alpha) or palette. Anything else, or
 * anything over PNG_LIMITS, is refused with a PngError rather than guessed at. Native
 * image libraries can't go in the server bundle, and this is all the charts need.
 */
import { deflateSync, inflateSync } from "node:zlib";
import type { RgbaImage } from "@trilleo/chunithm";

export const PNG_LIMITS = {
  maxWidth: 50_000,
  maxHeight: 8_192,
  /** About 60 MB of RGBA. */
  maxPixels: 15_000_000,
};

export class PngError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PngError";
  }
}

const SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

/** Whether the bytes start like a PNG. */
export function isPng(bytes: Uint8Array): boolean {
  return SIGNATURE.every((byte, i) => bytes[i] === byte);
}

const CHANNELS: Record<number, number> = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 };

export function decodePng(bytes: Uint8Array): RgbaImage {
  if (!isPng(bytes)) throw new PngError("Not a PNG.");
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let offset = 8;
  let width = 0;
  let height = 0;
  let colorType = -1;
  let palette: Uint8Array | null = null;
  let paletteAlpha: Uint8Array | null = null;
  const idat: Uint8Array[] = [];
  while (offset + 8 <= bytes.length) {
    const length = view.getUint32(offset);
    const type = String.fromCharCode(...bytes.subarray(offset + 4, offset + 8));
    const data = bytes.subarray(offset + 8, offset + 8 + length);
    if (data.length !== length) throw new PngError("Cut short.");
    offset += 12 + length;
    if (type === "IHDR") {
      if (length < 13) throw new PngError("Broken header.");
      const header = new DataView(
        data.buffer,
        data.byteOffset,
        data.byteLength,
      );
      width = header.getUint32(0);
      height = header.getUint32(4);
      const depth = data[8];
      colorType = data[9] ?? -1;
      const interlace = data[12];
      if (depth !== 8)
        throw new PngError(`Bit depth ${String(depth)} isn't supported.`);
      if (!(colorType in CHANNELS))
        throw new PngError(`Colour type ${String(colorType)} isn't supported.`);
      if (interlace !== 0)
        throw new PngError("Interlaced PNGs aren't supported.");
      if (
        width === 0 ||
        height === 0 ||
        width > PNG_LIMITS.maxWidth ||
        height > PNG_LIMITS.maxHeight ||
        width * height > PNG_LIMITS.maxPixels
      )
        throw new PngError(`${String(width)}×${String(height)} is too large.`);
    } else if (type === "PLTE") {
      palette = data;
    } else if (type === "tRNS") {
      paletteAlpha = data;
    } else if (type === "IDAT") {
      idat.push(data);
    } else if (type === "IEND") {
      break;
    }
  }
  if (width === 0) throw new PngError("No header.");
  if (colorType === 3 && !palette) throw new PngError("No palette.");
  const channels = CHANNELS[colorType] ?? 4;
  const stride = width * channels;
  let raw: Buffer;
  try {
    raw = inflateSync(Buffer.concat(idat), {
      maxOutputLength: (stride + 1) * height,
    });
  } catch {
    throw new PngError("The image data is broken.");
  }
  if (raw.length !== (stride + 1) * height)
    throw new PngError("The image data is short.");

  // Undo the row filters in place.
  const rows = new Uint8Array(stride * height);
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)];
    const src = y * (stride + 1) + 1;
    const out = y * stride;
    for (let i = 0; i < stride; i++) {
      const x = raw[src + i] ?? 0;
      const a = i >= channels ? (rows[out + i - channels] ?? 0) : 0;
      const b = y > 0 ? (rows[out - stride + i] ?? 0) : 0;
      const c =
        i >= channels && y > 0 ? (rows[out - stride + i - channels] ?? 0) : 0;
      let value: number;
      switch (filter) {
        case 0:
          value = x;
          break;
        case 1:
          value = x + a;
          break;
        case 2:
          value = x + b;
          break;
        case 3:
          value = x + ((a + b) >> 1);
          break;
        case 4: {
          const p = a + b - c;
          const pa = Math.abs(p - a);
          const pb = Math.abs(p - b);
          const pc = Math.abs(p - c);
          value = x + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c);
          break;
        }
        default:
          throw new PngError(`Unknown row filter ${String(filter)}.`);
      }
      rows[out + i] = value & 0xff;
    }
  }

  if (colorType === 6) return { width, height, data: rows };
  const data = new Uint8Array(width * height * 4);
  for (let i = 0, o = 0; i < rows.length; i += channels, o += 4) {
    const v = rows[i] ?? 0;
    if (colorType === 2) {
      data[o] = v;
      data[o + 1] = rows[i + 1] ?? 0;
      data[o + 2] = rows[i + 2] ?? 0;
      data[o + 3] = 255;
    } else if (colorType === 3) {
      data[o] = palette?.[v * 3] ?? 0;
      data[o + 1] = palette?.[v * 3 + 1] ?? 0;
      data[o + 2] = palette?.[v * 3 + 2] ?? 0;
      data[o + 3] = paletteAlpha?.[v] ?? 255;
    } else {
      data[o] = v;
      data[o + 1] = v;
      data[o + 2] = v;
      data[o + 3] = colorType === 4 ? (rows[i + 1] ?? 0) : 255;
    }
  }
  return { width, height, data };
}

/** Writes an RGBA PNG (no filters): for tests, and nothing heavy. */
export function encodePng(image: RgbaImage): Uint8Array {
  const { width, height, data } = image;
  const raw = new Uint8Array((width * 4 + 1) * height);
  for (let y = 0; y < height; y++)
    raw.set(
      data.subarray(y * width * 4, (y + 1) * width * 4),
      y * (width * 4 + 1) + 1,
    );
  const chunk = (type: string, body: Uint8Array) => {
    const out = new Uint8Array(12 + body.length);
    const view = new DataView(out.buffer);
    view.setUint32(0, body.length);
    for (let i = 0; i < 4; i++) out[4 + i] = type.charCodeAt(i);
    out.set(body, 8);
    // decodePng doesn't check CRCs; write zeros.
    return out;
  };
  const header = new Uint8Array(13);
  const view = new DataView(header.buffer);
  view.setUint32(0, width);
  view.setUint32(4, height);
  header.set([8, 6, 0, 0, 0], 8);
  const parts = [
    new Uint8Array(SIGNATURE),
    chunk("IHDR", header),
    chunk("IDAT", deflateSync(raw)),
    chunk("IEND", new Uint8Array(0)),
  ];
  return new Uint8Array(Buffer.concat(parts));
}
