/**
 * Stable IDs for flashcards and quiz questions, so someone's review history and
 * answers stay attached as lessons are rebuilt. An ID is the lesson's slug and a
 * short hash of the card's front (or the question's prompt) as written, so editing
 * that text starts the card fresh. A trailing `{#name}` pins the ID instead, which
 * keeps the history through rewording:
 *
 *   Unit of resistance? :: The ohm {#ohm-unit}
 *   ? What's the current? {#current}
 *
 * Kept within a subject: `c:<lesson>:<key>` for cards, `q:<lesson>:<key>` for questions.
 */

/** A pin's name: lower-case letters, digits and hyphens. */
const PIN = /\{#([a-z0-9][a-z0-9-]{0,39})\}\s*$/;

/** The text without a trailing `{#name}`, and the name if there was one. */
export function splitPin(text: string): { text: string; pin: string | null } {
  const match = PIN.exec(text);
  return match
    ? { text: text.slice(0, match.index).trimEnd(), pin: match[1] ?? null }
    : { text, pin: null };
}

/** FNV-1a (32-bit) in base 36: short, stable, the same in Node and browsers. */
export function shortHash(text: string): string {
  let hash = 0x811c9dc5;
  for (const char of text) {
    hash ^= char.codePointAt(0) ?? 0;
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(36).padStart(7, "0");
}

function key(source: string, pin: string | null): string {
  return pin ?? shortHash(source.replace(/\s+/g, " ").trim());
}

export function cardId(
  lesson: string,
  front: string,
  pin: string | null,
): string {
  return `c:${lesson}:${key(front, pin)}`;
}

export function questionId(
  lesson: string,
  prompt: string,
  pin: string | null,
): string {
  return `q:${lesson}:${key(prompt, pin)}`;
}

/** The lesson an ID belongs to. */
export function lessonOf(id: string): string {
  return id.split(":")[1] ?? "";
}
