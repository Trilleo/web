import type { ToolMeta } from "@trilleo/tool-kit";

/** The longest note, in characters. */
export const NOTE_MAX_LENGTH = 100_000;

/** A note as stored: its Markdown. Titles and dates are derived, not stored. */
export interface Note {
  body: string;
}

export function isNote(value: unknown): value is Note {
  return (
    typeof value === "object" &&
    value !== null &&
    Object.keys(value).length === 1 &&
    "body" in value &&
    typeof value.body === "string" &&
    value.body.length <= NOTE_MAX_LENGTH
  );
}

/** Kept separate from the app, so the server can read it without loading React. */
export const meta: ToolMeta = {
  slug: "notes",
  name: "Notes",
  description:
    "A Markdown scratchpad. Works in your browser; sign in to keep notes in your account.",
  status: "live",
  shape: "quarter",
  isValidValue: isNote,
};
