// Types for the codec libraries that ship without them (only what this tool uses).

// @jsquash/avif's own types use this global namespace from a file they don't include.
declare namespace EmscriptenWasm {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type -- the base every module type extends
  interface Module {}
  interface ModuleOpts {
    noInitialRun?: boolean;
  }
  type ModuleFactory<T extends Module = Module> = (
    overrides?: Partial<ModuleOpts>,
  ) => Promise<T>;
}

declare module "gifenc" {
  export type GifFormat = "rgb565" | "rgb444" | "rgba4444";
  export type Palette = number[][];
  export function quantize(
    rgba: Uint8Array | Uint8ClampedArray,
    maxColors: number,
    options?: { format?: GifFormat; oneBitAlpha?: boolean | number },
  ): Palette;
  export function applyPalette(
    rgba: Uint8Array | Uint8ClampedArray,
    palette: Palette,
    format?: GifFormat,
  ): Uint8Array;
  export interface Encoder {
    writeFrame(
      index: Uint8Array,
      width: number,
      height: number,
      options?: {
        palette?: Palette;
        transparent?: boolean;
        transparentIndex?: number;
      },
    ): void;
    finish(): void;
    bytes(): Uint8Array;
  }
  export function GIFEncoder(): Encoder;
}

declare module "libheif-js/libheif-wasm/libheif-bundle.mjs" {
  export interface HeifImage {
    get_width(): number;
    get_height(): number;
    is_primary(): boolean;
    display(
      target: { data: Uint8ClampedArray; width: number; height: number },
      callback: (
        result: {
          data: Uint8ClampedArray;
          width: number;
          height: number;
        } | null,
      ) => void,
    ): void;
    free(): void;
  }
  export interface LibHeif {
    HeifDecoder: new () => { decode(data: Uint8Array): HeifImage[] };
  }
  const factory: () => LibHeif | Promise<LibHeif>;
  export default factory;
}
