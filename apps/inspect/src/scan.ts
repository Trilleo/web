import {
  createBLAKE3,
  createCRC32,
  createMD5,
  createSHA1,
  createSHA256,
  createSHA3,
  createSHA384,
  createSHA512,
  type IHasher,
} from "hash-wasm";

/** The hashes the tool shows, in order. */
export const ALGORITHMS = [
  { id: "md5", label: "MD5", create: () => createMD5() },
  { id: "sha1", label: "SHA-1", create: () => createSHA1() },
  { id: "sha256", label: "SHA-256", create: () => createSHA256() },
  { id: "sha384", label: "SHA-384", create: () => createSHA384() },
  { id: "sha512", label: "SHA-512", create: () => createSHA512() },
  { id: "sha3-256", label: "SHA3-256", create: () => createSHA3(256) },
  { id: "blake3", label: "BLAKE3", create: () => createBLAKE3() },
  { id: "crc32", label: "CRC32", create: () => createCRC32() },
] as const satisfies readonly {
  id: string;
  label: string;
  create: () => Promise<IHasher>;
}[];

export type AlgorithmId = (typeof ALGORITHMS)[number]["id"];

export type Hashes = Record<AlgorithmId, string>;

export interface ScanResult {
  hashes: Hashes;
  /** How often each byte value occurs (256 counts). */
  histogram: number[];
}

/** Bytes read per step: big enough to be fast, small enough to keep the page responsive. */
export const CHUNK_BYTES = 4 * 1024 * 1024;

/** Lets the browser paint (and take input) between chunks. */
const yieldToBrowser = () =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, 0);
  });

/**
 * Reads the file once, in chunks, feeding every hash and the byte histogram, so
 * files larger than memory work. `onProgress` gets the bytes read so far.
 */
export async function scanFile(
  file: Blob,
  {
    onProgress,
    signal,
  }: { onProgress?: (read: number) => void; signal?: AbortSignal } = {},
): Promise<ScanResult> {
  const hashers = await Promise.all(
    ALGORITHMS.map((algorithm) => algorithm.create()),
  );
  for (const hasher of hashers) hasher.init();
  const histogram = new Array<number>(256).fill(0);

  for (let offset = 0; offset < file.size; offset += CHUNK_BYTES) {
    signal?.throwIfAborted();
    const chunk = new Uint8Array(
      await file.slice(offset, offset + CHUNK_BYTES).arrayBuffer(),
    );
    for (const hasher of hashers) hasher.update(chunk);
    for (const byte of chunk) histogram[byte] = (histogram[byte] ?? 0) + 1;
    onProgress?.(Math.min(file.size, offset + chunk.length));
    await yieldToBrowser();
  }
  signal?.throwIfAborted();

  const hashes = Object.fromEntries(
    ALGORITHMS.map((algorithm, i) => [
      algorithm.id,
      hashers[i]?.digest("hex") ?? "",
    ]),
  ) as Hashes;
  return { hashes, histogram };
}

/** Shannon entropy in bits per byte: 0 (all the same) to 8 (random). */
export function entropy(histogram: readonly number[]): number {
  const total = histogram.reduce((sum, count) => sum + count, 0);
  if (total === 0) return 0;
  let bits = 0;
  for (const count of histogram) {
    if (count === 0) continue;
    const p = count / total;
    bits -= p * Math.log2(p);
  }
  return bits;
}

/** What an entropy figure usually means, for people. */
export function describeEntropy(bits: number): string {
  if (bits >= 7.9) return "Looks compressed or encrypted";
  if (bits >= 7) return "Dense: compressed media or packed data";
  if (bits >= 4.5) return "Mixed: typical of binaries or text in many scripts";
  if (bits >= 1) return "Low: text or repetitive data";
  return "Almost uniform";
}

/**
 * Which hash a pasted value is, if it matches one: case and surrounding spaces
 * don't matter, and a "sha256:" style prefix is allowed.
 */
export function matchHash(input: string, hashes: Hashes): AlgorithmId | null {
  const value = input
    .trim()
    .toLowerCase()
    .replace(/^[a-z0-9-]+:/, "");
  if (!/^[0-9a-f]+$/.test(value)) return null;
  const match = ALGORITHMS.find((algorithm) => hashes[algorithm.id] === value);
  return match?.id ?? null;
}
