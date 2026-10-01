/** One entry in a ZIP's central directory. */
export interface ZipEntry {
  name: string;
  size: number;
  compressedSize: number;
  /** "Stored", "Deflate", … */
  method: string;
  modified: Date | null;
  directory: boolean;
  encrypted: boolean;
}

export interface ZipListing {
  entries: ZipEntry[];
  /** How many entries the archive says it has (more than `entries` when cut off). */
  total: number;
  comment: string;
}

/** The most entries read; the rest are only counted. */
export const MAX_ZIP_ENTRIES = 2000;

const METHODS: Readonly<Record<number, string>> = {
  0: "Stored",
  8: "Deflate",
  9: "Deflate64",
  12: "Bzip2",
  14: "LZMA",
  93: "Zstandard",
  95: "XZ",
  99: "AES",
};

/** MS-DOS date and time, as ZIP stores them (local time, 2-second steps). */
function dosDate(date: number, time: number): Date | null {
  if (date === 0) return null;
  return new Date(
    1980 + (date >> 9),
    ((date >> 5) & 0x0f) - 1,
    date & 0x1f,
    time >> 11,
    (time >> 5) & 0x3f,
    (time & 0x1f) * 2,
  );
}

const utf8 = new TextDecoder();
const latin1 = new TextDecoder("latin1");

async function read(
  file: Blob,
  start: number,
  length: number,
): Promise<DataView> {
  const buffer = await file.slice(start, start + length).arrayBuffer();
  return new DataView(buffer);
}

function bytesOf(view: DataView, offset: number, length: number): Uint8Array {
  return new Uint8Array(view.buffer, view.byteOffset + offset, length);
}

/**
 * Lists a ZIP archive from its central directory at the end, without reading or
 * unpacking the files themselves. Returns null when it isn't a readable ZIP.
 */
export async function listZip(file: Blob): Promise<ZipListing | null> {
  // The end record is in the last 22 bytes plus a comment of up to 64 KiB.
  const tailLength = Math.min(file.size, 22 + 0xffff);
  const tail = await read(file, file.size - tailLength, tailLength);
  let end = -1;
  for (let i = tailLength - 22; i >= 0; i--) {
    if (tail.getUint32(i, true) === 0x06054b50) {
      end = i;
      break;
    }
  }
  if (end < 0) return null;

  let total = tail.getUint16(end + 10, true);
  let size = tail.getUint32(end + 12, true);
  let offset = tail.getUint32(end + 16, true);
  const commentLength = Math.min(
    tail.getUint16(end + 20, true),
    tailLength - end - 22,
  );
  const comment = utf8.decode(bytesOf(tail, end + 22, commentLength));

  // ZIP64: the real numbers are in a separate record, found through a locator.
  if (offset === 0xffffffff || total === 0xffff || size === 0xffffffff) {
    const locator = end - 20;
    if (locator >= 0 && tail.getUint32(locator, true) === 0x07064b50) {
      const recordOffset = Number(tail.getBigUint64(locator + 8, true));
      const record = await read(file, recordOffset, 56);
      if (record.getUint32(0, true) === 0x06064b50) {
        total = Number(record.getBigUint64(32, true));
        size = Number(record.getBigUint64(40, true));
        offset = Number(record.getBigUint64(48, true));
      }
    }
  }
  if (offset + size > file.size) return null;

  const directory = await read(file, offset, size);
  const entries: ZipEntry[] = [];
  let at = 0;
  while (at + 46 <= size && entries.length < Math.min(total, MAX_ZIP_ENTRIES)) {
    if (directory.getUint32(at, true) !== 0x02014b50) break;
    const flags = directory.getUint16(at + 8, true);
    const method = directory.getUint16(at + 10, true);
    let compressedSize = directory.getUint32(at + 20, true);
    let entrySize = directory.getUint32(at + 24, true);
    const nameLength = directory.getUint16(at + 28, true);
    const extraLength = directory.getUint16(at + 30, true);
    const entryCommentLength = directory.getUint16(at + 32, true);
    // Bit 11: the name is UTF-8; otherwise it's legacy code page 437 (latin1 is close).
    const name = (flags & 0x800 ? utf8 : latin1).decode(
      bytesOf(directory, at + 46, nameLength),
    );

    // ZIP64 sizes live in the extra field (id 1) when the 32-bit ones are maxed out.
    let extra = at + 46 + nameLength;
    const extraEnd = extra + extraLength;
    while (extra + 4 <= extraEnd) {
      const id = directory.getUint16(extra, true);
      const length = directory.getUint16(extra + 2, true);
      if (id === 1) {
        let field = extra + 4;
        if (entrySize === 0xffffffff) {
          entrySize = Number(directory.getBigUint64(field, true));
          field += 8;
        }
        if (compressedSize === 0xffffffff) {
          compressedSize = Number(directory.getBigUint64(field, true));
        }
      }
      extra += 4 + length;
    }

    entries.push({
      name,
      size: entrySize,
      compressedSize,
      method: METHODS[method] ?? `Method ${String(method)}`,
      modified: dosDate(
        directory.getUint16(at + 14, true),
        directory.getUint16(at + 12, true),
      ),
      directory: name.endsWith("/"),
      encrypted: (flags & 1) === 1,
    });
    at = extraEnd + entryCommentLength;
  }
  return { entries, total, comment };
}
