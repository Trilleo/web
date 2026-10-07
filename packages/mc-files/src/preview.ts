/**
 * The compact form of a build that its page loads for the 3D view: made once in the
 * creator's browser when the build is uploaded, checked and stored by the server.
 *
 *   "MCVX" · version (u8) · header length (u32 LE) · header (JSON: size, palette)
 *   · block runs: (palette index, run length) as varints, in the model's order
 *
 * then gzipped. Builds are mostly air and long runs, so this is small.
 */
import { gunzip } from "./nbt";
import { MAX_VOLUME, type VoxelModel } from "./voxels";

const MAGIC = [0x4d, 0x43, 0x56, 0x58]; // "MCVX"
const VERSION = 1;

/** The most a stored preview may weigh (gzipped). */
export const MAX_PREVIEW_BYTES = 2 * 1024 * 1024;

export class PreviewError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PreviewError";
  }
}

function pushVarint(out: number[], value: number) {
  let rest = value >>> 0;
  while (rest >= 0x80) {
    out.push((rest & 0x7f) | 0x80);
    rest >>>= 7;
  }
  out.push(rest);
}

async function gzip(bytes: Uint8Array): Promise<Uint8Array> {
  const stream = new Blob([bytes as BlobPart])
    .stream()
    .pipeThrough(new CompressionStream("gzip"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

/** A model as preview bytes (gzipped). */
export async function encodePreview(model: VoxelModel): Promise<Uint8Array> {
  const header = new TextEncoder().encode(
    JSON.stringify({ size: model.size, palette: model.palette }),
  );
  const runs: number[] = [];
  const { data } = model;
  let at = 0;
  while (at < data.length) {
    const value = data[at] ?? 0;
    let end = at + 1;
    while (end < data.length && data[end] === value) end++;
    pushVarint(runs, value);
    pushVarint(runs, end - at);
    at = end;
  }
  const out = new Uint8Array(9 + header.length + runs.length);
  out.set(MAGIC, 0);
  out[4] = VERSION;
  new DataView(out.buffer).setUint32(5, header.length, true);
  out.set(header, 9);
  out.set(runs, 9 + header.length);
  return gzip(out);
}

/**
 * Preview bytes back into a model. Throws PreviewError for anything that isn't a
 * well-formed preview (the server checks every upload this way).
 */
export async function decodePreview(gzipped: Uint8Array): Promise<VoxelModel> {
  let bytes: Uint8Array;
  try {
    bytes = await gunzip(gzipped, 64 * 1024 * 1024);
  } catch {
    throw new PreviewError("Not a preview.");
  }
  if (bytes.length < 9 || MAGIC.some((byte, i) => bytes[i] !== byte))
    throw new PreviewError("Not a preview.");
  if (bytes[4] !== VERSION) throw new PreviewError("Unknown preview version.");
  const headerLength = new DataView(bytes.buffer, bytes.byteOffset).getUint32(
    5,
    true,
  );
  if (9 + headerLength > bytes.length)
    throw new PreviewError("Broken preview.");
  let header: unknown;
  try {
    header = JSON.parse(
      new TextDecoder().decode(bytes.subarray(9, 9 + headerLength)),
    );
  } catch {
    throw new PreviewError("Broken preview.");
  }
  const { size, palette } = (header ?? {}) as {
    size?: unknown;
    palette?: unknown;
  };
  if (
    !Array.isArray(size) ||
    size.length !== 3 ||
    !size.every((n) => Number.isInteger(n) && n > 0 && n <= 4096)
  )
    throw new PreviewError("Broken preview size.");
  if (
    !Array.isArray(palette) ||
    palette.length === 0 ||
    palette.length > 0xffff ||
    palette[0] !== "air" ||
    !palette.every(
      (name) => typeof name === "string" && /^[a-z0-9_.:-]{1,64}$/.test(name),
    )
  )
    throw new PreviewError("Broken preview palette.");
  const [sx, sy, sz] = size as [number, number, number];
  const volume = sx * sy * sz;
  if (volume > MAX_VOLUME) throw new PreviewError("Preview too big.");
  const data = new Uint16Array(volume);
  let at = 9 + headerLength;
  let filled = 0;
  const varint = () => {
    let value = 0;
    let shift = 0;
    for (;;) {
      if (at >= bytes.length) throw new PreviewError("Broken preview data.");
      const byte = bytes[at++] ?? 0;
      value += (byte & 0x7f) * 2 ** shift;
      if (!(byte & 0x80)) return value;
      shift += 7;
      if (shift > 35) throw new PreviewError("Broken preview data.");
    }
  };
  while (filled < volume) {
    const value = varint();
    const run = varint();
    if (value >= palette.length || run === 0 || filled + run > volume)
      throw new PreviewError("Broken preview data.");
    if (value !== 0) data.fill(value, filled, filled + run);
    filled += run;
  }
  if (at !== bytes.length) throw new PreviewError("Broken preview data.");
  return { size: [sx, sy, sz], palette: palette as string[], data };
}
