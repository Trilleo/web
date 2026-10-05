/**
 * What a stored file is and how it may be served: cleaned names, object keys, the
 * Content-Type and Content-Disposition it's served with, and the check that its
 * bytes match its name. Pure, so the browser and the server agree.
 */
import { detectFileType, type FileType } from "@trilleo/tool-kit/files";

/** A broad family, for icons, filters and the rules below. */
export type StoredKind =
  | "image"
  | "audio"
  | "video"
  | "archive"
  | "document"
  | "font"
  | "executable"
  | "text"
  | "data";

interface KnownType {
  mime: string;
  kind: StoredKind;
  label: string;
}

const known = (mime: string, kind: StoredKind, label: string): KnownType => ({
  mime,
  kind,
  label,
});

/**
 * Types by extension (lowercase, no dot). Anything missing is served as
 * application/octet-stream and labelled from its extension ("MCSTRUCTURE file").
 */
const EXTENSIONS: Readonly<Record<string, KnownType>> = {
  // Images
  png: known("image/png", "image", "PNG image"),
  jpg: known("image/jpeg", "image", "JPEG image"),
  jpeg: known("image/jpeg", "image", "JPEG image"),
  gif: known("image/gif", "image", "GIF image"),
  webp: known("image/webp", "image", "WebP image"),
  avif: known("image/avif", "image", "AVIF image"),
  bmp: known("image/bmp", "image", "BMP image"),
  ico: known("image/x-icon", "image", "Windows icon"),
  tif: known("image/tiff", "image", "TIFF image"),
  tiff: known("image/tiff", "image", "TIFF image"),
  heic: known("image/heic", "image", "HEIC image"),
  psd: known("image/vnd.adobe.photoshop", "image", "Photoshop document"),
  svg: known("image/svg+xml", "image", "SVG image"),
  // Audio
  mp3: known("audio/mpeg", "audio", "MP3 audio"),
  ogg: known("audio/ogg", "audio", "Ogg audio"),
  oga: known("audio/ogg", "audio", "Ogg audio"),
  opus: known("audio/ogg", "audio", "Opus audio"),
  wav: known("audio/wav", "audio", "WAV audio"),
  flac: known("audio/flac", "audio", "FLAC audio"),
  m4a: known("audio/mp4", "audio", "MPEG-4 audio"),
  aac: known("audio/aac", "audio", "AAC audio"),
  mid: known("audio/midi", "audio", "MIDI file"),
  midi: known("audio/midi", "audio", "MIDI file"),
  // Video
  mp4: known("video/mp4", "video", "MPEG-4 video"),
  m4v: known("video/mp4", "video", "MPEG-4 video"),
  webm: known("video/webm", "video", "WebM video"),
  mov: known("video/quicktime", "video", "QuickTime movie"),
  mkv: known("video/x-matroska", "video", "Matroska video"),
  avi: known("video/x-msvideo", "video", "AVI video"),
  // Documents
  pdf: known("application/pdf", "document", "PDF document"),
  epub: known("application/epub+zip", "document", "EPUB book"),
  docx: known(
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "document",
    "Word document",
  ),
  xlsx: known(
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "document",
    "Excel workbook",
  ),
  pptx: known(
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "document",
    "PowerPoint presentation",
  ),
  // Text
  txt: known("text/plain", "text", "Plain text"),
  md: known("text/markdown", "text", "Markdown"),
  csv: known("text/csv", "text", "CSV data"),
  json: known("application/json", "text", "JSON data"),
  html: known("text/html", "text", "HTML document"),
  htm: known("text/html", "text", "HTML document"),
  xml: known("application/xml", "text", "XML document"),
  js: known("text/javascript", "text", "JavaScript"),
  mcfunction: known("text/plain", "text", "Minecraft function"),
  // Archives (Minecraft's own formats are ZIPs underneath)
  zip: known("application/zip", "archive", "ZIP archive"),
  jar: known("application/java-archive", "archive", "Java archive"),
  mcpack: known("application/zip", "archive", "Minecraft pack"),
  mcaddon: known("application/zip", "archive", "Minecraft add-on"),
  mcworld: known("application/zip", "archive", "Minecraft world"),
  mctemplate: known("application/zip", "archive", "Minecraft world template"),
  mrpack: known("application/zip", "archive", "Modrinth modpack"),
  gz: known("application/gzip", "archive", "Gzip archive"),
  tgz: known("application/gzip", "archive", "Gzip archive"),
  tar: known("application/x-tar", "archive", "Tar archive"),
  "7z": known("application/x-7z-compressed", "archive", "7-Zip archive"),
  rar: known("application/vnd.rar", "archive", "RAR archive"),
  xz: known("application/x-xz", "archive", "XZ archive"),
  zst: known("application/zstd", "archive", "Zstandard archive"),
  // Minecraft data (gzipped NBT)
  nbt: known("application/octet-stream", "data", "NBT data"),
  schem: known("application/octet-stream", "data", "Schematic"),
  schematic: known("application/octet-stream", "data", "Schematic"),
  litematic: known("application/octet-stream", "data", "Litematica schematic"),
  mcstructure: known("application/octet-stream", "data", "Minecraft structure"),
  // Fonts
  woff: known("font/woff", "font", "WOFF font"),
  woff2: known("font/woff2", "font", "WOFF2 font"),
  ttf: known("font/ttf", "font", "TrueType font"),
  otf: known("font/otf", "font", "OpenType font"),
  // Programs
  exe: known(
    "application/vnd.microsoft.portable-executable",
    "executable",
    "Windows program",
  ),
  msi: known("application/x-msi", "executable", "Windows installer"),
  apk: known(
    "application/vnd.android.package-archive",
    "executable",
    "Android app",
  ),
  wasm: known("application/wasm", "executable", "WebAssembly module"),
};

