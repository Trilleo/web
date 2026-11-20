/**
 * Attribute texts as SkyShards' exporter writes them (its desc.json): runs of text in
 * a Minecraft colour, and ranges (the value at level 1 and at the top level). Read
 * with `parseSegments`, which keeps only what it understands; drawn as HTML on the
 * game's dark panel (`segmentsHtml`, the site's mc-* classes) or flattened for search
 * (`segmentsText`). Stat symbols (private-use characters) become SVG (glyphs.ts).
 */
import { GLYPHS } from "./glyphs";

export interface TextSegment {
  t: string;
  /** A Minecraft colour name ("gray", "dark_green"); absent: the text default. */
  c?: string;
  bold?: boolean;
  italic?: boolean;
  underlined?: boolean;
  strikethrough?: boolean;
  obfuscated?: boolean;
}

export interface RangeSegment {
  /**
   * The value at level 1 and at the top level (the first may be null where it can't
   * be worked out; stats that shrink with levels come high first).
   */
  range: [number | null, number];
  /** "", "%" or "s". */
  unit: string;
  c?: string;
}

export type Segment = TextSegment | RangeSegment;

export function isRangeSegment(segment: Segment): segment is RangeSegment {
  return "range" in segment;
}

/** Minecraft's colour names and their § codes (the mc-c-<code> classes). */
export const COLOUR_CODES: Readonly<Record<string, string>> = {
  black: "0",
  dark_blue: "1",
  dark_green: "2",
  dark_aqua: "3",
  dark_red: "4",
  dark_purple: "5",
  gold: "6",
  gray: "7",
  dark_gray: "8",
  blue: "9",
  green: "a",
  aqua: "b",
  red: "c",
  light_purple: "d",
  yellow: "e",
  white: "f",
};

/** Text without a colour is grey, as attribute lore is in the game. */
const DEFAULT_CODE = "7";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

/** One segment, or null when it isn't one (unknown shapes are dropped, not trusted). */
function parseSegment(value: unknown): Segment | null {
  if (!isRecord(value)) return null;
  const colour =
    typeof value.c === "string" && Object.hasOwn(COLOUR_CODES, value.c)
      ? { c: value.c }
      : {};
  if (Array.isArray(value.range)) {
    const [low, high] = value.range as unknown[];
    if (!isNumber(high) || !(low === null || isNumber(low))) return null;
    const unit = typeof value.unit === "string" ? value.unit.slice(0, 4) : "";
    return { range: [low, high], unit, ...colour };
  }
  if (typeof value.t !== "string") return null;
  const segment: TextSegment = { t: value.t, ...colour };
  for (const flag of [
    "bold",
    "italic",
    "underlined",
    "strikethrough",
    "obfuscated",
  ] as const)
    if (value[flag] === true) segment[flag] = true;
  return segment;
}

/** A line of segments; anything that isn't an array is an empty line. */
export function parseSegments(value: unknown): Segment[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    const segment = parseSegment(item);
    return segment ? [segment] : [];
  });
}

/** 0.25 → "0.25", 20 → "20", null → "?". */
export function formatValue(value: number | null): string {
  if (value === null) return "?";
  return String(Math.round(value * 1e6) / 1e6);
}

/** "2→20%": a range as the game's lore shows it. */
export function rangeText(segment: RangeSegment): string {
  const [low, high] = segment.range;
  return `${formatValue(low)}→${formatValue(high)}${segment.unit}`;
}

const GLYPH_CHARS = new RegExp(
  `([${Object.keys(GLYPHS)
    .map((char) => `\\u${char.charCodeAt(0).toString(16).padStart(4, "0")}`)
    .join("")}])`,
  "u",
);
const GLYPH_CHARS_ALL = new RegExp(GLYPH_CHARS.source, "gu");

/** The segments as plain text: stat symbols left out, ranges as "2→20%". */
export function segmentsText(segments: readonly Segment[]): string {
  return segments
    .map((segment) =>
      isRangeSegment(segment)
        ? rangeText(segment)
        : segment.t.replace(GLYPH_CHARS_ALL, ""),
    )
    .join("")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Some descriptions end with "Buffed by <attribute> attribute.": a tag the shard's
 * page says in its own words. Drops it with the blank runs before it.
 */
export function withoutBuffedBy(segments: readonly Segment[]): Segment[] {
  const at = segments.findIndex(
    (segment) =>
      !isRangeSegment(segment) &&
      segment.t.trimStart().toLowerCase().startsWith("buffed by"),
  );
  if (at === -1) return [...segments];
  let end = at;
  while (end > 0) {
    const before = segments[end - 1];
    if (before && !isRangeSegment(before) && before.t.trim() === "") end--;
    else break;
  }
  return segments.slice(0, end);
}

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** A stat symbol as inline SVG, one em high, in the text's colour. */
export function glyphSvg(char: string): string {
  const glyph = GLYPHS[char];
  if (!glyph) return escapeHtml(char);
  return `<svg class="sb-glyph" aria-hidden="true" viewBox="0 0 ${String(glyph.w)} ${String(glyph.h)}" style="width:${String(Math.round((glyph.w / glyph.h) * 1000) / 1000)}em" fill="currentColor" shape-rendering="crispEdges"><path d="${glyph.path}"/></svg>`;
}

function textHtml(text: string): string {
  return text
    .split(GLYPH_CHARS)
    .map((part) =>
      Object.hasOwn(GLYPHS, part) ? glyphSvg(part) : escapeHtml(part),
    )
    .join("");
}

/**
 * A line of segments as HTML spans with the mc-c-* colour classes. Everything typed is
 * escaped; only our own markup (spans, glyph SVGs) is written. Put it inside an
 * `mc-tooltip` (or `mc-text`) panel so the game's colours read in both themes.
 */
export function segmentsHtml(segments: readonly Segment[]): string {
  return segments
    .map((segment) => {
      const code =
        (segment.c !== undefined ? COLOUR_CODES[segment.c] : undefined) ??
        DEFAULT_CODE;
      if (isRangeSegment(segment))
        return `<span class="mc-c-${code}">${escapeHtml(rangeText(segment))}</span>`;
      const classes = [`mc-c-${code}`];
      if (segment.bold) classes.push("mc-bold");
      if (segment.italic) classes.push("mc-italic");
      if (segment.underlined) classes.push("mc-underline");
      if (segment.strikethrough) classes.push("mc-strike");
      // Obfuscated text flickers in the game; here it's just hidden from view.
      if (segment.obfuscated) classes.push("sb-obfuscated");
      return `<span class="${classes.join(" ")}">${textHtml(segment.t)}</span>`;
    })
    .join("");
}
