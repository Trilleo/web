/**
 * Helpers for tools that work on files people drop in: what a file really is (from
 * its first bytes, not its name), sizes for people, and saving results.
 */

export type FileKind =
  | "image"
  | "audio"
  | "video"
  | "archive"
  | "document"
  | "font"
  | "executable"
  | "text"
  | "data";

export interface FileType {
  /** Short name, e.g. "PNG image". */
  label: string;
  mime: string;
  /** Usual extension, without the dot. */
  ext: string;
  kind: FileKind;
}

/** How many leading bytes `detectFileType` looks at. */
export const SNIFF_BYTES = 4096;

function ascii(bytes: Uint8Array, start: number, length: number): string {
  let text = "";
  for (let i = start; i < Math.min(bytes.length, start + length); i++) {
    text += String.fromCharCode(bytes[i] ?? 0);
  }
  return text;
}

function startsWith(
  bytes: Uint8Array,
  signature: readonly number[],
  offset = 0,
): boolean {
  return signature.every((byte, i) => bytes[offset + i] === byte);
}

const type = (
  label: string,
  mime: string,
  ext: string,
  kind: FileKind,
): FileType => ({ label, mime, ext, kind });

/** ISO base media files (MP4, MOV, HEIC, AVIF…) say what they are in their `ftyp` brands. */
function isoType(bytes: Uint8Array): FileType | null {
  if (ascii(bytes, 4, 4) !== "ftyp") return null;
  const size = Math.min(
    ((bytes[0] ?? 0) << 24) |
      ((bytes[1] ?? 0) << 16) |
      ((bytes[2] ?? 0) << 8) |
      (bytes[3] ?? 0),
    bytes.length,
  );
  const brands = [ascii(bytes, 8, 4)];
  for (let i = 16; i + 4 <= size; i += 4) brands.push(ascii(bytes, i, 4));
  const has = (...names: string[]) =>
    names.some((name) => brands.includes(name));
  const major = brands[0] ?? "";
  if (major === "avif" || major === "avis")
    return type("AVIF image", "image/avif", "avif", "image");
  if (["heic", "heix", "heim", "heis", "hevc", "hevx"].includes(major))
    return type("HEIC image", "image/heic", "heic", "image");
  if (major === "M4A " || major === "M4B " || major === "M4P ")
    return type("MPEG-4 audio", "audio/mp4", "m4a", "audio");
  if (major === "qt  ")
    return type("QuickTime movie", "video/quicktime", "mov", "video");
  if (major === "crx ")
    return type("Canon raw image", "image/x-canon-cr3", "cr3", "image");
  if (major === "3gp4" || major === "3gp5" || major === "3g2a")
    return type("3GPP video", "video/3gpp", "3gp", "video");
  if (has("avif", "avis"))
    return type("AVIF image", "image/avif", "avif", "image");
  if (has("heic", "heix", "mif1", "msf1"))
    return type("HEIC image", "image/heic", "heic", "image");
  if (has("M4A ")) return type("MPEG-4 audio", "audio/mp4", "m4a", "audio");
  return type("MPEG-4 video", "video/mp4", "mp4", "video");
}

function riffType(bytes: Uint8Array): FileType | null {
  if (ascii(bytes, 0, 4) !== "RIFF") return null;
  switch (ascii(bytes, 8, 4)) {
    case "WEBP":
      return type("WebP image", "image/webp", "webp", "image");
    case "WAVE":
      return type("WAV audio", "audio/wav", "wav", "audio");
    case "AVI ":
      return type("AVI video", "video/x-msvideo", "avi", "video");
    default:
      return type("RIFF data", "application/octet-stream", "riff", "data");
  }
}