/**
 * Types the files domain may show in the browser (Content-Disposition: inline). They
 * can't run scripts: raster images, audio, video and PDF. Everything else downloads.
 */
const INLINE_TYPES: ReadonlySet<string> = new Set([
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
  "image/avif",
  "image/bmp",
  "image/x-icon",
  "audio/mpeg",
  "audio/ogg",
  "audio/wav",
  "audio/flac",
  "audio/mp4",
  "audio/aac",
  "video/mp4",
  "video/webm",
  "application/pdf",
]);

/**
 * Types a browser would run as a page or script if it ever opened them. They are
 * stored as application/octet-stream (and always download), so a file on the files
 * domain can never act as a web page.
 */
const ACTIVE_TYPES: ReadonlySet<string> = new Set([
  "text/html",
  "image/svg+xml",
  "application/xhtml+xml",
  "application/xml",
  "text/xml",
  "text/javascript",
  "application/javascript",
]);

/** Programs other people's computers would run: only admins may upload them. */
const PROGRAM_EXTENSIONS: ReadonlySet<string> = new Set([
  "exe",
  "msi",
  "msix",
  "bat",
  "cmd",
  "com",
  "scr",
  "pif",
  "cpl",
  "ps1",
  "vbs",
  "vbe",
  "wsf",
  "hta",
  "lnk",
  "reg",
  "apk",
  "xapk",
  "dmg",
  "pkg",
  "app",
  "deb",
  "rpm",
  "appimage",
]);

/** Control characters (C0, DEL, C1) and bidirectional overrides. */
const CONTROL_CHARS = /[\p{Cc}\u202a-\u202e\u2066-\u2069]/gu;
/** Accents left over after NFKD ("ś" → "s" + U+0301). */
const COMBINING_MARKS = /[\u0300-\u036f]/g;

export const MAX_NAME_LENGTH = 200;

/** The extension, lowercase and without the dot ("" when there's none). */
export function extensionOf(name: string): string {
  const dot = name.lastIndexOf(".");
  return dot > 0 && dot < name.length - 1
    ? name.slice(dot + 1).toLowerCase()
    : "";
}

/**
 * A file name fit to show and to download as: no folders, control characters or
 * leading dots, at most MAX_NAME_LENGTH characters (keeping the extension).
 */
