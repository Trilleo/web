/**
 * Lists what's inside a ZIP file (and the formats built on it: .jar, .mcpack,
 * .mcworld, .mrpack…) from two ranged reads: the end of the file, then its central
 * directory. Nothing is decompressed, so a 1 GB archive costs a few kilobytes.
 * Reviewers see the list before they approve a file.
 */

export interface ArchiveEntry {
  name: string;
  /** Uncompressed size in bytes. */
  size: number;
  compressedSize: number;
  directory: boolean;
}

export interface ArchiveListing {
  entries: ArchiveEntry[];
  /** Entries in the archive (may be more than `entries`). */
  total: number;
  /** Uncompressed bytes of the listed entries. */
  uncompressed: number;
  truncated: boolean;
}

/** Reads bytes [start, end) of the file. */
export type ReadRange = (start: number, end: number) => Promise<Uint8Array>;

const EOCD = 0x06054b50;
const ZIP64_LOCATOR = 0x07064b50;
const ZIP64_EOCD = 0x06064b50;
const CENTRAL = 0x02014b50;
/** The central directory read at most (about 40 000 entries). */
const MAX_DIRECTORY_BYTES = 4 * 1024 * 1024;

class Reader {
  private readonly view: DataView;
  constructor(readonly bytes: Uint8Array) {
    this.view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  }
  u16(at: number) {
    return this.view.getUint16(at, true);
  }
  u32(at: number) {
    return this.view.getUint32(at, true);
  }
  u64(at: number) {
    return Number(this.view.getBigUint64(at, true));
  }
}

const utf8 = new TextDecoder("utf-8", { fatal: true });
const latin1 = new TextDecoder("latin1");

function decodeName(bytes: Uint8Array): string {
  try {
    return utf8.decode(bytes);
  } catch {
    return latin1.decode(bytes);
  }
}

/** The archive's entries, or null when it isn't a ZIP (or is damaged). */
export async function listZip(
  size: number,
  read: ReadRange,
  limit = 500,
): Promise<ArchiveListing | null> {
  if (size < 22) return null;
  const tailStart = Math.max(0, size - (22 + 65_535));
  const tail = new Reader(await read(tailStart, size));
  let eocd = -1;
  for (let i = tail.bytes.length - 22; i >= 0; i--) {
    if (tail.u32(i) === EOCD) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) return null;

  let total = tail.u16(eocd + 10);
  let directorySize = tail.u32(eocd + 12);
  let directoryOffset = tail.u32(eocd + 16);
  if (
    (total === 0xffff ||
      directorySize === 0xffffffff ||
      directoryOffset === 0xffffffff) &&
    eocd >= 20 &&
    tail.u32(eocd - 20) === ZIP64_LOCATOR
  ) {
    const recordAt = tail.u64(eocd - 20 + 8);
    const record = new Reader(await read(recordAt, recordAt + 56));
    if (record.bytes.length < 56 || record.u32(0) !== ZIP64_EOCD) return null;
    total = record.u64(32);
    directorySize = record.u64(40);
    directoryOffset = record.u64(48);
  }
  if (directoryOffset + directorySize > size) return null;

  const readSize = Math.min(directorySize, MAX_DIRECTORY_BYTES);
  const directory = new Reader(
    await read(directoryOffset, directoryOffset + readSize),
  );
  const entries: ArchiveEntry[] = [];
  let uncompressed = 0;
  let at = 0;
  while (entries.length < limit && at + 46 <= directory.bytes.length) {
    if (directory.u32(at) !== CENTRAL) break;
    let compressedSize = directory.u32(at + 20);
    let entrySize = directory.u32(at + 24);
    const nameLength = directory.u16(at + 28);
    const extraLength = directory.u16(at + 30);
    const commentLength = directory.u16(at + 32);
    const next = at + 46 + nameLength + extraLength + commentLength;
    if (next > directory.bytes.length) break;
    const name = decodeName(
      directory.bytes.subarray(at + 46, at + 46 + nameLength),
    );
    // ZIP64 sizes live in extra field 0x0001, in this order, only when needed.
    let extra = at + 46 + nameLength;
    const extraEnd = extra + extraLength;
    while (extra + 4 <= extraEnd) {
      const id = directory.u16(extra);
      const length = directory.u16(extra + 2);
      if (id === 0x0001) {
        let field = extra + 4;
        if (entrySize === 0xffffffff && field + 8 <= extra + 4 + length) {
          entrySize = directory.u64(field);
          field += 8;
        }
        if (compressedSize === 0xffffffff && field + 8 <= extra + 4 + length)
          compressedSize = directory.u64(field);
      }
      extra += 4 + length;
    }
    entries.push({
      name,
      size: entrySize,
      compressedSize,
      directory: name.endsWith("/"),
    });
    uncompressed += entrySize;
    at = next;
  }
  return {
    entries,
    total,
    uncompressed,
    truncated: entries.length < total,
  };
}
