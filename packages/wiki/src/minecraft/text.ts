/**
 * Minecraft's formatting codes: `§` then a colour (0–9, a–f) or a format (k
 * obfuscated, l bold, m strikethrough, n underline, o italic, r reset). A colour
 * code clears the formats before it, as in Java Edition. Only `§` counts: `&`
 * appears in ordinary text ("R&B"), so plugins' `&` codes are left as written.
 */
import { escapeHtml } from "../syntax";

export const MC_COLORS = {
  "0": "black",
  "1": "dark blue",
  "2": "dark green",
  "3": "dark aqua",
  "4": "dark red",
  "5": "dark purple",
  "6": "gold",
  "7": "gray",
  "8": "dark gray",
  "9": "blue",
  a: "green",
  b: "aqua",
  c: "red",
  d: "light purple",
  e: "yellow",
  f: "white",
} as const;
export type McColor = keyof typeof MC_COLORS;

const FORMATS = {
  k: "obfuscated",
  l: "bold",
  m: "strike",
  n: "underline",
  o: "italic",
} as const;
type McFormat = keyof typeof FORMATS;

interface Style {
  color: McColor | null;
  formats: Set<McFormat>;
}

function isColor(code: string): code is McColor {
  return Object.hasOwn(MC_COLORS, code);
}

function isFormat(code: string): code is McFormat {
  return Object.hasOwn(FORMATS, code);
}

/** Text with `§` codes split into runs of one style each. */
export function mcRuns(
  text: string,
): { text: string; color: McColor | null; formats: string[] }[] {
  const runs: { text: string; color: McColor | null; formats: string[] }[] = [];
  let style: Style = { color: null, formats: new Set() };
  let buffer = "";
  const flush = () => {
    if (buffer === "") return;
    runs.push({
      text: buffer,
      color: style.color,
      formats: [...style.formats].map((code) => FORMATS[code]),
    });
    buffer = "";
  };
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const code = text[i + 1]?.toLowerCase() ?? "";
    if (char === "§" && (isColor(code) || isFormat(code) || code === "r")) {
      flush();
      if (isColor(code)) style = { color: code, formats: new Set() };
      else if (code === "r") style = { color: null, formats: new Set() };
      else if (isFormat(code)) {
        style = { color: style.color, formats: new Set(style.formats) };
        style.formats.add(code);
      }
      i += 1;
    } else {
      buffer += char ?? "";
    }
  }
  flush();
  return runs;
}

/** Minecraft text as HTML spans (classes `mc-c-<code>`, `mc-bold`, …). */
export function renderMcText(text: string): string {
  return mcRuns(text)
    .map((run) => {
      const classes = [
        ...(run.color ? [`mc-c-${run.color}`] : []),
        ...run.formats.map((format) => `mc-${format}`),
      ];
      const content = escapeHtml(run.text);
      if (classes.length === 0) return content;
      // Obfuscated text is scrambled on purpose: screen readers skip it.
      const hidden = run.formats.includes("obfuscated")
        ? ' aria-hidden="true"'
        : "";
      return `<span class="${classes.join(" ")}"${hidden}>${content}</span>`;
    })
    .join("");
}

/** The text without codes. */
export function stripMcCodes(text: string): string {
  return mcRuns(text)
    .map((run) => run.text)
    .join("");
}

/** Whether the text sets its own colour at the start. */
export function startsWithColor(text: string): boolean {
  const code = text[1]?.toLowerCase() ?? "";
  return text.startsWith("§") && isColor(code);
}
