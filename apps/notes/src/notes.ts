import type { StoredItem } from "@trilleo/tool-kit";
import type { Note } from "./meta";

export type NoteItem = StoredItem<Note>;

const TITLE_MAX = 80;

/** A note's title: its first line with text, without Markdown heading marks. */
export function noteTitle(body: string): string {
  for (const line of body.split("\n")) {
    const text = line.replace(/^\s*#{1,6}\s+/, "").trim();
    if (text)
      return text.length > TITLE_MAX
        ? `${text.slice(0, TITLE_MAX - 1)}…`
        : text;
  }
  return "Untitled note";
}

/** Some of the text after the title, for the list. */
export function notePreview(body: string): string {
  const lines = body.split("\n").filter((line) => line.trim());
  return lines.slice(1).join(" ").replace(/\s+/g, " ").slice(0, 120);
}

/** Most recently changed first. */
export function sortNotes(notes: readonly NoteItem[]): NoteItem[] {
  return [...notes].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

/** Notes containing every word of the query, ignoring case. */
export function searchNotes(
  notes: readonly NoteItem[],
  query: string,
): NoteItem[] {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length === 0) return [...notes];
  return notes.filter((note) => {
    const body = note.value.body.toLowerCase();
    return words.every((word) => body.includes(word));
  });
}

/** Every note in one Markdown file, newest first, separated by rules. */
export function exportMarkdown(notes: readonly NoteItem[]): string {
  return sortNotes(notes)
    .map((note) => note.value.body.trim())
    .filter(Boolean)
    .join("\n\n---\n\n")
    .concat("\n");
}

/** The site's date style (2026.09.29), in the reader's own time zone. */
export function formatNoteDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${String(date.getFullYear())}.${pad(date.getMonth() + 1)}.${pad(date.getDate())}`;
}

/** A fresh key for a note (the data API accepts UUIDs). */
export function newNoteKey(): string {
  return crypto.randomUUID();
}
