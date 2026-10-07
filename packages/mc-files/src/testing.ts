/** Test helpers (not for app code): write NBT, so tests can build worlds and schematics by hand. */
import { gzipSync } from "node:zlib";

export type NbtInput =
  | { byte: number }
  | { short: number }
  | { int: number }
  | { long: bigint }
  | { string: string }
  | { list: NbtInput[]; of: number }
  | { ints: number[] }
  | { bytes: number[] }
  | { longs: bigint[] }
  | { compound: Record<string, NbtInput> };

const TYPES = {
  byte: 1,
  short: 2,
  int: 3,
  long: 4,
  string: 8,
  list: 9,
  compound: 10,
  ints: 11,
  bytes: 7,
  longs: 12,
} as const;

function typeOf(value: NbtInput): number {
  const key = Object.keys(value).find((k) => k !== "of") as keyof typeof TYPES;
  return TYPES[key];
}

class Writer {
  bytes: number[] = [];
  constructor(private readonly little: boolean) {}
  private num(value: number, size: 1 | 2 | 4) {
    const view = new DataView(new ArrayBuffer(size));
    if (size === 1) view.setInt8(0, value);
    else if (size === 2) view.setInt16(0, value, this.little);
    else view.setInt32(0, value, this.little);
    this.bytes.push(...new Uint8Array(view.buffer));
  }
  u8(n: number) {
    this.bytes.push(n);
  }
  i16(n: number) {
    this.num(n, 2);
  }
  i32(n: number) {
    this.num(n, 4);
  }
  string(text: string) {
    const encoded = new TextEncoder().encode(text);
    const view = new DataView(new ArrayBuffer(2));
    view.setUint16(0, encoded.length, this.little);
    this.bytes.push(...new Uint8Array(view.buffer), ...encoded);
  }
  payload(value: NbtInput) {
    if ("byte" in value) this.num(value.byte, 1);
    else if ("short" in value) this.i16(value.short);
    else if ("int" in value) this.i32(value.int);
    else if ("long" in value) {
      const view = new DataView(new ArrayBuffer(8));
      view.setBigInt64(0, value.long, this.little);
      this.bytes.push(...new Uint8Array(view.buffer));
    } else if ("string" in value) this.string(value.string);
    else if ("bytes" in value) {
      this.i32(value.bytes.length);
      for (const n of value.bytes) this.num(n, 1);
    } else if ("longs" in value) {
      this.i32(value.longs.length);
      for (const n of value.longs) {
        const view = new DataView(new ArrayBuffer(8));
        view.setBigInt64(0, n, this.little);
        this.bytes.push(...new Uint8Array(view.buffer));
      }
    } else if ("ints" in value) {
      this.i32(value.ints.length);
      for (const n of value.ints) this.i32(n);
    } else if ("list" in value) {
      this.u8(value.of);
      this.i32(value.list.length);
      for (const item of value.list) this.payload(item);
    } else {
      for (const [name, child] of Object.entries(value.compound)) {
        this.u8(typeOf(child));
        this.string(name);
        this.payload(child);
      }
      this.u8(0);
    }
  }
}

/** A named root compound as NBT bytes (big-endian unless `little`). */
export function writeNbt(
  root: Record<string, NbtInput>,
  options: { little?: boolean; gzip?: boolean; name?: string } = {},
): Uint8Array {
  const writer = new Writer(options.little ?? false);
  writer.u8(10);
  writer.string(options.name ?? "");
  writer.payload({ compound: root });
  const bytes = new Uint8Array(writer.bytes);
  return options.gzip ? new Uint8Array(gzipSync(bytes)) : bytes;
}
