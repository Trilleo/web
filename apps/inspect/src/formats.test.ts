import { detectFileType, type FileType } from "@trilleo/tool-kit";
import { zipSync } from "fflate";
import { describe, expect, it } from "vitest";
import { readExecutable } from "./executable";
import { formatDuration, formatNumber } from "./format";
import { hexRows } from "./hex";
import { extensionMismatch } from "./mismatch";
import { formatPdfDate, readPdf } from "./pdf";
import { describeLineEndings, encodingOf, textStats } from "./text";
import { listZip } from "./zip";

const encode = (text: string) => new TextEncoder().encode(text);

describe("hexRows", () => {
  it("lays bytes out 16 per row with offsets and ASCII", () => {
    const rows = hexRows(encode("Hello, hex dump!\n\0"), 0);
    expect(rows).toEqual([
      {
        offset: "00000000",
        hex: "48 65 6c 6c 6f 2c 20 68  65 78 20 64 75 6d 70 21",
        ascii: "Hello, hex dump!",
      },
      { offset: "00000010", hex: "0a 00", ascii: ".." },
    ]);
  });
});

describe("listZip", () => {
  it("lists entries from the central directory", async () => {
    const archive = zipSync(
      {
        "readme.txt": [encode("hello ".repeat(100)), { level: 9 }],
        "images/": [new Uint8Array(), { level: 0 }],
        "images/dot.bin": [new Uint8Array([1, 2, 3]), { level: 0 }],
      },
      { mtime: new Date(2024, 4, 6, 7, 8, 10) },
    );
    const listing = await listZip(new Blob([archive]));
    expect(listing?.total).toBe(3);
    expect(
      listing?.entries.map((entry) => [
        entry.name,
        entry.size,
        entry.method,
        entry.directory,
      ]),
    ).toEqual([
      ["readme.txt", 600, "Deflate", false],
      ["images/", 0, "Stored", true],
      ["images/dot.bin", 3, "Stored", false],
    ]);
    expect(listing?.entries[0]?.compressedSize).toBeLessThan(600);
    expect(listing?.entries[0]?.modified).toEqual(
      new Date(2024, 4, 6, 7, 8, 10),
    );
  });

  it("returns null for something that isn't a ZIP", async () => {
    expect(await listZip(new Blob(["not a zip at all"]))).toBeNull();
  });
});

describe("readPdf", () => {
  const pdf = [
    "%PDF-1.7",
    "%âãÏÓ",
    "1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj",
    "2 0 obj << /Type /Pages /Kids [3 0 R 4 0 R] /Count 2 >> endobj",
    "3 0 obj << /Type /Page /Parent 2 0 R >> endobj",
    "4 0 obj << /Type /Page /Parent 2 0 R >> endobj",
    "5 0 obj << /Title (A \\(small\\) test) /Author <FEFF00C9006D0069006C0065> /CreationDate (D:20240131120000+01'00') >> endobj",
    "trailer << /Root 1 0 R /Info 5 0 R >>",
    "%%EOF",
  ].join("\n");

  it("reads the version, page count and document info", () => {
    expect(readPdf(pdf)).toEqual({
      version: "1.7",
      pages: 2,
      encrypted: false,
      linearized: false,
      info: {
        Title: "A (small) test",
        Author: "Émile",
        CreationDate: "2024-01-31 12:00:00 +01:00",
      },
    });
  });

  it("counts page leaves when there's no readable page tree", () => {
    expect(
      readPdf(
        "%PDF-1.4\n<< /Type /Page >>\n<< /Type /Page >>\n<< /Type /Page >>",
      )?.pages,
    ).toBe(3);
  });

  it("returns null for other files", () => {
    expect(readPdf("hello")).toBeNull();
  });

  it("formats PDF dates", () => {
    expect(formatPdfDate("D:20240131")).toBe("2024-01-31 00:00:00");
    expect(formatPdfDate("D:20240131120000Z")).toBe("2024-01-31 12:00:00 UTC");
    expect(formatPdfDate("yesterday")).toBe("yesterday");
  });
});

