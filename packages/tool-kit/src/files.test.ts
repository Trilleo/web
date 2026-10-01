import { describe, expect, it } from "vitest";
import {
  detectFileType,
  formatBytes,
  looksLikeText,
  replaceExtension,
} from "./files";

const bytes = (...parts: (string | number[])[]) =>
  new Uint8Array(
    parts.flatMap((part) =>
      typeof part === "string"
        ? Array.from({ length: part.length }, (_, i) => part.charCodeAt(i))
        : part,
    ),
  );

/** An ISO media file's first box: size, "ftyp", major brand, version, compatible brands. */
const ftyp = (major: string, ...compatible: string[]) =>
  bytes(
    [0, 0, 0, 16 + compatible.length * 4],
    "ftyp",
    major,
    [0, 0, 0, 0],
    ...compatible,
  );

describe("detectFileType", () => {
  it.each([
    [bytes([0x89], "PNG", [0x0d, 0x0a, 0x1a, 0x0a]), "png", "image"],
    [bytes([0xff, 0xd8, 0xff, 0xe0]), "jpg", "image"],
    [bytes("GIF89a"), "gif", "image"],
    [bytes("RIFF", [0, 0, 0, 0], "WEBPVP8 "), "webp", "image"],
    [bytes("RIFF", [0, 0, 0, 0], "WAVEfmt "), "wav", "audio"],
    [bytes([0x49, 0x49, 0x2a, 0]), "tiff", "image"],
    [bytes([0, 0, 1, 0, 1, 0]), "ico", "image"],
    [ftyp("heic", "mif1", "heic"), "heic", "image"],
    [ftyp("mif1", "avif"), "avif", "image"],
    [ftyp("M4A ", "isom"), "m4a", "audio"],
    [ftyp("isom", "iso2", "avc1"), "mp4", "video"],
    [ftyp("qt  "), "mov", "video"],
    [bytes("fLaC"), "flac", "audio"],
    [bytes("OggS", [0, 2], "........OpusHead"), "opus", "audio"],
    [bytes("ID3", [4, 0]), "mp3", "audio"],
    [bytes([0xff, 0xfb, 0x90, 0x64]), "mp3", "audio"],
    [bytes([0xff, 0xf1, 0x50, 0x80]), "aac", "audio"],
    [bytes([0x1a, 0x45, 0xdf, 0xa3], "....webm"), "webm", "video"],
    [bytes("%PDF-1.7"), "pdf", "document"],
    [bytes([0x1f, 0x8b, 8]), "gz", "archive"],
    [bytes("wOF2"), "woff2", "font"],
    [bytes([0x7f], "ELF"), "elf", "executable"],
    [bytes("MZ", [0x90, 0]), "exe", "executable"],
    [bytes([0, 0x61, 0x73, 0x6d, 1, 0, 0, 0]), "wasm", "executable"],
    [bytes("<svg xmlns='http://www.w3.org/2000/svg'/>"), "svg", "image"],
    [bytes('{"a": [1, 2]}'), "json", "text"],
    [bytes("hello, world\n"), "txt", "text"],
  ])("recognises %#: %s", (input, ext, kind) => {
    expect(detectFileType(input)).toMatchObject({ ext, kind });
  });

  it("tells Office files and EPUBs from plain ZIPs by their first entry", () => {
    const zip = (name: string, rest = "") =>
      bytes(
        "PK",
        [3, 4],
        new Array<number>(22).fill(0),
        [name.length, 0, 0, 0],
        name,
        rest,
      );
    expect(detectFileType(zip("mimetype", "application/epub+zip"))?.ext).toBe(
      "epub",
    );
    expect(
      detectFileType(zip("[Content_Types].xml", "word/document.xml"))?.ext,
    ).toBe("docx");
    expect(detectFileType(zip("photos/a.jpg"))?.ext).toBe("zip");
  });

  it("tells Java classes from universal Mach-O binaries", () => {
    expect(
      detectFileType(bytes([0xca, 0xfe, 0xba, 0xbe, 0, 0, 0, 2]))?.ext,
    ).toBe("macho");
    expect(
      detectFileType(bytes([0xca, 0xfe, 0xba, 0xbe, 0, 0, 0, 61]))?.ext,
    ).toBe("class");
  });

  it("returns null for binary it doesn't know", () => {
    expect(detectFileType(bytes([1, 2, 3, 0, 250, 251]))).toBeNull();
    expect(detectFileType(new Uint8Array())).toBeNull();
  });
});

describe("looksLikeText", () => {
  it("accepts UTF-8, even with a character cut off at the end", () => {
    const text = new TextEncoder().encode("naïve café ☕");
    expect(looksLikeText(text)).toBe(true);
    expect(looksLikeText(text.subarray(0, text.length - 1))).toBe(true);
  });

  it("rejects NUL bytes and invalid UTF-8", () => {
    expect(looksLikeText(bytes("ab", [0], "cd"))).toBe(false);
    expect(looksLikeText(bytes([0xc3, 0x28, 0x41]))).toBe(false);
  });
});

describe("formatBytes", () => {
  it.each([
    [0, "0 B"],
    [999, "999 B"],
    [1000, "1.00 kB"],
    [1_536_000, "1.54 MB"],
    [42_000_000, "42.0 MB"],
    [3_200_000_000, "3.20 GB"],
  ])("%d → %s", (input, expected) => {
    expect(formatBytes(input)).toBe(expected);
  });
});

describe("replaceExtension", () => {
  it("swaps the extension, or adds one", () => {
    expect(replaceExtension("photo.HEIC", "jpg")).toBe("photo.jpg");
    expect(replaceExtension("archive.tar.gz", "zip")).toBe("archive.tar.zip");
    expect(replaceExtension("README", "txt")).toBe("README.txt");
    expect(replaceExtension(".env", "txt")).toBe(".env.txt");
  });
});