function zipType(bytes: Uint8Array): FileType {
  // The first entry's name often tells the format (it's at offset 30 of the first
  // local header). EPUB requires `mimetype` first; Office files usually lead with
  // [Content_Types].xml.
  const nameLength = (bytes[26] ?? 0) | ((bytes[27] ?? 0) << 8);
  const name = ascii(bytes, 30, Math.min(nameLength, 64));
  if (name === "mimetype") {
    const rest = ascii(bytes, 30 + nameLength, 80);
    if (rest.startsWith("application/epub+zip"))
      return type("EPUB book", "application/epub+zip", "epub", "document");
    if (rest.startsWith("application/vnd.oasis.opendocument.text"))
      return type(
        "OpenDocument text",
        "application/vnd.oasis.opendocument.text",
        "odt",
        "document",
      );
    if (rest.startsWith("application/vnd.oasis.opendocument.spreadsheet"))
      return type(
        "OpenDocument spreadsheet",
        "application/vnd.oasis.opendocument.spreadsheet",
        "ods",
        "document",
      );
  }
  const head = ascii(bytes, 0, bytes.length);
  if (head.includes("word/"))
    return type(
      "Word document",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "docx",
      "document",
    );
  if (head.includes("xl/"))
    return type(
      "Excel workbook",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "xlsx",
      "document",
    );
  if (head.includes("ppt/"))
    return type(
      "PowerPoint presentation",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "pptx",
      "document",
    );
  if (name === "AndroidManifest.xml" || head.includes("classes.dex"))
    return type(
      "Android package",
      "application/vnd.android.package-archive",
      "apk",
      "archive",
    );
  if (name.startsWith("META-INF/"))
    return type("Java archive", "application/java-archive", "jar", "archive");
  return type("ZIP archive", "application/zip", "zip", "archive");
}

/** True when the bytes read as text: no NUL bytes, and valid UTF-8 (or a UTF-16 BOM). */
export function looksLikeText(bytes: Uint8Array): boolean {
  if (startsWith(bytes, [0xff, 0xfe]) || startsWith(bytes, [0xfe, 0xff]))
    return true;
  if (bytes.includes(0)) return false;
  try {
    // A multi-byte character cut off at the end of the sample isn't an error.
    new TextDecoder("utf-8", { fatal: true }).decode(
      bytes.subarray(0, trimPartialUtf8(bytes)),
    );
    return true;
  } catch {
    return false;
  }
}

/** Length of `bytes` without a UTF-8 sequence cut off at the end. */
function trimPartialUtf8(bytes: Uint8Array): number {
  let end = bytes.length;
  for (let back = 1; back <= 3 && end - back >= 0; back++) {
    const byte = bytes[end - back] ?? 0;
    if ((byte & 0xc0) === 0x80) continue; // continuation byte
    if ((byte & 0xc0) === 0xc0) {
      const needed = byte >= 0xf0 ? 4 : byte >= 0xe0 ? 3 : 2;
      if (back < needed) end -= back;
    }
    break;
  }
  return end;
}