describe("textStats", () => {
  it("counts lines, words, characters and line endings", () => {
    expect(textStats(encode("one two\r\nthree ☕\r\n"))).toEqual({
      encoding: "UTF-8",
      lines: 2,
      characters: 18,
      words: 4,
      lineEndings: { crlf: 2, lf: 0, cr: 0 },
      longestLine: 7,
    });
  });

  it("knows its encodings", () => {
    expect(encodingOf(encode("plain"))).toBe("ASCII");
    expect(encodingOf(new Uint8Array([0xef, 0xbb, 0xbf, 0x41]))).toBe(
      "UTF-8 with BOM",
    );
    expect(
      textStats(new Uint8Array([0xff, 0xfe, 0x41, 0, 0x0a, 0, 0x42, 0])),
    ).toMatchObject({
      encoding: "UTF-16 LE",
      lines: 2,
      characters: 3,
    });
    expect(textStats(new Uint8Array())).toMatchObject({
      lines: 0,
      characters: 0,
    });
  });

  it("describes line endings", () => {
    expect(describeLineEndings({ crlf: 0, lf: 3, cr: 0 })).toBe("LF");
    expect(describeLineEndings({ crlf: 1, lf: 3, cr: 0 })).toBe(
      "Mixed (CRLF, LF)",
    );
    expect(describeLineEndings({ crlf: 0, lf: 0, cr: 0 })).toBe("None");
  });
});

describe("readExecutable", () => {
  it("reads an ELF header", () => {
    const bytes = new Uint8Array(64);
    bytes.set([0x7f, 0x45, 0x4c, 0x46, 2, 1]);
    bytes[16] = 3; // shared object
    bytes[18] = 62; // x86-64
    expect(readExecutable(bytes)).toMatchObject({
      format: "ELF",
      architecture: "x86-64",
      bits: 64,
      endian: "little",
      kind: "Shared object or PIE executable",
    });
  });

  it("reads a PE header", () => {
    const bytes = new Uint8Array(512);
    const view = new DataView(bytes.buffer);
    bytes.set([0x4d, 0x5a]);
    view.setUint32(0x3c, 0x80, true);
    view.setUint32(0x80, 0x4550, true);
    view.setUint16(0x84, 0xaa64, true); // ARM64
    view.setUint32(0x88, 1_700_000_000, true);
    view.setUint16(0x80 + 24, 0x20b, true); // PE32+
    view.setUint16(0x80 + 24 + 68, 3, true); // console
    expect(readExecutable(bytes)).toEqual({
      format: "PE",
      architecture: "ARM64",
      bits: 64,
      endian: "little",
      kind: "Windows console",
      built: new Date(1_700_000_000_000),
    });
  });

  it("returns null for other files and plain DOS programs", () => {
    expect(readExecutable(new Uint8Array(64))).toBeNull();
    const dos = new Uint8Array(128);
    dos.set([0x4d, 0x5a]);
    expect(readExecutable(dos)).toBeNull();
  });
});

describe("extensionMismatch", () => {
  const detect = (bytes: Uint8Array): FileType => {
    const type = detectFileType(bytes);
    if (!type) throw new Error("not detected");
    return type;
  };
  const jpeg = detect(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]));
  const text = detect(encode("hello"));
  const zip = {
    label: "ZIP archive",
    mime: "application/zip",
    ext: "zip",
    kind: "archive",
  } as const;

  it("flags names that disagree with the contents", () => {
    expect(extensionMismatch("photo.png", jpeg)).toBe(true);
  });

  it("accepts aliases, missing extensions, text and ZIP-based formats", () => {
    expect(extensionMismatch("photo.JPEG", jpeg)).toBe(false);
    expect(extensionMismatch("photo", jpeg)).toBe(false);
    expect(extensionMismatch("notes.md", text)).toBe(false);
    expect(extensionMismatch("book.cbz", zip)).toBe(false);
  });
});

describe("format", () => {
  it("formats durations", () => {
    expect(formatDuration(4.254)).toBe("0:04.25");
    expect(formatDuration(205.4)).toBe("3:25.40");
    expect(formatDuration(59.999)).toBe("1:00.00");
    expect(formatDuration(3723)).toBe("1:02:03");
    expect(formatDuration(Number.NaN)).toBe("—");
  });

  it("formats numbers", () => {
    expect(formatNumber(1234567)).toBe("1,234,567");
    expect(formatNumber(2.856)).toBe("2.86");
  });
});
