import type { FileType } from "@trilleo/tool-kit";

/** Extensions that name the same format as a detected type's usual one. */
const ALIASES: Readonly<Record<string, readonly string[]>> = {
  jpg: ["jpg", "jpeg", "jpe", "jfif"],
  tiff: ["tif", "tiff", "dng", "nef", "arw", "cr2", "orf", "rw2"],
  heic: ["heic", "heif", "hif"],
  ico: ["ico"],
  mp4: ["mp4", "m4v", "m4a", "m4b", "m4p", "f4v", "mp4v", "3gp", "3g2"],
  m4a: ["m4a", "m4b", "m4p", "mp4", "aac"],
  mov: ["mov", "qt"],
  mkv: ["mkv", "mka", "mks", "mk3d"],
  webm: ["webm", "weba", "mkv"],
  ogg: ["ogg", "oga", "spx"],
  opus: ["opus", "ogg", "oga"],
  aiff: ["aif", "aiff", "aifc"],
  mid: ["mid", "midi", "kar"],
  wma: ["wma", "wmv", "asf"],
  gz: ["gz", "tgz", "gzip"],
  bz2: ["bz2", "tbz", "tbz2"],
  xz: ["xz", "txz"],
  zst: ["zst", "tzst"],
  doc: ["doc", "xls", "ppt", "msi", "msg", "pub", "vsd"],
  exe: ["exe", "dll", "sys", "scr", "ocx", "cpl", "efi", "mui", "com", "drv"],
  elf: ["so", "o", "ko", "elf", "bin", "out", "axf"],
  macho: ["dylib", "bundle", "o", "macho"],
  ttf: ["ttf", "ttc", "tte"],
  sqlite: ["sqlite", "sqlite3", "db", "db3"],
  svg: ["svg", "svgz"],
  html: ["html", "htm", "xhtml"],
  wav: ["wav", "wave"],
};

/**
 * True when a file's name says one thing and its bytes another, e.g. a "photo.png"
 * that's really a JPEG. Text-like detections, plain ZIPs (many formats are ZIPs
 * underneath) and names without an extension never count.
 */
export function extensionMismatch(name: string, detected: FileType): boolean {
  const dot = name.lastIndexOf(".");
  if (dot <= 0) return false;
  const ext = name.slice(dot + 1).toLowerCase();
  if (detected.kind === "text" || detected.ext === "zip") return false;
  const accepted = ALIASES[detected.ext] ?? [detected.ext];
  return !accepted.includes(ext);
}
