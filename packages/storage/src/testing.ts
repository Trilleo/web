/** Helpers for tests of code that uses storage (not for app code). */
import { deflateRawSync } from "node:zlib";

const encoder = new TextEncoder();

/** A ZIP built by hand: entries stored as they are, or deflated. */
export function makeZip(
  entries: { name: string; data?: string | Uint8Array; deflate?: boolean }[],
  comment = "",
): Uint8Array {
  const parts: Uint8Array[] = [];
  const central: Uint8Array[] = [];
  let offset = 0;
  for (const entry of entries) {
    const name = encoder.encode(entry.name);
    const raw =
      typeof entry.data === "string" || entry.data === undefined
        ? encoder.encode(entry.data ?? "")
        : entry.data;
    const data = entry.deflate ? new Uint8Array(deflateRawSync(raw)) : raw;
    const method = entry.deflate ? 8 : 0;
    const local = new DataView(new ArrayBuffer(30));
    local.setUint32(0, 0x04034b50, true);
    local.setUint16(8, method, true);
    local.setUint32(18, data.length, true);
    local.setUint32(22, raw.length, true);
    local.setUint16(26, name.length, true);
    parts.push(new Uint8Array(local.buffer), name, data);
    const head = new DataView(new ArrayBuffer(46));
    head.setUint32(0, 0x02014b50, true);
    head.setUint16(8, 0x0800, true);
    head.setUint16(10, method, true);
    head.setUint32(20, data.length, true);
    head.setUint32(24, raw.length, true);
    head.setUint16(28, name.length, true);
    head.setUint32(42, offset, true);
    central.push(new Uint8Array(head.buffer), name);
    offset += 30 + name.length + data.length;
  }
  const centralSize = central.reduce((sum, part) => sum + part.length, 0);
  const commentBytes = encoder.encode(comment);
  const end = new DataView(new ArrayBuffer(22));
  end.setUint32(0, 0x06054b50, true);
  end.setUint16(8, entries.length, true);
  end.setUint16(10, entries.length, true);
  end.setUint32(12, centralSize, true);
  end.setUint32(16, offset, true);
  end.setUint16(20, commentBytes.length, true);
  const all = [...parts, ...central, new Uint8Array(end.buffer), commentBytes];
  const out = new Uint8Array(all.reduce((sum, part) => sum + part.length, 0));
  let at = 0;
  for (const part of all) {
    out.set(part, at);
    at += part.length;
  }
  return out;
}
