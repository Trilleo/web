import { describe, expect, it } from "vitest";
import { NOTE_MAX_LENGTH, isNote } from "./meta";
import {
  exportMarkdown,
  formatNoteDate,
  newNoteKey,
  notePreview,
  noteTitle,
  searchNotes,
  sortNotes,
  type NoteItem,
} from "./notes";
import { renderNote } from "./render";

const note = (key: string, body: string, updatedAt: string): NoteItem => ({
  key,
  value: { body },
  updatedAt,
});

describe("noteTitle", () => {
  it("is the first line with text, without heading marks", () => {
    expect(noteTitle("\n\n## Groceries\n- milk")).toBe("Groceries");
    expect(noteTitle("Plain first line\nmore")).toBe("Plain first line");
    expect(noteTitle("#hashtag stays")).toBe("#hashtag stays");
  });

  it("has a fallback, and a length limit", () => {
    expect(noteTitle("")).toBe("Untitled note");
    expect(noteTitle("  \n \n")).toBe("Untitled note");
    const long = noteTitle("x".repeat(200));
    expect(long).toHaveLength(80);
    expect(long.endsWith("…")).toBe(true);
  });
});

describe("notePreview", () => {
  it("shows the text after the title on one line", () => {
    expect(notePreview("Title\n\nfirst  line\nsecond")).toBe(
      "first line second",
    );
    expect(notePreview("Only a title")).toBe("");
  });
});

describe("sortNotes and searchNotes", () => {
  const notes = [
    note("a", "Astro build notes", "2026-01-01T00:00:00Z"),
    note("b", "Groceries: milk, bread", "2026-03-01T00:00:00Z"),
    note("c", "Build the SHELF", "2026-02-01T00:00:00Z"),
  ];

  it("puts the latest changes first", () => {
    expect(sortNotes(notes).map((n) => n.key)).toEqual(["b", "c", "a"]);
  });

  it("finds notes with every word, ignoring case", () => {
    expect(searchNotes(notes, "build").map((n) => n.key)).toEqual(["a", "c"]);
    expect(searchNotes(notes, "shelf BUILD").map((n) => n.key)).toEqual(["c"]);
    expect(searchNotes(notes, "   ")).toHaveLength(3);
    expect(searchNotes(notes, "nothing")).toEqual([]);
  });
});

describe("exportMarkdown", () => {
  it("joins non-empty notes, newest first", () => {
    expect(
      exportMarkdown([
        note("a", "Old", "2026-01-01T00:00:00Z"),
        note("b", "  ", "2026-01-02T00:00:00Z"),
        note("c", "New\n", "2026-01-03T00:00:00Z"),
      ]),
    ).toBe("New\n\n---\n\nOld\n");
  });
});

describe("isNote", () => {
  it("accepts exactly a body within the limit", () => {
    expect(isNote({ body: "hi" })).toBe(true);
    expect(isNote({ body: "" })).toBe(true);
    expect(isNote({ body: "x".repeat(NOTE_MAX_LENGTH) })).toBe(true);
  });

  it.each([
    null,
    "text",
    [],
    { body: 5 },
    { body: "x".repeat(NOTE_MAX_LENGTH + 1) },
    { body: "hi", extra: true },
    {},
  ])("refuses %j", (value) => {
    expect(isNote(value)).toBe(false);
  });
});

describe("formatNoteDate", () => {
  it("uses the site's date style", () => {
    expect(formatNoteDate("2026-09-05T12:00:00")).toBe("2026.09.05");
    expect(formatNoteDate("not a date")).toBe("");
  });
});

describe("newNoteKey", () => {
  it("makes UUIDs", () => {
    expect(newNoteKey()).toMatch(/^[0-9a-f-]{36}$/);
    expect(newNoteKey()).not.toBe(newNoteKey());
  });
});

describe("renderNote", () => {
  it("renders full Markdown", () => {
    const html = renderNote(
      "# Title\n\n- one\n- two\n\n| a | b |\n|---|---|\n| 1 | 2 |",
    );
    expect(html).toContain("<h1>Title</h1>");
    expect(html).toContain("<li>one</li>");
    expect(html).toContain("<table>");
  });

  it("keeps HTML as text and loads nothing from elsewhere", () => {
    const html = renderNote(
      "<script>alert(1)</script> <img src=x onerror=alert(1)> ![pixel](https://evil.example/p.png)",
    );
    expect(html).not.toMatch(/<(script|img)\b/);
    expect(html).toContain("&lt;script&gt;");
  });

  it("links only to the web, this site and anchors, in a new tab", () => {
    expect(renderNote("[x](https://example.com)")).toBe(
      '<p><a href="https://example.com" rel="noopener noreferrer" target="_blank">x</a></p>\n',
    );
    expect(renderNote("[x](javascript:alert(1))")).not.toContain("<a ");
    expect(renderNote("[x](data:text/html,hi)")).not.toContain("<a ");
    expect(renderNote("[x](//evil.example)")).not.toContain("<a ");
  });
});
