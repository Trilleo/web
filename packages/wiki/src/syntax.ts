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

const FIELD = /^([^:\n]{1,40}?)\s*:\s+(.*)$/;
const SECTION = /^==\s*(.+?)\s*==\s*$/;

/** A `key: value` line, or null. Keys can't hold colons; values can. */
export function parseField(line: string): Field | null {
  const match = FIELD.exec(line.trim());
  if (!match?.[1] || match[2] === undefined) return null;
  return { key: match[1].trim(), value: match[2].trim() };
}

/** `== Label ==` on its own line: the label, or null. */
export function parseSectionLine(line: string): string | null {
  return SECTION.exec(line.trim())?.[1] ?? null;
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
