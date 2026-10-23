/**
 * Which viewer a file gets. The bytes decide: a name or a Content-Type is only a
 * hint, used where the bytes can't tell (CSV and Markdown are both plain text; a ZIP
 * could be a Word file or a book).
 */
import { SNIFF_BYTES, detectFileType, type FileType } from "@trilleo/tool-kit";
import { unzipSync } from "fflate";

export type ViewerKind =
  | "pdf"
  | "docx"
  | "sheet"
  | "pptx"
  | "odt"
  | "odp"
  | "epub"
  | "markdown"
  | "html"
  | "json"
  | "xml"
  | "code"
  | "rtf"
  | "image"
  | "audio"
  | "video"
  | "font"
  | "zip"
  | "gzip"
  | "legacy-office"
  | "binary";

export interface Detection {
  kind: ViewerKind;
  /** What it is, for people ("Word document"). */
  label: string;
  /** The usual extension, without the dot. */
  ext: string;
  /** For "code": Shiki's name for the language ("typescript"); "text" when plain. */
  language?: string;
  /** The byte sniffer's answer, when it had one. */
  type: FileType | null;
}

/** Extensions read as code, with Shiki's language name. */
export const CODE_LANGUAGES: Readonly<Record<string, string>> = {
  js: "javascript",
  mjs: "javascript",
  cjs: "javascript",
  jsx: "jsx",
  ts: "typescript",
  mts: "typescript",
  cts: "typescript",
  tsx: "tsx",
  py: "python",
  rb: "ruby",
  go: "go",
  rs: "rust",
  java: "java",
  kt: "kotlin",
  kts: "kotlin",
  scala: "scala",
  c: "c",
  h: "c",
  cc: "cpp",
  cpp: "cpp",
  cxx: "cpp",
  hpp: "cpp",
  cs: "csharp",
  fs: "fsharp",
  php: "php",
  swift: "swift",
  m: "objective-c",
  dart: "dart",
  lua: "lua",
  r: "r",
  jl: "julia",
  pl: "perl",
  hs: "haskell",
  ex: "elixir",
  exs: "elixir",
  erl: "erlang",
  clj: "clojure",
  elm: "elm",
  zig: "zig",
  nim: "nim",
  sh: "shellscript",
  bash: "shellscript",
  zsh: "shellscript",
  fish: "fish",
  ps1: "powershell",
  bat: "bat",
  cmd: "bat",
  sql: "sql",
  css: "css",
  scss: "scss",
  sass: "sass",
  less: "less",
  vue: "vue",
  svelte: "svelte",
  astro: "astro",
  graphql: "graphql",
  gql: "graphql",
  yaml: "yaml",
  yml: "yaml",
  toml: "toml",
  ini: "ini",
  cfg: "ini",
  conf: "ini",
  properties: "properties",
  env: "dotenv",
  dockerfile: "docker",
  makefile: "makefile",
  mk: "makefile",
  cmake: "cmake",
  gradle: "groovy",
  groovy: "groovy",
  tf: "terraform",
  proto: "proto",
  diff: "diff",
  patch: "diff",
  tex: "latex",
  bib: "bibtex",
  vim: "viml",
  nix: "nix",
  sol: "solidity",
  asm: "asm",
  s: "asm",
  wat: "wasm",
  txt: "text",
  log: "log",
  text: "text",
};

/** Names without an extension that are still code. */
const CODE_NAMES: Readonly<Record<string, string>> = {
  dockerfile: "docker",
  makefile: "makefile",
  gemfile: "ruby",
  rakefile: "ruby",
  jenkinsfile: "groovy",
  ".gitignore": "text",
  ".env": "dotenv",
};

