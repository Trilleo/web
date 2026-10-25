/**
 * Writes a ZIP archive whose entries are stored, not compressed (chart tiles are
 * WebP already), for the admin's bundling script. Entries go out as they're added,
 * through `write`, so a 200 MB bundle never sits in memory. No ZIP64: a bundle stays
 * far below 4 GB and 65 535 entries (BUNDLE_LIMITS). @trilleo/storage's `listZip`
 * and `readZipEntry` read what it writes.
 */
import { crc32 } from "node:zlib";

const LOCAL = 0x04034b50;
const CENTRAL = 0x02014b50;
const EOCD = 0x06054b50;
/** General purpose flag 11: names are UTF-8. */
const UTF8 = 1 << 11;
const MAX_ENTRIES = 0xffff;
const MAX_OFFSET = 0xffffffff;

interface Written {
  name: Uint8Array;
  crc: number;
  size: number;
  offset: number;
}

export class ZipWriter {
  private readonly entries: Written[] = [];
  private written = 0;
  private finished = false;

  constructor(private readonly write: (chunk: Uint8Array) => void) {}

  /** Bytes written so far (the archive's size once finished). */
  get size(): number {
    return this.written;
  }

  get count(): number {
    return this.entries.length;
  }

  add(name: string, bytes: Uint8Array): void {
    if (this.finished) throw new Error("The archive is finished.");
    if (this.entries.length >= MAX_ENTRIES)
      throw new Error("Too many entries for one archive.");
    const encoded = new TextEncoder().encode(name);
    const entry: Written = {
      name: encoded,
      crc: crc32(bytes) >>> 0,
      size: bytes.byteLength,
      offset: this.written,
    };
    if (entry.offset + 30 + encoded.length + bytes.byteLength > MAX_OFFSET)
      throw new Error("The archive is too big.");
    const header = new DataView(new ArrayBuffer(30));
    header.setUint32(0, LOCAL, true);
    header.setUint16(4, 20, true);
    header.setUint16(6, UTF8, true);
    header.setUint16(8, 0, true);
    header.setUint32(14, entry.crc, true);
    header.setUint32(18, entry.size, true);
    header.setUint32(22, entry.size, true);
    header.setUint16(26, encoded.length, true);
    this.out(new Uint8Array(header.buffer));
    this.out(encoded);
    this.out(bytes);
    this.entries.push(entry);
  }

  /** Writes the central directory; nothing can be added after. */
  finish(): void {
    if (this.finished) return;
    this.finished = true;
    const start = this.written;
    for (const entry of this.entries) {
      const header = new DataView(new ArrayBuffer(46));
      header.setUint32(0, CENTRAL, true);
      header.setUint16(4, 20, true);
      header.setUint16(6, 20, true);
      header.setUint16(8, UTF8, true);
      header.setUint32(16, entry.crc, true);
      header.setUint32(20, entry.size, true);
      header.setUint32(24, entry.size, true);
      header.setUint16(28, entry.name.length, true);
      header.setUint32(42, entry.offset, true);
      this.out(new Uint8Array(header.buffer));
      this.out(entry.name);
    }
    const end = new DataView(new ArrayBuffer(22));
    end.setUint32(0, EOCD, true);
    end.setUint16(8, this.entries.length, true);
    end.setUint16(10, this.entries.length, true);
    end.setUint32(12, this.written - start, true);
    end.setUint32(16, start, true);
    this.out(new Uint8Array(end.buffer));
  }

  private out(chunk: Uint8Array): void {
    this.write(chunk);
    this.written += chunk.byteLength;
  }
}
