import { describe, expect, it } from "vitest";
import { makeZip } from "./testing";
import { listZip, readZipEntry, type ReadRange } from "./zip";

const encoder = new TextEncoder();

function reader(bytes: Uint8Array) {
  const reads: [number, number][] = [];
  const read: ReadRange = (start, end) => {
    reads.push([start, end]);
    return Promise.resolve(bytes.slice(start, end));
  };
  return { read, reads };
}

describe("readZipEntry", () => {
  it("reads stored and deflated entries", async () => {
    const text = "fabric ".repeat(50);
    const zip = makeZip([
      { name: "plain.txt", data: "hello" },
      { name: "fabric.mod.json", data: text, deflate: true },
    ]);
    const { read } = reader(zip);
    const listing = await listZip(zip.length, read);
    const [plain, packed] = listing?.entries ?? [];
    if (!plain || !packed) throw new Error("no entries");
    expect(packed.compressedSize).toBeLessThan(packed.size);
    const decode = (bytes: Uint8Array | null) =>
      bytes ? new TextDecoder().decode(bytes) : null;
    expect(decode(await readZipEntry(plain, read))).toBe("hello");
    expect(decode(await readZipEntry(packed, read))).toBe(text);
    expect(await readZipEntry(packed, read, 10)).toBeNull();
  });
});

describe("listZip", () => {
  it("lists entries from the central directory", async () => {
    const zip = makeZip(
      [
        { name: "META-INF/" },
        { name: "META-INF/MANIFEST.MF", data: "Manifest-Version: 1.0\n" },
        { name: "assets/Mój świat.txt", data: "hi" },
      ],
      "a comment",
    );
    const { read, reads } = reader(zip);
    expect(await listZip(zip.length, read)).toEqual({
      entries: [
        {
          name: "META-INF/",
          size: 0,
          compressedSize: 0,
          directory: true,
          offset: 0,
          method: 0,
        },
        {
          name: "META-INF/MANIFEST.MF",
          size: 22,
          compressedSize: 22,
          directory: false,
          offset: 39,
          method: 0,
        },
        {
          name: "assets/Mój świat.txt",
          size: 2,
          compressedSize: 2,
          directory: false,
          offset: 111,
          method: 0,
        },
      ],
      total: 3,
      uncompressed: 24,
      truncated: false,
    });
    // The end, then the directory: two reads, whatever the archive's size.
    expect(reads).toHaveLength(2);
  });

  it("stops at the limit and says so", async () => {
    const zip = makeZip(
      Array.from({ length: 5 }, (_, i) => ({ name: `f${String(i)}` })),
    );
    const listing = await listZip(zip.length, reader(zip).read, 2);
    expect(listing?.entries.map((entry) => entry.name)).toEqual(["f0", "f1"]);
    expect(listing).toMatchObject({ total: 5, truncated: true });
  });

  it("answers null for anything that isn't a ZIP", async () => {
    const text = encoder.encode("not a zip at all, just some words");
    expect(await listZip(text.length, reader(text).read)).toBeNull();
    expect(await listZip(4, reader(new Uint8Array(4)).read)).toBeNull();
  });
});
