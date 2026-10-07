/**
 * The blocks in a build: Litematica (.litematic), Sponge (.schem v1–3), vanilla
 * structures (.nbt) and Bedrock structures (.mcstructure), read into one model: a
 * box of block indices into a palette of plain block names ("stone", "oak_planks").
 * Old MCEdit .schematic files use numeric ids from before 1.13 and aren't read.
 */
import {
  get,
  getNumber,
  getString,
  gunzip,
  isCompound,
  isGzip,
  readNbt,
  type NbtCompound,
  type NbtValue,
} from "./nbt";

export interface VoxelModel {
  /** Width (x), height (y) and length (z), in blocks. */
  size: [number, number, number];
  /** Block names; index 0 is always "air". */
  palette: string[];
  /** One palette index per block, x fastest, then z, then y (layer by layer). */
  data: Uint16Array;
}

export class VoxelError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "VoxelError";
  }
}

/** The biggest box we read (blocks). */
export const MAX_VOLUME = 256 * 256 * 256;

const AIR = new Set(["air", "cave_air", "void_air", "structure_void"]);

/** "minecraft:oak_stairs[facing=east]" → "oak_stairs"; air kinds → "air". */
export function blockName(id: string): string {
  const bare = id
    .replace(/\[.*$/, "")
    .replace(/^minecraft:/, "")
    .trim();
  return AIR.has(bare) || bare === "" ? "air" : bare;
}

/** Builds a model, mapping each source palette entry to a merged palette. */
class Builder {
  readonly palette: string[] = ["air"];
  private readonly lookup = new Map<string, number>([["air", 0]]);
  readonly data: Uint16Array;

  constructor(readonly size: [number, number, number]) {
    const [x, y, z] = size;
    if (x <= 0 || y <= 0 || z <= 0)
      throw new VoxelError("The build has no size.");
    if (x * y * z > MAX_VOLUME)
      throw new VoxelError("The build is too big to preview.");
    this.data = new Uint16Array(x * y * z);
  }

  index(name: string): number {
    const bare = blockName(name);
    let found = this.lookup.get(bare);
    if (found === undefined) {
      found = this.palette.length;
      if (found > 0xffff) throw new VoxelError("Too many kinds of block.");
      this.palette.push(bare);
      this.lookup.set(bare, found);
    }
    return found;
  }

  set(x: number, y: number, z: number, value: number) {
    const [sx, sy, sz] = this.size;
    if (x < 0 || y < 0 || z < 0 || x >= sx || y >= sy || z >= sz) return;
    this.data[x + z * sx + y * sx * sz] = value;
  }

  done(): VoxelModel {
    return { size: this.size, palette: this.palette, data: this.data };
  }
}

/** A palette entry's block name (`key` is "Name", or Bedrock's "name"). */
const paletteName = (entry: NbtValue, key: string): string =>
  getString(entry, key) ?? "air";

const num = (value: NbtValue | undefined): number =>
  typeof value === "number"
    ? value
    : typeof value === "bigint"
      ? Number(value)
      : 0;

/** A short (Sponge's sizes) read as unsigned: sizes above 32 767 wrap negative. */
const unsignedShort = (value: number) => value & 0xffff;

// --- Litematica -----------------------------------------------------------------

/** Reads `bits`-wide values packed across a long array (values may span longs). */
function packedReader(longs: BigInt64Array, bits: number) {
  // The longs as 32-bit words, low half first: bit n of the stream is bit n % 32
  // of word n / 32, so no BigInt arithmetic per value.
  const words = new Uint32Array(
    longs.buffer,
    longs.byteOffset,
    longs.length * 2,
  );
  const mask = bits === 32 ? 0xffffffff : (1 << bits) - 1;
  return (index: number): number => {
    const bit = index * bits;
    const word = bit >>> 5;
    const offset = bit & 31;
    let value = (words[word] ?? 0) >>> offset;
    if (offset + bits > 32) value |= (words[word + 1] ?? 0) << (32 - offset);
    return (value & mask) >>> 0;
  };
}

interface Region {
  min: [number, number, number];
  size: [number, number, number];
  value: NbtCompound;
}

function readLitematic(root: NbtCompound): VoxelModel {
  const regions = get(root, "Regions");
  if (!isCompound(regions)) throw new VoxelError("No regions.");
  const list: Region[] = [];
  for (const value of Object.values(regions)) {
    if (!isCompound(value)) continue;
    const pos = [
      getNumber(value, "Position", "x") ?? 0,
      getNumber(value, "Position", "y") ?? 0,
      getNumber(value, "Position", "z") ?? 0,
    ];
    const raw = [
      getNumber(value, "Size", "x") ?? 0,
      getNumber(value, "Size", "y") ?? 0,
      getNumber(value, "Size", "z") ?? 0,
    ];
    // A negative size grows from the position towards smaller coordinates.
    const min = pos.map((p, i) => {
      const s = raw[i] ?? 0;
      return s < 0 ? p + s + 1 : p;
    }) as [number, number, number];
    const size = raw.map((s) => Math.abs(s)) as [number, number, number];
    if (size.every((s) => s > 0)) list.push({ min, size, value });
  }
  if (list.length === 0) throw new VoxelError("No regions.");
  const low = [0, 1, 2].map((i) => Math.min(...list.map((r) => r.min[i] ?? 0)));
  const high = [0, 1, 2].map((i) =>
    Math.max(...list.map((r) => (r.min[i] ?? 0) + (r.size[i] ?? 0))),
  );
  const builder = new Builder([
    (high[0] ?? 0) - (low[0] ?? 0),
    (high[1] ?? 0) - (low[1] ?? 0),
    (high[2] ?? 0) - (low[2] ?? 0),
  ]);
  for (const region of list) {
    const palette = get(region.value, "BlockStatePalette");
    const states = get(region.value, "BlockStates");
    if (!Array.isArray(palette) || !(states instanceof BigInt64Array)) continue;
    const map = palette.map((entry) =>
      builder.index(paletteName(entry, "Name")),
    );
    const bits = Math.max(2, Math.ceil(Math.log2(palette.length)));
    const read = packedReader(states, bits);
    const [sx, sy, sz] = region.size;
    const [ox, oy, oz] = [0, 1, 2].map(
      (i) => (region.min[i] ?? 0) - (low[i] ?? 0),
    );
    let index = 0;
    for (let y = 0; y < sy; y++)
      for (let z = 0; z < sz; z++)
        for (let x = 0; x < sx; x++) {
          const value = map[read(index++)] ?? 0;
          if (value)
            builder.set(x + (ox ?? 0), y + (oy ?? 0), z + (oz ?? 0), value);
        }
  }
  return builder.done();
}

// --- Sponge ---------------------------------------------------------------------

function readVarints(bytes: Int8Array, count: number): Uint32Array {
  const out = new Uint32Array(count);
  let at = 0;
  for (let i = 0; i < count; i++) {
    let value = 0;
    let shift = 0;
    for (;;) {
      const byte = (bytes[at++] ?? 0) & 0xff;
      value |= (byte & 0x7f) << shift;
      if (!(byte & 0x80)) break;
      shift += 7;
      if (shift > 28 || at > bytes.length)
        throw new VoxelError("Broken block data.");
    }
    out[i] = value >>> 0;
  }
  return out;
}

function readSponge(root: NbtCompound): VoxelModel {
  const schematic = get(root, "Schematic");
  const base: NbtValue = isCompound(schematic) ? schematic : root;
  const width = unsignedShort(getNumber(base, "Width") ?? 0);
  const height = unsignedShort(getNumber(base, "Height") ?? 0);
  const length = unsignedShort(getNumber(base, "Length") ?? 0);
  // v3 keeps the palette and data in "Blocks"; v1/v2 at the top.
  const blocks = get(base, "Blocks");
  const holder: NbtValue = isCompound(blocks) ? blocks : base;
  const palette = get(holder, "Palette");
  const data = isCompound(blocks)
    ? get(blocks, "Data")
    : get(base, "BlockData");
  if (!isCompound(palette) || !(data instanceof Int8Array))
    throw new VoxelError("Not a Sponge schematic.");
  const builder = new Builder([width, height, length]);
  const map = new Map<number, number>();
  for (const [name, id] of Object.entries(palette))
    map.set(num(id), builder.index(name));
  const values = readVarints(data, width * height * length);
  let index = 0;
  for (let y = 0; y < height; y++)
    for (let z = 0; z < length; z++)
      for (let x = 0; x < width; x++) {
        const value = map.get(values[index++] ?? 0) ?? 0;
        if (value) builder.set(x, y, z, value);
      }
  return builder.done();
}

// --- Vanilla structures (.nbt) ------------------------------------------------------

function readStructure(root: NbtCompound): VoxelModel {
  const size = get(root, "size");
  const blocks = get(root, "blocks");
  let palette = get(root, "palette");
  if (!Array.isArray(palette)) {
    const palettes = get(root, "palettes");
    palette = Array.isArray(palettes) ? palettes[0] : undefined;
  }
  if (!Array.isArray(size) || !Array.isArray(blocks) || !Array.isArray(palette))
    throw new VoxelError("Not a structure.");
  const builder = new Builder([num(size[0]), num(size[1]), num(size[2])]);
  const map = palette.map((entry) => builder.index(paletteName(entry, "Name")));
  for (const block of blocks) {
    if (!isCompound(block)) continue;
    const pos = get(block, "pos");
    if (!Array.isArray(pos)) continue;
    const value = map[num(get(block, "state"))] ?? 0;
    if (value) builder.set(num(pos[0]), num(pos[1]), num(pos[2]), value);
  }
  return builder.done();
}

// --- Bedrock structures (.mcstructure) ------------------------------------------------

function readMcstructure(root: NbtCompound): VoxelModel {
  const size = get(root, "size");
  const indices = get(root, "structure", "block_indices");
  const palette = get(root, "structure", "palette", "default", "block_palette");
  if (
    !Array.isArray(size) ||
    !Array.isArray(indices) ||
    !Array.isArray(palette)
  )
    throw new VoxelError("Not a Bedrock structure.");
  const [sx, sy, sz] = [num(size[0]), num(size[1]), num(size[2])];
  const builder = new Builder([sx, sy, sz]);
  const map = palette.map((entry) => builder.index(paletteName(entry, "name")));
  const layer = indices[0];
  const list: ArrayLike<number> =
    layer instanceof Int32Array
      ? layer
      : Array.isArray(layer)
        ? layer.map((value) => num(value))
        : [];
  // Bedrock orders blocks z fastest, then y, then x; -1 is "no block".
  let index = 0;
  for (let x = 0; x < sx; x++)
    for (let y = 0; y < sy; y++)
      for (let z = 0; z < sz; z++) {
        const state = list[index++] ?? -1;
        const value = state >= 0 ? (map[state] ?? 0) : 0;
        if (value) builder.set(x, y, z, value);
      }
  return builder.done();
}

/**
 * The blocks in a build file (by its extension). Throws VoxelError for files that
 * can't be shown: unknown formats, broken files, builds over MAX_VOLUME.
 */
export async function readVoxels(
  bytes: Uint8Array,
  name: string,
): Promise<VoxelModel> {
  const ext = name.toLowerCase().split(".").pop() ?? "";
  if (ext === "mcstructure")
    return readMcstructure(readNbt(bytes, { little: true }).value);
  const raw = isGzip(bytes) ? await gunzip(bytes, 256 * 1024 * 1024) : bytes;
  const { value } = readNbt(raw);
  if (ext === "litematic") return readLitematic(value);
  if (ext === "schem") return readSponge(value);
  if (ext === "nbt") return readStructure(value);
  throw new VoxelError(
    "Only .litematic, .schem, .nbt and .mcstructure builds can be previewed.",
  );
}

/** Blocks of each kind, most first (air left out). */
export function countBlocks(
  model: VoxelModel,
): { block: string; count: number }[] {
  const counts = new Uint32Array(model.palette.length);
  for (const value of model.data) counts[value] = (counts[value] ?? 0) + 1;
  return model.palette
    .map((block, index) => ({ block, count: counts[index] ?? 0 }))
    .filter((entry) => entry.block !== "air" && entry.count > 0)
    .sort((a, b) => b.count - a.count || a.block.localeCompare(b.block));
}
