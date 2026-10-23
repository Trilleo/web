/**
 * Answers and enumerations. An enumeration gives the letters in each word of the
 * answer: "6", "4,3" (two words), "5-4" (hyphenated), "2'1" isn't used: apostrophes
 * don't count. Guesses are compared by their letters only, so case, spaces, hyphens,
 * apostrophes and accents never matter.
 */

/** The parts of an enumeration: lengths, and what joins each to the next. */
export interface Enumeration {
  lengths: number[];
  /** One fewer than lengths: "," between words, "-" inside a hyphenated word. */
  joins: ("," | "-")[];
}

export const ENUMERATION_LIMITS = {
  /** Words (or hyphenated parts) in one answer. */
  parts: 8,
  /** Letters in one part. */
  partLetters: 20,
  /** Letters in the whole answer. */
  letters: 40,
} as const;

/** "(4,3)", "4, 3" or "4-3" → its parts; null if it isn't one. */
export function parseEnumeration(text: string): Enumeration | null {
  const inner = text
    .trim()
    .replace(/^\((.*)\)$/, "$1")
    .replace(/\s+/g, "");
  if (!/^\d+(?:[,-]\d+)*$/.test(inner)) return null;
  const lengths = inner.split(/[,-]/).map(Number);
  const joins = [...inner.matchAll(/[,-]/g)].map((m) => m[0] as "," | "-");
  if (lengths.length > ENUMERATION_LIMITS.parts) return null;
  if (lengths.some((n) => n < 1 || n > ENUMERATION_LIMITS.partLetters))
    return null;
  if (sum(lengths) > ENUMERATION_LIMITS.letters) return null;
  return { lengths, joins };
}

function sum(values: readonly number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

/** "(4,3)": how it's printed after a clue. */
export function formatEnumeration(enumeration: Enumeration): string {
  const parts = enumeration.lengths.map((length, index) =>
    index === 0
      ? String(length)
      : `${enumeration.joins[index - 1] ?? ","}${String(length)}`,
  );
  return `(${parts.join("")})`;
}

export function letterCount(enumeration: Enumeration): number {
  return sum(enumeration.lengths);
}

/** Letters only, upper case, accents dropped: "Café-au lait!" → "CAFEAULAIT". */
export function normalizeAnswer(text: string): string {
  return text
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toUpperCase()
    .replace(/[^A-Z]/g, "");
}

/** The enumeration an answer has as written: "ice cream" → "(3,5)", "well-known" → "(4-5)". */
export function enumerationOf(answer: string): Enumeration | null {
  const words = answer
    .trim()
    .split(/\s+/)
    .filter((word) => normalizeAnswer(word) !== "");
  const lengths: number[] = [];
  const joins: ("," | "-")[] = [];
  words.forEach((word, wordIndex) => {
    const parts = word
      .split("-")
      .filter((part) => normalizeAnswer(part) !== "");
    parts.forEach((part, partIndex) => {
      if (lengths.length > 0)
        joins.push(partIndex === 0 && wordIndex > 0 ? "," : "-");
      lengths.push(normalizeAnswer(part).length);
    });
  });
  if (lengths.length === 0) return null;
  const text = formatEnumeration({ lengths, joins });
  return parseEnumeration(text);
}

/** Whether the answer, as written, has exactly this enumeration. */
export function answerFits(answer: string, enumeration: Enumeration): boolean {
  const own = enumerationOf(answer);
  return (
    own !== null && formatEnumeration(own) === formatEnumeration(enumeration)
  );
}

export type GuessCheck =
  | { kind: "correct" }
  | { kind: "wrong" }
  /** Not the right number of letters: not counted as a try. */
  | { kind: "length"; letters: number; got: number };

export function checkGuess(
  guess: string,
  answer: string,
  enumeration: Enumeration,
): GuessCheck {
  const letters = normalizeAnswer(guess);
  const wanted = letterCount(enumeration);
  if (letters.length !== wanted)
    return { kind: "length", letters: wanted, got: letters.length };
  return letters === normalizeAnswer(answer)
    ? { kind: "correct" }
    : { kind: "wrong" };
}