export function cleanName(raw: string): string {
  const base = raw.split(/[\\/]/).pop() ?? "";
  let name = base
    .normalize("NFC")
    .replace(CONTROL_CHARS, "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^\.+/, "");
  if (name.length > MAX_NAME_LENGTH) {
    const ext = extensionOf(name);
    const keep = ext && ext.length < 20 ? `.${ext}` : "";
    name = name.slice(0, MAX_NAME_LENGTH - keep.length).trimEnd() + keep;
  }
  return name || "file";
}

/**
 * The name as it appears in the file's URL: ASCII letters, digits, dots, dashes and
 * underscores only, so keys never need escaping anywhere. "Mój świat.mcworld" →
 * "Moj-swiat.mcworld".
 */
export function urlName(name: string): string {
  const slug = name
    .normalize("NFKD")
    .replace(COMBINING_MARKS, "")
    .replace(/[^A-Za-z0-9._-]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^[-.]+|[-.]+$/g, "")
    .slice(0, 100)
    .replace(/[-.]+$/, "");
  const ext = extensionOf(name).replace(/[^a-z0-9]/g, "");
  // Names in other scripts lose everything: keep at least the extension.
  if (!slug || slug === ext) return ext ? `file.${ext}` : "file";
  return slug;
}

/** A file's object key: `f/<id>/<url name>`. */
export function objectKey(id: string, name: string): string {
  return `f/${id}/${urlName(name)}`;
}

/** File ids: 12 lowercase letters and digits (about 62 bits). */
export const FILE_ID_PATTERN = /^[a-z0-9]{12}$/;

/** A new random file id. */
export function newFileId(): string {
  const alphabet = "abcdefghijklmnopqrstuvwxyz0123456789";
  const bytes = crypto.getRandomValues(new Uint8Array(12));
  // 256 isn't a multiple of 36, so a tiny bias remains; ids only need to be unguessable.
  return Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join("");
}

export interface FileDescription {
  /** The real type (for people and the database). */
  mime: string;
  kind: StoredKind;
  /** "PNG image", "Minecraft world", "LITEMATIC file". */
  label: string;
}

function isKnownName(name: string): boolean {
  return Object.hasOwn(EXTENSIONS, extensionOf(name));
}

/** What a file is, judging by its name alone. */
export function describeName(name: string): FileDescription {
  const ext = extensionOf(name);
  const type = isKnownName(name) ? EXTENSIONS[ext] : undefined;
  if (type) return { ...type };
  return {
    mime: "application/octet-stream",
    kind: "data",
    label: ext ? `${ext.toUpperCase()} file` : "File",
  };
}

/** The headers a stored object is served with (set when the upload starts). */
export interface ServeHeaders {
  contentType: string;
  contentDisposition: string;
  cacheControl: string;
}

/**
 * Objects never change (a new upload gets a new id), but they can be taken down, and
 * browsers would keep serving a year-cached copy from their cache. A day keeps
 * repeat views cheap and lets a takedown reach everyone within a day.
 */
export const PUBLIC_CACHE = "public, max-age=86400";

/** RFC 6266 Content-Disposition with an ASCII fallback and the UTF-8 name. */
export function contentDisposition(
  type: "inline" | "attachment",
  name: string,
): string {
  const ascii = urlName(name).replace(/"/g, "");
  const utf8 = encodeURIComponent(name).replace(
    /['()*]/g,
    (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`,
  );
  return `${type}; filename="${ascii}"; filename*=UTF-8''${utf8}`;
}

/** Whether the files domain shows this type in the browser instead of downloading it. */
export function isInlineType(mime: string): boolean {
  return INLINE_TYPES.has(mime);
}

/** How a file with this name is stored and served. */
export function serveHeaders(name: string): ServeHeaders {
  const { mime } = describeName(name);
  const inline = isInlineType(mime);
  return {
    contentType: ACTIVE_TYPES.has(mime) ? "application/octet-stream" : mime,
    contentDisposition: contentDisposition(
      inline ? "inline" : "attachment",
      name,
    ),
    cacheControl: PUBLIC_CACHE,
  };
}

/** Whether only admins may upload a file with this name (Windows/Android programs…). */
export function isProgramName(name: string): boolean {
  return PROGRAM_EXTENSIONS.has(extensionOf(name));
}

const NATIVE_PROGRAMS: ReadonlySet<string> = new Set([
  "application/vnd.microsoft.portable-executable",
  "application/x-elf",
  "application/x-mach-binary",
  "application/vnd.android.package-archive",
]);

export type ContentVerdict =
  | { ok: true; description: FileDescription; detected: FileType | null }
  | { ok: false; reason: "mismatch" | "program"; detected: FileType | null };

/**
 * Checks a finished upload's first bytes (at least SNIFF_BYTES) against its name.
 * A file served inline must really be that kind of file (a ".png" that's really
 * HTML is refused), and only admins may store native programs, whatever the name.
 * The label prefers what the bytes say.
 */
export function verifyContent(
  name: string,
  head: Uint8Array,
  { allowPrograms }: { allowPrograms: boolean },
): ContentVerdict {
  const byName = describeName(name);
  const detected = detectFileType(head);

  if (!allowPrograms) {
    if (isProgramName(name)) return { ok: false, reason: "program", detected };
    if (detected && NATIVE_PROGRAMS.has(detected.mime))
      return { ok: false, reason: "program", detected };
  }

  if (isInlineType(byName.mime)) {
    const matches =
      detected !== null &&
      (detected.mime === byName.mime ||
        // Same family is enough (.m4a holding an MP4 brand, .jpeg vs .jpg…).
        (detected.kind === byName.kind && byName.kind !== "document"));
    if (!matches) return { ok: false, reason: "mismatch", detected };
  }

  // An unknown extension borrows the kind and label the bytes show. The type it's
  // served as stays the name's (octet-stream there), which the checks above made safe.
  const description =
    isKnownName(name) || !detected
      ? byName
      : { ...byName, kind: detected.kind, label: detected.label };
  return { ok: true, description, detected };
}
