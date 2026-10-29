/**
 * Wikis themselves: their addresses, labels and sidebar, and the links into them.
 * Paths here are on the wiki's host (wiki.trilleo.net/<slug>/…).
 */
import type {
  Wiki,
  WikiKind,
  WikiNavSection,
  WikiVisibility,
} from "@trilleo/db";
import { effectiveSets } from "@trilleo/wiki";
import { normalizeTitle, titlePath } from "./titles";

/**
 * Slugs a wiki can't have: the wiki's own paths, and every top-level path of the
 * main site. The wiki's host serves the same app, and its pre-built pages are files
 * at those paths (wikis.test.ts checks the list against src/pages/).
 */
export const RESERVED_WIKI_SLUGS: ReadonlySet<string> = new Set([
  "about",
  "account",
  "accessibility",
  "admin",
  "api",
  "apple-touch-icon",
  "assets",
  "auth",
  "avatars",
  "check",
  "colophon",
  "comments",
  "contact",
  "d",
  "developers",
  "faq",
  "favicon",
  "files",
  "forum",
  "games",
  "help",
  "humans",
  "legal",
  "llms",
  "mail",
  "media",
  "minecraft",
  "new",
  "og",
  "people",
  "robots",
  "rss",
  "search",
  "security",
  "sign-in",
  "sign-up",
  "sitemap",
  "static",
  "study",
  "tools",
  "wiki",
  "writing",
]);

export const WIKI_SLUG_PATTERN = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;
export const WIKI_LIMITS = {
  slug: { min: 2, max: 40 },
  name: 80,
  description: 300,
  code: { min: 2, max: 5 },
  navSections: 8,
  navLinks: 16,
} as const;

export const WIKI_KINDS: Readonly<Record<WikiKind, string>> = {
  game: "Game",
  minecraft: "Minecraft server",
  code: "Code project",
  general: "Wiki",
};

export const WIKI_VISIBILITIES: Readonly<
  Record<WikiVisibility, { label: string; hint: string }>
> = {
  public: {
    label: "Public",
    hint: "Listed on the wiki's front page and open to search engines.",
  },
  unlisted: {
    label: "Unlisted",
    hint: "Anyone with the link can read it; it isn't listed or indexed.",
  },
  private: {
    label: "Private",
    hint: "Only its members (and the site's admin) can read it.",
  },
};

export type SlugProblem = "format" | "length" | "reserved";

export function checkWikiSlug(slug: string): SlugProblem | null {
  if (slug.length < WIKI_LIMITS.slug.min || slug.length > WIKI_LIMITS.slug.max)
    return "length";
  if (!WIKI_SLUG_PATTERN.test(slug)) return "format";
  if (RESERVED_WIKI_SLUGS.has(slug)) return "reserved";
  return null;
}

export const SLUG_PROBLEMS: Readonly<Record<SlugProblem, string>> = {
  format:
    "Use lower-case letters, digits and single hyphens, starting with a letter.",
  length: `Between ${String(WIKI_LIMITS.slug.min)} and ${String(WIKI_LIMITS.slug.max)} characters.`,
  reserved: "That address is taken by the site itself.",
};

/** "sky" → "SKY"; null if it isn't 2–5 letters or digits. */
export function normalizeCode(raw: string): string | null {
  const code = raw.trim().toUpperCase();
  if (
    code.length < WIKI_LIMITS.code.min ||
    code.length > WIKI_LIMITS.code.max ||
    !/^[A-Z0-9]+$/.test(code)
  )
    return null;
  return code;
}

/** /<slug>/ or /<slug>/<Title>. */
export function wikiHref(wiki: Pick<Wiki, "slug">, title?: string): string {
  return title === undefined
    ? `/${wiki.slug}/`
    : `/${wiki.slug}/${titlePath(title)}`;
}

/** The wiki's own pages: /<slug>/-/<tool>[/<Title>]. */
export function toolHref(
  wiki: Pick<Wiki, "slug">,
  tool: string,
  title?: string,
): string {
  return title === undefined
    ? `/${wiki.slug}/-/${tool}`
    : `/${wiki.slug}/-/${tool}/${titlePath(title)}`;
}

/**
 * The sidebar as it's edited: one section per block, its first line the label,
 * each following line "Label | Page title" (or just a page title).
 */