function textType(bytes: Uint8Array): FileType {
  // TextDecoder drops a leading byte order mark itself.
  const head = new TextDecoder().decode(bytes.subarray(0, 1024)).trimStart();
  const lower = head.toLowerCase();
  if (
    lower.startsWith("<svg") ||
    (lower.startsWith("<?xml") && lower.includes("<svg"))
  )
    return type("SVG image", "image/svg+xml", "svg", "image");
  if (lower.startsWith("<!doctype html") || lower.startsWith("<html"))
    return type("HTML document", "text/html", "html", "text");
  if (lower.startsWith("<?xml"))
    return type("XML document", "application/xml", "xml", "text");
  if (head.startsWith("{\\rtf"))
    return type("Rich Text document", "application/rtf", "rtf", "document");
  if (head.startsWith("#!"))
    return type("Script", "text/x-script", "sh", "text");
  if (/^[[{]/.test(head)) {
    try {
      JSON.parse(new TextDecoder().decode(bytes));
      return type("JSON data", "application/json", "json", "text");
    } catch {
      // Not (complete) JSON: plain text.
    }
  }
  return type("Plain text", "text/plain", "txt", "text");
}

/**
 * What a file is, from its first bytes (pass at least the first SNIFF_BYTES).
 * Returns null for binary data it doesn't recognise.
 */
export function detectFileType(bytes: Uint8Array): FileType | null {
  const sig = (signature: readonly number[], offset = 0) =>
    startsWith(bytes, signature, offset);
  const text4 = ascii(bytes, 0, 4);

  // Images
  if (sig([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
    return type("PNG image", "image/png", "png", "image");
  if (sig([0xff, 0xd8, 0xff]))
    return type("JPEG image", "image/jpeg", "jpg", "image");
  if (text4 === "GIF8") return type("GIF image", "image/gif", "gif", "image");
  if (
    sig([0x42, 0x4d]) &&
    bytes.length >= 26 &&
    (bytes[14] ?? 0) >= 12 &&
    (bytes[15] ?? 1) === 0
  )
    return type("BMP image", "image/bmp", "bmp", "image");
  if (sig([0, 0, 1, 0]) && (bytes[4] ?? 0) > 0)
    return type("Windows icon", "image/x-icon", "ico", "image");
  if (sig([0, 0, 2, 0]) && (bytes[4] ?? 0) > 0)
    return type("Windows cursor", "image/x-icon", "cur", "image");
  if (sig([0x49, 0x49, 0x2a, 0x00]) || sig([0x4d, 0x4d, 0x00, 0x2a]))
    return type("TIFF image", "image/tiff", "tiff", "image");
  if (sig([0xff, 0x0a]) || sig([0, 0, 0, 0x0c, 0x4a, 0x58, 0x4c, 0x20]))
    return type("JPEG XL image", "image/jxl", "jxl", "image");
  if (text4 === "8BPS")
    return type(
      "Photoshop document",
      "image/vnd.adobe.photoshop",
      "psd",
      "image",
    );
  const riff = riffType(bytes);
  if (riff) return riff;
  const iso = isoType(bytes);
  if (iso) return iso;

  // Audio
  if (text4 === "fLaC")
    return type("FLAC audio", "audio/flac", "flac", "audio");
  if (text4 === "OggS") {
    const page = ascii(bytes, 0, 128);
    if (page.includes("OpusHead"))
      return type("Opus audio", "audio/ogg", "opus", "audio");
    if (page.includes("theora"))
      return type("Ogg video", "video/ogg", "ogv", "video");
    return type("Ogg audio", "audio/ogg", "ogg", "audio");
  }
  if (ascii(bytes, 0, 3) === "ID3")
    return type("MP3 audio", "audio/mpeg", "mp3", "audio");
  if (text4 === "FORM" && ["AIFF", "AIFC"].includes(ascii(bytes, 8, 4)))
    return type("AIFF audio", "audio/aiff", "aiff", "audio");
  if (text4 === "MThd") return type("MIDI file", "audio/midi", "mid", "audio");
  if (ascii(bytes, 0, 5) === "#!AMR")
    return type("AMR audio", "audio/amr", "amr", "audio");
  if (sig([0x30, 0x26, 0xb2, 0x75, 0x8e, 0x66, 0xcf, 0x11]))
    return type("Windows Media file", "video/x-ms-asf", "wma", "audio");
  // Bare MPEG frames: 11 sync bits. Layer bits 00 mean ADTS (AAC), the rest MP3.
  if ((bytes[0] ?? 0) === 0xff && ((bytes[1] ?? 0) & 0xe0) === 0xe0) {
    return ((bytes[1] ?? 0) & 0x06) === 0
      ? type("AAC audio", "audio/aac", "aac", "audio")
      : type("MP3 audio", "audio/mpeg", "mp3", "audio");
  }

  // Video
  if (sig([0x1a, 0x45, 0xdf, 0xa3])) {
    return ascii(bytes, 0, 64).includes("webm")
      ? type("WebM video", "video/webm", "webm", "video")
      : type("Matroska video", "video/x-matroska", "mkv", "video");
  }
  if (ascii(bytes, 0, 3) === "FLV")
    return type("Flash video", "video/x-flv", "flv", "video");

  // Archives and documents
  if (sig([0x50, 0x4b, 0x03, 0x04]) || sig([0x50, 0x4b, 0x05, 0x06]))
    return zipType(bytes);
  if (ascii(bytes, 0, 5) === "%PDF-")
    return type("PDF document", "application/pdf", "pdf", "document");
  if (sig([0x1f, 0x8b]))
    return type("Gzip archive", "application/gzip", "gz", "archive");
  if (sig([0x37, 0x7a, 0xbc, 0xaf, 0x27, 0x1c]))
    return type(
      "7-Zip archive",
      "application/x-7z-compressed",
      "7z",
      "archive",
    );
  if (ascii(bytes, 0, 6) === "Rar!\x1a\x07")
    return type("RAR archive", "application/vnd.rar", "rar", "archive");
  if (sig([0xfd, 0x37, 0x7a, 0x58, 0x5a, 0x00]))
    return type("XZ archive", "application/x-xz", "xz", "archive");
  if (ascii(bytes, 0, 3) === "BZh")
    return type("Bzip2 archive", "application/x-bzip2", "bz2", "archive");
  if (sig([0x28, 0xb5, 0x2f, 0xfd]))
    return type("Zstandard archive", "application/zstd", "zst", "archive");
  if (ascii(bytes, 257, 5) === "ustar")
    return type("Tar archive", "application/x-tar", "tar", "archive");
  if (sig([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]))
    return type(
      "Microsoft Office (legacy) file",
      "application/x-ole-storage",
      "doc",
      "document",
    );
  if (ascii(bytes, 0, 16) === "SQLite format 3\0")
    return type("SQLite database", "application/vnd.sqlite3", "sqlite", "data");

  // Fonts
  if (text4 === "wOFF") return type("WOFF font", "font/woff", "woff", "font");
  if (text4 === "wOF2")
    return type("WOFF2 font", "font/woff2", "woff2", "font");
  if (text4 === "OTTO") return type("OpenType font", "font/otf", "otf", "font");
  if (sig([0x00, 0x01, 0x00, 0x00, 0x00]))
    return type("TrueType font", "font/ttf", "ttf", "font");

  // Programs
  if (sig([0x7f, 0x45, 0x4c, 0x46]))
    return type("ELF executable", "application/x-elf", "elf", "executable");
  if (ascii(bytes, 0, 2) === "MZ")
    return type(
      "Windows executable",
      "application/vnd.microsoft.portable-executable",
      "exe",
      "executable",
    );
  if (
    sig([0xfe, 0xed, 0xfa, 0xce]) ||
    sig([0xfe, 0xed, 0xfa, 0xcf]) ||
    sig([0xce, 0xfa, 0xed, 0xfe]) ||
    sig([0xcf, 0xfa, 0xed, 0xfe])
  )
    return type(
      "Mach-O executable",
      "application/x-mach-binary",
      "macho",
      "executable",
    );
  if (sig([0xca, 0xfe, 0xba, 0xbe])) {
    // Shared by Java classes and universal Mach-O binaries: a fat binary's next
    // word is its (small) architecture count, a class file's is its version.
    const word = ((bytes[4] ?? 0) << 8) | (bytes[5] ?? 0);
    const next = ((bytes[6] ?? 0) << 8) | (bytes[7] ?? 0);
    return word === 0 && next < 30
      ? type(
          "Universal Mach-O executable",
          "application/x-mach-binary",
          "macho",
          "executable",
        )
      : type("Java class file", "application/java-vm", "class", "executable");
  }
  if (sig([0x00, 0x61, 0x73, 0x6d]))
    return type("WebAssembly module", "application/wasm", "wasm", "executable");

  if (bytes.length > 0 && looksLikeText(bytes)) return textType(bytes);
  return null;
}

/** "1.4 MB" (decimal units, like file managers on macOS and most of the web). */
export function formatBytes(bytes: number): string {
  if (bytes < 1000) return `${String(bytes)} B`;
  const units = ["kB", "MB", "GB", "TB"];
  let value = bytes;
  let unit = -1;
  while (value >= 1000 && unit < units.length - 1) {
    value /= 1000;
    unit++;
  }
  const digits = value < 10 ? 2 : value < 100 ? 1 : 0;
  return `${value.toFixed(digits)} ${units[unit] ?? ""}`;
}

/** The file name with a different extension: "photo.HEIC" → "photo.jpg". */
export function replaceExtension(name: string, ext: string): string {
  const dot = name.lastIndexOf(".");
  const base = dot > 0 ? name.slice(0, dot) : name;
  return `${base}.${ext}`;
}

/** Saves a blob through the browser's download prompt. */
export function downloadBlob(blob: Blob, name: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  document.body.append(link);
  link.click();
  link.remove();
  // Give the download a moment to start before the URL goes away.
  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 10_000);
}
