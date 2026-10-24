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

/** Text inside a bit of HTML: tags dropped, entities decoded, spaces trimmed. */
export function htmlText(html: string): string {
  return html
    .replace(/<[^>]*>/g, "")
    .replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (whole, name: string) => {
      if (name.startsWith("#x") || name.startsWith("#X"))
        return String.fromCodePoint(parseInt(name.slice(2), 16));
      if (name.startsWith("#"))
        return String.fromCodePoint(Number(name.slice(1)));
      return ENTITIES[name.toLowerCase()] ?? whole;
    })
    .trim();
}
