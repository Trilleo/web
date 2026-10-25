/**
 * WebP on the server: encoding chart tiles and jackets, and decoding sdvx.in's
 * layers. libwebp compiled to WebAssembly (@jsquash/webp); both wasm files are inlined
 * into the server bundle with `?inline` (astro.config's assetsInclude), like resvg's
 * for share images, and started once. Node has WebAssembly SIMD, so @jsquash's
 * feature check is skipped and the encoder's SIMD build is used.
 */
import type { RgbaImage } from "@trilleo/chunithm";
import decoderFactory from "@jsquash/webp/codec/dec/webp_dec.js";
import decoderWasm from "@jsquash/webp/codec/dec/webp_dec.wasm?inline";
import factory from "@jsquash/webp/codec/enc/webp_enc_simd.js";
import webpWasm from "@jsquash/webp/codec/enc/webp_enc_simd.wasm?inline";
import { defaultOptions } from "@jsquash/webp/meta.js";
import { initEmscriptenModule } from "@jsquash/webp/utils.js";

/** Lossy at 90: next to the PNG, the notes look the same at twice the size. */
export const WEBP_QUALITY = 90;

/** The part of libwebp's Emscripten module we call (its own types don't resolve). */
interface Encoder {
  encode(
    data: Uint8ClampedArray,
    width: number,
    height: number,
    options: typeof defaultOptions,
  ): Uint8Array | null;
}

/** The decoder's part (it returns an ImageData, which it defines itself in Node). */
interface Decoder {
  decode(
    data: BufferSource,
  ): { data: Uint8ClampedArray; width: number; height: number } | null;
}

// The glue modules are typed through Emscripten's global types, which aren't loaded
// here: hold them as unknown and give them the factory's declared type.
const glue: unknown = factory;
const decoderGlue: unknown = decoderFactory;
let encoder: Promise<Encoder> | null = null;
let decoder: Promise<Decoder> | null = null;

function instantiate<T>(dataUrl: string, module: unknown): Promise<T> {
  return WebAssembly.compile(
    Buffer.from(dataUrl.slice(dataUrl.indexOf(",") + 1), "base64"),
  ).then(
    (compiled) =>
      initEmscriptenModule(
        module as Parameters<typeof initEmscriptenModule>[0],
        compiled,
      ) as unknown as Promise<T>,
  );
}

function start(): Promise<Encoder> {
  encoder ??= instantiate<Encoder>(webpWasm, glue);
  return encoder;
}

/** "RIFF….WEBP": the first bytes of a WebP file. */
export function isWebp(bytes: Uint8Array): boolean {
  const ascii = (from: number, to: number) =>
    String.fromCharCode(...bytes.subarray(from, to));
  return (
    bytes.byteLength >= 12 && ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP"
  );
}

/** Decodes a WebP file to RGBA (its ICC profile ignored). Throws when it can't. */
export async function decodeWebp(bytes: Uint8Array): Promise<RgbaImage> {
  if (!isWebp(bytes)) throw new Error("Not a WebP file.");
  decoder ??= instantiate<Decoder>(decoderWasm, decoderGlue);
  // Downloads are plain ArrayBuffers, never shared ones.
  const image = (await decoder).decode(bytes as Uint8Array<ArrayBuffer>);
  if (!image) throw new Error("The WebP file couldn't be decoded.");
  return {
    width: image.width,
    height: image.height,
    data: new Uint8Array(
      image.data.buffer,
      image.data.byteOffset,
      image.data.byteLength,
    ),
  };
}

/** Lossy at WEBP_QUALITY; `lossless` for tests, whose pixels must come back exact. */
export async function encodeWebp(
  image: RgbaImage,
  options: { lossless?: boolean } = {},
): Promise<Uint8Array> {
  const module = await start();
  const out = module.encode(
    new Uint8ClampedArray(
      image.data.buffer,
      image.data.byteOffset,
      image.data.byteLength,
    ),
    image.width,
    image.height,
    {
      ...defaultOptions,
      quality: WEBP_QUALITY,
      ...(options.lossless ? { lossless: 1, exact: 1 } : {}),
    },
  );
  if (!out) throw new Error("WebP encoding failed.");
  return new Uint8Array(out.buffer, out.byteOffset, out.byteLength);
}
