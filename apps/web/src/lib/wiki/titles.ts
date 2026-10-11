/**
 * Page titles. A title is what people read ("Enchanted Diamond"); its key is what
 * lookups use ("enchanted diamond"), so links don't care about case; its path is
 * the address ("Enchanted_Diamond"). Titles in the Category namespace
 * ("Category:Items") list the pages that name them.
 */

export const TITLE_MAX = 200;

/** Titles are measured in characters as people count them. */
const graphemes = new Intl.Segmenter("en", { granularity: "grapheme" });

/** Namespaces with a meaning; anything else with a colon is an ordinary title. */
export const NAMESPACES = { category: "Category" } as const;
export type Namespace = keyof typeof NAMESPACES | "main";

// Wiki markup and URL syntax can't appear in titles; nor can control characters.
// eslint-disable-next-line no-control-regex -- control characters are what it rejects
const FORBIDDEN = /[#<>[\]{}|\\\u0000-\u001f\u007f]/u;

function upperFirst(text: string): string {
  const first = text.codePointAt(0);
  if (first === undefined) return text;
  const char = String.fromCodePoint(first);
  return char.toLocaleUpperCase("en") + text.slice(char.length);
}

/**
 * A title as typed or as found in a path, tidied: underscores are spaces, runs of
 * spaces are one, the first letter (after a namespace) is upper case. Null if it
 * can't be a title.
 */
export function normalizeTitle(raw: string): string | null {
  let title = raw
    .normalize("NFC")
    .replace(/_/g, " ")
    .replace(/\s+/gu, " ")
    .trim();
  if (title === "" || FORBIDDEN.test(title)) return null;
  if (Array.from(graphemes.segment(title)).length > TITLE_MAX) return null;
  // Reserved for the wiki's own pages (/<wiki>/-/…), links to other wikis (@…)
  // and links that mean "show, don't categorize" (:Category:…).
  if (/^[-@:]/.test(title)) return null;
  // Subpages are fine ("Guides/Mining"); empty or relative segments aren't.
  const segments = title.split("/");
  if (
    segments.some((segment) => {
      const trimmed = segment.trim();
      return trimmed === "" || trimmed === "." || trimmed === "..";
    })
  )
    return null;
  title = segments.map((segment) => segment.trim()).join("/");

  const colon = title.indexOf(":");
  if (colon > 0) {
    const prefix = title.slice(0, colon).trim().toLowerCase();
    const rest = title.slice(colon + 1).trim();
    if (prefix in NAMESPACES) {
      if (rest === "") return null;
      return `${NAMESPACES[prefix as keyof typeof NAMESPACES]}:${upperFirst(rest)}`;
    }
  }
  return upperFirst(title);
}

/** The lookup key: case doesn't matter. */
export function titleKey(title: string): string {
  return title.toLocaleLowerCase("en");
}

export function namespaceOf(title: string): Namespace {
  for (const [key, prefix] of Object.entries(NAMESPACES)) {
    if (title.startsWith(`${prefix}:`)) return key as Namespace;
  }
  return "main";
}

/** "Category:Items" → "Items". */
export function categoryName(title: string): string {
  return title.slice(title.indexOf(":") + 1);
}

/** "Items" → "Category:Items". */
export function categoryTitle(name: string): string | null {
  return normalizeTitle(`${NAMESPACES.category}:${name}`);
}

/** The path segment(s) for a title: "Category:Iron Ore" → "Category:Iron_Ore". */
export function titlePath(title: string): string {
  return title
    .split("/")
    .map((segment) =>
      encodeURIComponent(segment.replace(/ /g, "_"))
        .replace(/%3A/gi, ":")
        .replace(/%2C/gi, ",")
        .replace(/%27/gi, "'")
        .replace(/%28/gi, "(")
        .replace(/%29/gi, ")"),
    )
    .join("/");
}

/** A title from a path: Astro's rest parameter, which arrives decoded. */
export function titleFromPath(path: string): string | null {
  return normalizeTitle(path);
}
