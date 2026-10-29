/**
 * Proof-of-work: find a nonce whose SHA-256 of `<salt>:<nonce>` starts with
 * `bits` zero bits. Each extra bit doubles the work on average; checking an answer
 * is one hash. It costs a person's browser a moment and a flood real CPU.
 */
import { sha256 } from "./sha256";

const encoder = new TextEncoder();

/** What's hashed for a nonce: short, so it fits in one SHA-256 block. */
export function powInput(salt: string, nonce: number): string {
  return `${salt}:${String(nonce)}`;
}

/** How many zero bits `hash` starts with. */
export function leadingZeroBits(hash: Uint8Array): number {
  let bits = 0;
  for (const byte of hash) {
    if (byte === 0) {
      bits += 8;
      continue;
    }
    return bits + Math.clz32(byte) - 24;
  }
  return bits;
}

/** Whether `nonce` answers the challenge (with any SHA-256 implementation). */
export function checkPow(
  salt: string,
  bits: number,
  nonce: number,
  hash: (input: string) => Uint8Array = (input) =>
    sha256(encoder.encode(input)),
): boolean {
  if (!Number.isSafeInteger(nonce) || nonce < 0) return false;
  return leadingZeroBits(hash(powInput(salt, nonce))) >= bits;
}

export interface SolveOptions {
  /** Hashes tried between yields to the page (keeps it responsive). */
  slice?: number;
  /** Called after each slice with hashes tried so far and those expected in all. */
  onProgress?: (tried: number, expected: number) => void;
  signal?: AbortSignal;
}

/**
 * Finds a nonce, a slice at a time, yielding between slices so the page keeps
 * responding (no worker: Astro may inline the script that would start it).
 */
export async function solvePow(
  salt: string,
  bits: number,
  options: SolveOptions = {},
): Promise<number> {
  const slice = options.slice ?? 20_000;
  const expected = 2 ** bits;
  for (let nonce = 0; ;) {
    const end = nonce + slice;
    for (; nonce < end; nonce++) {
      if (
        leadingZeroBits(sha256(encoder.encode(powInput(salt, nonce)))) >= bits
      )
        return nonce;
    }
    options.onProgress?.(nonce, expected);
    if (options.signal?.aborted) throw new Error("aborted");
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
}
