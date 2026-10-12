/** Reading what's typed inside components: fields, sections, words. */
import type { Field } from "./types";

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Characters in a field's key. */
const KEY_MAX = 40;

/*
 * Lines are read by hand, not with patterns like /^(.+?)\s*:\s+(.*)$/: those
 * backtrack on long runs of spaces, and anyone who edits a page types these lines.
 */

/** A `key: value` line, or null. Keys can't hold colons; values can. */
export function parseField(line: string): Field | null {
  const text = line.trim();
  if (text.includes("\n")) return null;
  const colon = text.indexOf(":");
  if (colon < 1) return null;
  const key = text.slice(0, colon).trim();
  const after = text.slice(colon + 1);
  // A space follows the colon ("time: 4h"), unlike in "12:30".
  if (!key || key.length > KEY_MAX || !/^\s/.test(after)) return null;
  return { key, value: after.trim() };
}

/** `== Label ==` on its own line: the label, or null. */
export function parseSectionLine(line: string): string | null {
  const text = line.trim();
  if (text.includes("\n") || !text.startsWith("==") || !text.endsWith("=="))
    return null;
  if (text.length < 5) return null;
  return text.slice(2, -2).trim() || null;
}

export interface Section {
  /** Null for what comes before the first `== Label ==`. */
  label: string | null;
  body: string;
}

/** A body split at `== Label ==` lines. */
export function splitSections(body: string): Section[] {
  const sections: Section[] = [];
  let current: Section = { label: null, body: "" };
  const lines: string[] = [];
  const flush = () => {
    current.body = lines.join("\n").trim();
    if (current.label !== null || current.body !== "") sections.push(current);
    lines.length = 0;
  };
  for (const line of body.split("\n")) {
    const label = parseSectionLine(line);
    if (label !== null) {
      flush();
      current = { label, body: "" };
    } else {
      lines.push(line);
    }
  }
  flush();
  return sections;
}

/** The first word, and the rest. */
export function firstWord(text: string): [string, string] {
  const trimmed = text.trim();
  const space = trimmed.search(/\s/);
  return space === -1
    ? [trimmed, ""]
    : [trimmed.slice(0, space), trimmed.slice(space).trim()];
}

/** A plain-text version of a component's source, for search and snippets. */
export function plainSource(text: string): string {
  return text
    .replace(/^:::.*$/gm, " ")
    .replace(/^==\s*(.+?)\s*==\s*$/gm, "$1")
    .replace(/\{\{[a-z][a-z0-9-]*\s*([^}]*)\}\}/g, "$1")
    .replace(/\[\[(?:[^\]|]*\|)?([^\]]*)\]\]/g, "$1")
    .replace(/[*_`#>|~]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