export function formatNav(nav: readonly WikiNavSection[]): string {
  return nav
    .map((section) =>
      [
        section.label,
        ...section.links.map((link) =>
          link.label === link.page ? link.page : `${link.label} | ${link.page}`,
        ),
      ].join("\n"),
    )
    .join("\n\n");
}

export function parseNav(text: string): WikiNavSection[] {
  const sections: WikiNavSection[] = [];
  for (const block of text.replace(/\r\n?/g, "\n").split(/\n\s*\n/)) {
    const lines = block
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
    const [label, ...rest] = lines;
    if (!label) continue;
    const links = rest.slice(0, WIKI_LIMITS.navLinks).map((line) => {
      const bar = line.indexOf("|");
      if (bar === -1) return { label: line, page: line };
      const text = line.slice(0, bar).trim();
      const page = line.slice(bar + 1).trim();
      return { label: text || page, page: page || text };
    });
    sections.push({ label: label.slice(0, 60), links });
    if (sections.length >= WIKI_LIMITS.navSections) break;
  }
  return sections;
}

export type WikiField =
  | "slug"
  | "name"
  | "code"
  | "description"
  | "kind"
  | "visibility"
  | "homeTitle"
  | "nav"
  | "componentSets";

/** What the settings (and new wiki) form holds, as typed. */
export interface WikiDraft {
  slug: string;
  name: string;
  code: string;
  description: string;
  kind: string;
  visibility: string;
  homeTitle: string;
  nav: string;
  componentSets: string[];
}

export function wikiDraft(wiki: Wiki): WikiDraft {
  return {
    slug: wiki.slug,
    name: wiki.name,
    code: wiki.code,
    description: wiki.description,
    kind: wiki.kind,
    visibility: wiki.visibility,
    homeTitle: wiki.homeTitle,
    nav: formatNav(wiki.nav),
    componentSets: wiki.componentSets,
  };
}

export function readWikiForm(form: FormData): WikiDraft {
  const text = (name: string) => {
    const value = form.get(name);
    return typeof value === "string" ? value.trim() : "";
  };
  return {
    slug: text("slug").toLowerCase(),
    name: text("name"),
    code: text("code"),
    description: text("description"),
    kind: text("kind"),
    visibility: text("visibility"),
    homeTitle: text("homeTitle"),
    nav: text("nav"),
    componentSets: form
      .getAll("componentSets")
      .filter((value): value is string => typeof value === "string"),
  };
}

export type WikiValidation =
  | {
      ok: true;
      input: Omit<Wiki, "id" | "source" | "createdAt" | "updatedAt">;
    }
  | { ok: false; errors: Partial<Record<WikiField, string>> };

/** Checks a draft; `slug` only matters when creating (it never changes after). */
export function validateWiki(draft: WikiDraft): WikiValidation {
  const errors: Partial<Record<WikiField, string>> = {};
  const slugProblem = checkWikiSlug(draft.slug);
  if (slugProblem) errors.slug = SLUG_PROBLEMS[slugProblem];
  if (draft.name === "" || draft.name.length > WIKI_LIMITS.name)
    errors.name = `A name, up to ${String(WIKI_LIMITS.name)} characters.`;
  const code = normalizeCode(draft.code);
  if (!code) errors.code = "2–5 letters or digits.";
  if (draft.description.length > WIKI_LIMITS.description)
    errors.description = `Up to ${String(WIKI_LIMITS.description)} characters.`;
  if (!Object.hasOwn(WIKI_KINDS, draft.kind)) errors.kind = "Pick a kind.";
  if (!Object.hasOwn(WIKI_VISIBILITIES, draft.visibility))
    errors.visibility = "Pick who can read it.";
  const homeTitle = normalizeTitle(draft.homeTitle);
  if (!homeTitle) errors.homeTitle = "A page title.";
  const nav = parseNav(draft.nav);
  const badLink = nav
    .flatMap((section) => section.links)
    .find((link) => !normalizeTitle(link.page));
  if (badLink) errors.nav = `“${badLink.page}” can't be a page title.`;
  if (Object.keys(errors).length > 0 || !code || !homeTitle)
    return { ok: false, errors };
  return {
    ok: true,
    input: {
      slug: draft.slug,
      name: draft.name,
      code,
      description: draft.description,
      kind: draft.kind as WikiKind,
      visibility: draft.visibility as WikiVisibility,
      homeTitle,
      nav,
      componentSets: [...effectiveSets(draft.componentSets)].sort(),
    },
  };
}