const MARKDOWN_EXTS = new Set(["md", "markdown", "mdown", "mkd", "mdx"]);
const SHEET_TEXT_EXTS = new Set(["csv", "tsv", "tab"]);
const HTML_EXTS = new Set(["html", "htm", "xhtml"]);
const XML_EXTS = new Set(["xml", "xsl", "xslt", "rss", "atom", "plist", "kml"]);
const NATIVE_IMAGES = new Set([
  "png",
  "jpg",
  "gif",
  "webp",
  "avif",
  "bmp",
  "ico",
  "cur",
  "svg",
  "tiff",
  "heic",
  "jxl",
]);

/** "Report.Final.PDF" → "pdf"; "Dockerfile" → "". */
export function extensionOf(name: string): string {
  const base = name.split(/[\\/]/).pop() ?? "";
  const dot = base.lastIndexOf(".");
  return dot > 0 ? base.slice(dot + 1).toLowerCase() : "";
}

const detection = (
  kind: ViewerKind,
  label: string,
  ext: string,
  type: FileType | null,
  language?: string,
): Detection => ({
  kind,
  label,
  ext,
  type,
  ...(language ? { language } : {}),
});

/** The entry names in a ZIP, and the text of its `mimetype` entry (ODF, EPUB). */
export function zipNames(bytes: Uint8Array): {
  names: string[];
  mimetype: string | null;
} {
  const names: string[] = [];
  let found: Uint8Array | undefined;
  try {
    const files = unzipSync(bytes, {
      filter: (entry) => {
        names.push(entry.name);
        // Only the tiny `mimetype` entry is unpacked.
        return entry.name === "mimetype" && entry.originalSize < 200;
      },
    });
    found = files.mimetype;
  } catch {
    // A damaged archive: whatever names were read are still useful.
  }
  return {
    names,
    mimetype: found ? new TextDecoder().decode(found).trim() : null,
  };
}

function zipDetection(bytes: Uint8Array, type: FileType | null): Detection {
  const { names, mimetype } = zipNames(bytes);
  const has = (name: string) => names.includes(name);
  if (mimetype === "application/epub+zip")
    return detection("epub", "EPUB book", "epub", type);
  if (mimetype?.startsWith("application/vnd.oasis.opendocument.text"))
    return detection("odt", "OpenDocument text", "odt", type);
  if (mimetype?.startsWith("application/vnd.oasis.opendocument.spreadsheet"))
    return detection("sheet", "OpenDocument spreadsheet", "ods", type);
  if (mimetype?.startsWith("application/vnd.oasis.opendocument.presentation"))
    return detection("odp", "OpenDocument presentation", "odp", type);
  if (has("word/document.xml"))
    return detection("docx", "Word document", "docx", type);
  if (has("xl/workbook.xml") || has("xl/workbook.bin"))
    return detection("sheet", "Excel workbook", "xlsx", type);
  if (has("ppt/presentation.xml"))
    return detection("pptx", "PowerPoint presentation", "pptx", type);
  return detection(
    "zip",
    type?.kind === "archive" ? type.label : "ZIP archive",
    type?.ext ?? "zip",
    type,
  );
}

/** Whether UTF-16LE `text` appears anywhere in `bytes` (OLE stream names). */
function hasUtf16(bytes: Uint8Array, text: string): boolean {
  const pattern: number[] = [];
  for (const char of text) pattern.push(char.charCodeAt(0), 0);
  const first = pattern[0];
  outer: for (let i = bytes.indexOf(first ?? 0); i !== -1;) {
    for (let j = 1; j < pattern.length; j++) {
      if (bytes[i + j] !== pattern[j]) {
        i = bytes.indexOf(first ?? 0, i + 1);
        continue outer;
      }
    }
    return true;
  }
  return false;
}

/** Old binary Office files: which program's, from the streams inside. */
function oleDetection(
  bytes: Uint8Array,
  ext: string,
  type: FileType | null,
): Detection {
  if (hasUtf16(bytes, "Workbook") || hasUtf16(bytes, "Book") || ext === "xls")
    return detection("sheet", "Excel 97–2003 workbook", "xls", type);
  if (hasUtf16(bytes, "PowerPoint Document") || ext === "ppt")
    return detection(
      "legacy-office",
      "PowerPoint 97–2003 presentation",
      "ppt",
      type,
    );
  if (hasUtf16(bytes, "WordDocument") || ext === "doc")
    return detection("legacy-office", "Word 97–2003 document", "doc", type);
  return detection(
    "legacy-office",
    "Microsoft Office (legacy) file",
    ext || "doc",
    type,
  );
}

