/**
 * WebP encoding on the server, for chart tiles: libwebp compiled to WebAssembly
 * (@jsquash/webp). The SIMD build is inlined into the server bundle with `?inline`
 * (astro.config's assetsInclude), like resvg's for share images, and started once.
 * Node has WebAssembly SIMD, so @jsquash's feature check is skipped.
 */
import type { RgbaImage } from "@trilleo/chunithm";
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

// The glue module is typed through Emscripten's global types, which aren't loaded
// here: hold it as unknown and give it the factory's declared type.
const glue: unknown = factory;
let encoder: Promise<Encoder> | null = null;

function start(): Promise<Encoder> {
  encoder ??= WebAssembly.compile(
    Buffer.from(webpWasm.slice(webpWasm.indexOf(",") + 1), "base64"),
  ).then(
    (module) =>
      initEmscriptenModule(
        glue as Parameters<typeof initEmscriptenModule>[0],
        module,
      ) as unknown as Promise<Encoder>,
  );
  return encoder;
}

export async function encodeWebp(image: RgbaImage): Promise<Uint8Array> {
  const module = await start();
  const out = module.encode(
    new Uint8ClampedArray(
      image.data.buffer,
      image.data.byteOffset,
      image.data.byteLength,
    ),
    image.width,
    image.height,
    { ...defaultOptions, quality: WEBP_QUALITY },
  );
  if (!out) throw new Error("WebP encoding failed.");
  return new Uint8Array(out.buffer, out.byteOffset, out.byteLength);
}
