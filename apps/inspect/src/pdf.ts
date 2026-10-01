export const INFO_KEYS = [
  "Title",
  "Author",
  "Subject",
  "Keywords",
  "Creator",
  "Producer",
  "CreationDate",
  "ModDate",
] as const;

export type PdfInfoKey = (typeof INFO_KEYS)[number];

export interface PdfInfo {
  /** "1.7" */
  version: string;
  pages: number | null;
  encrypted: boolean;
  /** Linearized ("fast web view"). */
  linearized: boolean;
  /** Document info entries stored as plain strings: Title, Author, Producer… */
  info: Partial<Record<PdfInfoKey, string>>;
}

/** PDF dates: "D:20240131120000+01'00'" → "2024-01-31 12:00:00 +01:00". */
export function formatPdfDate(value: string): string {
  const match =
    /^D:(\d{4})(\d{2})?(\d{2})?(\d{2})?(\d{2})?(\d{2})?(Z|[+-]\d{2}'?\d{2}'?)?/.exec(
      value,
    );
  if (!match) return value;
  const [
    ,
    year = "",
    month = "01",
    day = "01",
    hour = "00",
    minute = "00",
    second = "00",
    zone,
  ] = match;
  let suffix = "";
  if (zone === "Z") suffix = " UTC";
  else if (zone) {
    const digits = zone.replaceAll("'", "");
    suffix = ` ${digits.slice(0, 3)}:${digits.slice(3)}`;
  }
  return `${year}-${month}-${day} ${hour}:${minute}:${second}${suffix}`;
}

const ESCAPES: Readonly<Record<string, string>> = {
  n: "\n",
  r: "\r",
  t: "\t",
  b: "\b",
  f: "\f",
};

/** A string's raw characters as text: UTF-16 when it starts with a BOM, else as is. */
function decodeRaw(raw: string): string {
  if (!raw.startsWith("þÿ")) return raw;
  let decoded = "";
  for (let i = 2; i + 1 < raw.length; i += 2) {
    decoded += String.fromCharCode(
      (raw.charCodeAt(i) << 8) | raw.charCodeAt(i + 1),
    );
  }
  return decoded;
}

/** A literal string's contents, with PDF escapes undone. */
function decodeLiteral(body: string): string {
  return decodeRaw(
    body.replace(/\\([nrtbf()\\]|[0-7]{1,3})/g, (_, escape: string) => {
      if (/^[0-7]+$/.test(escape))
        return String.fromCharCode(parseInt(escape, 8));
      return ESCAPES[escape] ?? escape;
    }),
  );
}

function decodeHexString(hex: string): string {
  const clean = hex.replace(/\s/g, "");
  let raw = "";
  for (let i = 0; i < clean.length; i += 2) {
    raw += String.fromCharCode(
      parseInt(clean.slice(i, i + 2).padEnd(2, "0"), 16),
    );
  }
  return decodeRaw(raw);
}

/**
 * What a PDF's own structure says about it. Reads the raw text (latin1), so it only
 * sees what isn't compressed; the page count comes from the page tree's /Count.
 * Returns null if it doesn't start like a PDF.
 */
export function readPdf(text: string): PdfInfo | null {
  const version = /^%PDF-(\d\.\d)/.exec(text)?.[1];
  if (!version) return null;

  // The root of the page tree has the largest /Count.
  let pages: number | null = null;
  for (const match of text.matchAll(/<<((?:(?!<<|>>)[\s\S])*)>>/g)) {
    const dict = match[1] ?? "";
    if (!/\/Type\s*\/Pages\b/.test(dict)) continue;
    const count = /\/Count\s+(\d+)/.exec(dict)?.[1];
    if (count) pages = Math.max(pages ?? 0, Number(count));
  }
  if (pages === null) {
    const leaves = text.match(/\/Type\s*\/Page(?![s\w])/g)?.length ?? 0;
    pages = leaves > 0 ? leaves : null;
  }

  const info: PdfInfo["info"] = {};
  for (const key of INFO_KEYS) {
    const literal = new RegExp(
      `/${key}\\s*\\(((?:\\\\[\\s\\S]|[^\\\\)])*)\\)`,
    ).exec(text);
    const hex = new RegExp(`/${key}\\s*<([0-9A-Fa-f\\s]+)>`).exec(text);
    const value = literal
      ? decodeLiteral(literal[1] ?? "")
      : hex
        ? decodeHexString(hex[1] ?? "")
        : "";
    if (value.trim()) {
      info[key] = key.endsWith("Date") ? formatPdfDate(value) : value.trim();
    }
  }

  return {
    version,
    pages,
    encrypted: /\/Encrypt[\s<]/.test(text),
    linearized: /\/Linearized\b/.test(text.slice(0, 2048)),
    info,
  };
}
