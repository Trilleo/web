/**
 * Titles and artists are written slightly differently by each source: full-width or
 * half-width letters, "～" or "〜", spaces, punctuation. `matchKey` keeps only what
 * identifies them: letters and digits, NFKC-normalised and in lower case.
 */
export function matchKey(text: string): string {
  return text
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "");
}

const ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
};

/**
 * Text inside a bit of HTML: tags dropped, entities decoded, spaces trimmed. One pass
 * from each "<" to its ">" (an unclosed tag drops the rest), so no regex can backtrack
 * on hostile input. The result is text, never HTML: wherever it's shown it's escaped,
 * so a decoded "&lt;" stays a harmless "<".
 */
export function htmlText(html: string): string {
  let text = "";
  let at = 0;
  while (at < html.length) {
    const open = html.indexOf("<", at);
    if (open === -1) {
      text += html.slice(at);
      break;
    }
    text += html.slice(at, open);
    const close = html.indexOf(">", open + 1);
    if (close === -1) break;
    at = close + 1;
  }
  return text
    .replace(
      /&(#x[0-9a-f]{1,6}|#\d{1,7}|[a-z]{2,8});/gi,
      (whole, name: string) => {
        if (name.startsWith("#x") || name.startsWith("#X"))
          return codePoint(parseInt(name.slice(2), 16)) ?? whole;
        if (name.startsWith("#"))
          return codePoint(Number(name.slice(1))) ?? whole;
        return ENTITIES[name.toLowerCase()] ?? whole;
      },
    )
    .trim();
}

/** A character for a numeric entity, or null for one that isn't a character. */
function codePoint(n: number): string | null {
  return Number.isInteger(n) && n > 0 && n <= 0x10ffff
    ? String.fromCodePoint(n)
    : null;
}
