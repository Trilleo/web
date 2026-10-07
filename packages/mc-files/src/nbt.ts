/**
 * NBT, Minecraft's binary data format: Java Edition writes it big-endian (usually
 * gzipped: level.dat, .litematic, .schem, .nbt), Bedrock little-endian (level.dat
 * after an 8-byte header, .mcstructure). Read into plain values: compounds become
 * objects, lists arrays, longs bigints, and byte/int/long arrays typed arrays.
 */

export type NbtValue =
  | number
  | bigint
  | string
  | Int8Array
  | Int32Array
  | BigInt64Array
  | NbtValue[]
  | NbtCompound;

export interface NbtCompound {
  [key: string]: NbtValue;
}

export class NbtError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NbtError";
  }
}

/** Nesting deeper than this is refused (real files stay far below it). */
const MAX_DEPTH = 64;

const utf8 = new TextDecoder();

class Reader {
  private readonly view: DataView;
  at = 0;
  constructor(
    private readonly bytes: Uint8Array,
    private readonly little: boolean,
  ) {
    this.view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  }
  private need(n: number) {
    if (n < 0 || this.at + n > this.bytes.length)
      throw new NbtError("The data ends too soon.");
  }
  u8() {
    this.need(1);
    return this.view.getUint8(this.at++);
  }
  i8() {
    this.need(1);
    return this.view.getInt8(this.at++);
  }
  i16() {
    this.need(2);
    const value = this.view.getInt16(this.at, this.little);
    this.at += 2;
    return value;
  }
  u16() {
    this.need(2);
    const value = this.view.getUint16(this.at, this.little);
    this.at += 2;
    return value;
  }
  i32() {
    this.need(4);
    const value = this.view.getInt32(this.at, this.little);
    this.at += 4;
    return value;
  }
  i64() {
    this.need(8);
    const value = this.view.getBigInt64(this.at, this.little);
    this.at += 8;
    return value;
  }
  f32() {
    this.need(4);
    const value = this.view.getFloat32(this.at, this.little);
    this.at += 4;
    return value;
  }
  f64() {
    this.need(8);
    const value = this.view.getFloat64(this.at, this.little);
    this.at += 8;
    return value;
  }
  string() {
    const length = this.u16();
    this.need(length);
    const text = utf8.decode(this.bytes.subarray(this.at, this.at + length));
    this.at += length;
    return text;
  }
  count() {
    const n = this.i32();
    if (n < 0) throw new NbtError("A negative length.");
    return n;
  }
  int8s() {
    const n = this.count();
    this.need(n);
    const out = Int8Array.from(
      this.bytes.subarray(this.at, this.at + n),
      (b) => (b << 24) >> 24,
    );
    this.at += n;
    return out;
  }
  int32s() {
    const n = this.count();
    this.need(n * 4);
    const out = new Int32Array(n);
    for (let i = 0; i < n; i++) out[i] = this.i32();
    return out;
  }
  int64s() {
    const n = this.count();
    this.need(n * 8);
    const out = new BigInt64Array(n);
    for (let i = 0; i < n; i++) out[i] = this.i64();
    return out;
  }
}

function payload(reader: Reader, type: number, depth: number): NbtValue {
  if (depth > MAX_DEPTH) throw new NbtError("Nested too deeply.");
  switch (type) {
    case 1:
      return reader.i8();
    case 2:
      return reader.i16();
    case 3:
      return reader.i32();
    case 4:
      return reader.i64();
    case 5:
      return reader.f32();
    case 6:
      return reader.f64();
    case 7:
      return reader.int8s();
    case 8:
      return reader.string();
    case 9: {
      const itemType = reader.u8();
      const n = reader.count();
      if (itemType === 0) return [];
      const items: NbtValue[] = [];
      for (let i = 0; i < n; i++)
        items.push(payload(reader, itemType, depth + 1));
      return items;
    }
    case 10: {
      const compound: NbtCompound = {};
      for (;;) {
        const tag = reader.u8();
        if (tag === 0) return compound;
        const name = reader.string();
        compound[name] = payload(reader, tag, depth + 1);
      }
    }
    case 11:
      return reader.int32s();
    case 12:
      return reader.int64s();
    default:
      throw new NbtError(`Unknown tag type ${String(type)}.`);
  }
}

/**
 * Reads uncompressed NBT: a named root compound. Returns the root's name and value.
 * `little` for Bedrock's little-endian files.
 */
export function readNbt(
  bytes: Uint8Array,
  options: { little?: boolean } = {},
): { name: string; value: NbtCompound } {
  const reader = new Reader(bytes, options.little ?? false);
  const type = reader.u8();
  if (type !== 10) throw new NbtError("Not NBT: the root isn’t a compound.");
  const name = reader.string();
  return { name, value: payload(reader, 10, 0) as NbtCompound };
}

/** Whether bytes start like gzip. */
export function isGzip(bytes: Uint8Array): boolean {
  return bytes[0] === 0x1f && bytes[1] === 0x8b;
}

/** Ungzips, refusing to grow past `maxBytes` (a guard against zip bombs). */
export async function gunzip(
  bytes: Uint8Array,
  maxBytes = 64 * 1024 * 1024,
): Promise<Uint8Array> {
  const stream = new Blob([bytes as BlobPart])
    .stream()
    .pipeThrough(new DecompressionStream("gzip"));
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.length;
    if (total > maxBytes) {
      await reader.cancel();
      throw new NbtError("It unpacks to more than we read.");
    }
    chunks.push(value);
  }
  const out = new Uint8Array(total);
  let at = 0;
  for (const chunk of chunks) {
    out.set(chunk, at);
    at += chunk.length;
  }
  return out;
}

/** Reads Java Edition NBT that may or may not be gzipped. */
export async function readJavaNbt(
  bytes: Uint8Array,
): Promise<{ name: string; value: NbtCompound }> {
  return readNbt(isGzip(bytes) ? await gunzip(bytes) : bytes);
}

// --- Reading values out ---------------------------------------------------------

export function isCompound(value: NbtValue | undefined): value is NbtCompound {
  return (
    typeof value === "object" &&
    !Array.isArray(value) &&
    !ArrayBuffer.isView(value)
  );
}

/** A path into compounds: get(root, "Data", "Version", "Name"). */
export function get(
  value: NbtValue | undefined,
  ...path: string[]
): NbtValue | undefined {
  let current = value;
  for (const key of path) {
    if (!isCompound(current)) return undefined;
    current = current[key];
  }
  return current;
}

export function getString(
  value: NbtValue | undefined,
  ...path: string[]
): string | undefined {
  const found = get(value, ...path);
  return typeof found === "string" ? found : undefined;
}

export function getNumber(
  value: NbtValue | undefined,
  ...path: string[]
): number | undefined {
  const found = get(value, ...path);
  if (typeof found === "number") return found;
  if (typeof found === "bigint") return Number(found);
  return undefined;
}
