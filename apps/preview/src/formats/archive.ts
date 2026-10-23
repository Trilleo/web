/**
 * ZIP and gzip, through fflate: listing an archive without unpacking it, unpacking
 * one entry, and unpacking whole documents (Office, OpenDocument, EPUB) with a cap on
 * the unpacked size, so a small file can't expand into gigabytes (a "zip bomb").
 */
import { gunzipSync, unzipSync } from "fflate";
import { MAX_PREVIEW_BYTES } from "../links";

/** The most a document may unpack to, all entries together. */
export const MAX_UNPACKED_BYTES = 4 * MAX_PREVIEW_BYTES;

export interface ZipEntry {
  name: string;
  size: number;
  packed: number;
  directory: boolean;
}

export class ArchiveError extends Error {
  override name = "ArchiveError";
}

export function listZip(bytes: Uint8Array): ZipEntry[] {
  const entries: ZipEntry[] = [];
  unzipSync(bytes, {
    filter: (file) => {
      entries.push({
        name: file.name,
        size: file.originalSize,
        packed: file.size,
        directory: file.name.endsWith("/"),
      });
      return false;
    },
  });
  return entries;
}

/** One entry's bytes. */
export function extractEntry(bytes: Uint8Array, name: string): Uint8Array {
  const found = { tooBig: false };
  const files = unzipSync(bytes, {
    filter: (file) => {
      if (file.name !== name) return false;
      if (file.originalSize > MAX_PREVIEW_BYTES) {
        found.tooBig = true;
        return false;
      }
      return true;
    },
  });
  if (found.tooBig)
    throw new ArchiveError("That file is too big to preview once unpacked.");
  const entry = files[name];
  if (!entry) throw new ArchiveError("That file isn't in the archive.");
  return entry;
}

/** Every entry of a document's package, refusing ones that unpack too big. */
export function unzipDocument(bytes: Uint8Array): Record<string, Uint8Array> {
  let total = 0;
  for (const entry of listZip(bytes)) total += entry.size;
  if (total > MAX_UNPACKED_BYTES)
    throw new ArchiveError(
      "This file unpacks to far more than its size, so it isn't opened.",
    );
  return unzipSync(bytes);
}

/** A gzip file's contents. The size it claims (its last 4 bytes) is checked first. */
export function gunzip(bytes: Uint8Array): Uint8Array {
  const n = bytes.length;
  const claimed =
    n >= 4
      ? ((bytes[n - 4] ?? 0) |
          ((bytes[n - 3] ?? 0) << 8) |
          ((bytes[n - 2] ?? 0) << 16) |
          ((bytes[n - 1] ?? 0) << 24)) >>>
        0
      : 0;
  // The field is the size modulo 4 GiB, so a huge file could still claim little;
  // a ratio past 1000:1 is refused as well.
  if (claimed > MAX_PREVIEW_BYTES || n * 1000 < claimed)
    throw new ArchiveError("This file is too big to preview once unpacked.");
  const out = gunzipSync(bytes);
  if (out.length > MAX_PREVIEW_BYTES)
    throw new ArchiveError("This file is too big to preview once unpacked.");
  return out;
}