function textDetection(
  name: string,
  ext: string,
  hint: string,
  type: FileType | null,
): Detection {
  const base = (name.split(/[\\/]/).pop() ?? "").toLowerCase();
  if (MARKDOWN_EXTS.has(ext) || hint === "text/markdown")
    return detection("markdown", "Markdown document", "md", type);
  if (SHEET_TEXT_EXTS.has(ext) || hint === "text/csv")
    return detection(
      "sheet",
      ext === "tsv" || ext === "tab" ? "Tab-separated values" : "CSV table",
      ext || "csv",
      type,
    );
  if (HTML_EXTS.has(ext) || type?.ext === "html" || hint === "text/html")
    return detection("html", "HTML document", "html", type);
  if (ext === "json" || ext === "geojson" || type?.ext === "json")
    return detection("json", "JSON data", "json", type);
  if (ext === "svg" || type?.ext === "svg")
    return detection("image", "SVG image", "svg", type);
  if (XML_EXTS.has(ext) || type?.ext === "xml")
    return detection("xml", "XML document", ext || "xml", type);
  if (ext === "rtf" || type?.ext === "rtf")
    return detection("rtf", "Rich Text document", "rtf", type);
  const language = CODE_LANGUAGES[ext] ?? CODE_NAMES[base];
  if (language)
    return detection(
      "code",
      language === "text" ? "Plain text" : "Source code",
      ext || base,
      type,
      language,
    );
  if (type?.ext === "sh")
    return detection("code", "Script", "sh", type, "shellscript");
  return detection("code", "Plain text", ext || "txt", type, "text");
}

/**
 * Decides how to show a file. `bytes` is the whole file (ZIPs and old Office files
 * are told apart by what's inside); `hint` is a Content-Type, if a site sent one.
 */
export function detectViewer(
  bytes: Uint8Array,
  name: string,
  hint: string | null = null,
): Detection {
  const type = detectFileType(bytes.subarray(0, SNIFF_BYTES));
  const ext = extensionOf(name);
  const mime = (hint ?? "").split(";")[0]?.trim().toLowerCase() ?? "";

  if (!type) {
    if (bytes.length === 0)
      return detection("code", "Empty file", ext || "txt", null, "text");
    return detection("binary", "Unknown binary data", ext || "bin", null);
  }
  if (type.ext === "pdf") return detection("pdf", type.label, "pdf", type);
  if (type.kind === "archive" && type.mime === "application/zip")
    return zipDetection(bytes, type);
  if (["docx", "xlsx", "pptx", "epub", "odt", "ods"].includes(type.ext))
    return zipDetection(bytes, type);
  if (type.mime === "application/x-ole-storage")
    return oleDetection(bytes, ext, type);
  if (type.ext === "gz") return detection("gzip", type.label, "gz", type);
  if (type.kind === "image") {
    if (type.ext === "svg") return detection("image", type.label, "svg", type);
    return NATIVE_IMAGES.has(type.ext)
      ? detection("image", type.label, type.ext, type)
      : detection("binary", type.label, type.ext, type);
  }
  if (type.kind === "audio")
    return detection("audio", type.label, type.ext, type);
  if (type.kind === "video")
    return detection("video", type.label, type.ext, type);
  if (type.kind === "font")
    return detection("font", type.label, type.ext, type);
  if (type.kind === "text" || type.ext === "rtf")
    return textDetection(name, ext, mime, type);
  return detection(
    type.kind === "archive" && (type.ext === "jar" || type.ext === "apk")
      ? "zip"
      : "binary",
    type.label,
    type.ext,
    type,
  );
}
