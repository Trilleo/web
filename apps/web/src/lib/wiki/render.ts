/**
 * Wiki pages' Markdown, rendered when a page is saved. Anyone a wiki trusts can
 * write it, so it's safe like comments: HTML stays text, links are http(s) or on the
 * site, images only from the files domain (reviewed uploads). On top of Markdown:
 *
 *   [[Title]]  [[Title|label]]  [[Title#Section]]  [[#Section]]
 *   [[Category:Name]]        puts the page in a category (shows nothing)
 *   [[:Category:Name]]       links to the category instead
 *   [[@other-wiki:Title]]    a page in another wiki, marked as such
 *   #REDIRECT [[Title]]      on the first line: the page sends readers there
 *
 * Links carry their target's key (data-wiki-key), so a page's view can mark the
 * ones whose page doesn't exist (markMissing) without rendering again.
 * Bump WIKI_RENDER_VERSION when the output changes.
 */
import GithubSlugger, { slug as slugify } from "github-slugger";
import MarkdownIt, {
  type Env,
  type MarkdownIt as Markdown,
  type StateInline,
  type Token,
} from "markdown-it";
import type { PostHeading } from "@trilleo/db";
import type { HighlighterCore } from "shiki/core";
import { getHighlighter, highlightCode } from "../blog/render";
import { isAllowedLink } from "../comments/render";
import {
  NAMESPACES,
  namespaceOf,
  normalizeTitle,
  titleKey,
  titlePath,
} from "./titles";
import { RESERVED_WIKI_SLUGS, WIKI_SLUG_PATTERN } from "./wikis";

export const WIKI_RENDER_VERSION = 2;

/** Where images may come from: published files only. */
const IMAGE_ORIGIN = "https://files.trilleo.net/";

export type WikiLink =
  | {
      kind: "page";
      title: string;
      fragment: string;
      label: string;
      /** Written with a leading colon: a link, never a categorization. */
      forced: boolean;
    }
  | { kind: "section"; fragment: string; label: string }
  | {
      kind: "other-wiki";
      wiki: string;
      title: string;
      fragment: string;
      label: string;
    };

/** What's between [[ and ]], or null if it isn't a link (it shows as typed). */
export function parseWikiLink(inner: string): WikiLink | null {
  const bar = inner.indexOf("|");
  const target = (bar === -1 ? inner : inner.slice(0, bar)).trim();
  const label = bar === -1 ? "" : inner.slice(bar + 1).trim();
  if (target === "") return null;

  const hash = target.indexOf("#");
  const fragment = hash === -1 ? "" : target.slice(hash + 1).trim();
  const page = (hash === -1 ? target : target.slice(0, hash)).trim();
  if (page === "")
    return fragment
      ? { kind: "section", fragment, label: label || fragment }
      : null;

  if (page.startsWith("@")) {
    const colon = page.indexOf(":");
    if (colon === -1) return null;
    const wiki = page.slice(1, colon).trim().toLowerCase();
    const title = normalizeTitle(page.slice(colon + 1));
    if (
      !WIKI_SLUG_PATTERN.test(wiki) ||
      RESERVED_WIKI_SLUGS.has(wiki) ||
      !title
    )
      return null;
    return { kind: "other-wiki", wiki, title, fragment, label: label || title };
  }

  const forced = page.startsWith(":");
  const title = normalizeTitle(forced ? page.slice(1) : page);
  if (!title) return null;
  const shown = forced ? page.slice(1).trim() : page;
  return { kind: "page", title, fragment, label: label || shown, forced };
}

/** The title a redirect page points to: "#REDIRECT [[Title]]" on its first line. */
export function parseRedirect(body: string): string | null {
  const match =
    /^\s*#REDIRECT\s*\[\[([^\]|#]+)(?:#[^\]|]*)?(?:\|[^\]]*)?\]\]/i.exec(body);
  return match?.[1] ? normalizeTitle(match[1]) : null;
}

export interface RenderedWikiPage {
  html: string;
  /** h2 and h3 headings, for the contents list. */
  toc: PostHeading[];
  /** The pages it links to in this wiki, by key (first spelling wins). */
  links: { key: string; title: string }[];
  /** Titles of its categories ("Category:Items"). */
  categories: string[];
  /** The text without markup. */
  plain: string;
}

/** What rendering passes to the rules (markdown-it's env is an open record). */
type RenderEnv = Record<string, unknown> & {
  wiki: string;
  links: Map<string, string>;
  categories: Set<string>;
  plain: string[];
};

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function wikiLinkRule(state: StateInline, silent: boolean): boolean {
  const { src, pos } = state;
  if (src.charCodeAt(pos) !== 0x5b || src.charCodeAt(pos + 1) !== 0x5b)
    return false;
  const end = src.indexOf("]]", pos + 2);
  if (end === -1) return false;
  const inner = src.slice(pos + 2, end);
  if (inner.includes("\n") || inner.includes("[[")) return false;
  const link = parseWikiLink(inner);
  if (!link) return false;
  if (!silent) {
    const token = state.push("wiki_link", "", 0);
    token.meta = link;
  }
  state.pos = end + 2;
  return true;
}

function fragmentHref(fragment: string): string {
  return fragment ? `#${encodeURIComponent(slugify(fragment))}` : "";
}

function isCategorization(token: Token): boolean {
  const link = token.meta as WikiLink;
  return (
    link.kind === "page" &&
    !link.forced &&
    namespaceOf(link.title) === "category"
  );
}

function renderWikiLink(token: Token, env: RenderEnv): string {
  const link = token.meta as WikiLink;
  const label = escapeHtml(link.label);
  if (link.kind === "section") {
    return `<a href="${fragmentHref(link.fragment)}" class="wiki-link">${label}</a>`;
  }
  if (link.kind === "other-wiki") {
    const href = `/${link.wiki}/${titlePath(link.title)}${fragmentHref(link.fragment)}`;
    return `<a href="${escapeHtml(href)}" class="wiki-link wiki-link-other" data-wiki="${escapeHtml(link.wiki)}">${label}<span class="wiki-link-wiki">${escapeHtml(link.wiki)}</span></a>`;
  }
  const key = titleKey(link.title);
  if (isCategorization(token)) {
    env.categories.add(link.title);
    return "";
  }
  if (!env.links.has(key)) env.links.set(key, link.title);
  const href = `/${env.wiki}/${titlePath(link.title)}${fragmentHref(link.fragment)}`;
  return `<a href="${escapeHtml(href)}" class="wiki-link" data-wiki-key="${escapeHtml(key)}">${label}</a>`;
}

function createMarkdown(shiki: HighlighterCore): Markdown {
  const md = new MarkdownIt({
    html: false,
    linkify: true,
    typographer: true,
    quotes: "“”‘’",
    highlight: (code, lang) => highlightCode(shiki, code, lang),
  });
  md.linkify.set({ fuzzyEmail: false });
  md.validateLink = (url) =>
    isAllowedLink(url) || url.startsWith("#") || url.startsWith(IMAGE_ORIGIN);
  md.inline.ruler.before("link", "wiki_link", wikiLinkRule);

  const rules = md.renderer.rules;
  rules.wiki_link = (tokens, idx, _options, env?: Env) => {
    const token = tokens[idx];
    return token ? renderWikiLink(token, env as RenderEnv) : "";
  };

  const renderLinkOpen = rules.link_open;
  rules.link_open = (tokens, idx, options, env, self) => {
    const href = String(tokens[idx]?.attrGet("href") ?? "");
    if (/^https?:\/\//i.test(href))
      tokens[idx]?.attrSet("rel", "nofollow ugc noopener noreferrer");
    return renderLinkOpen
      ? renderLinkOpen(tokens, idx, options, env, self)
      : self.renderToken(tokens, idx, options);
  };

  // Published files only; anything else shows as its alt text.
  rules.image = (tokens, idx) => {
    const token = tokens[idx];
    if (!token) return "";
    const src = String(token.attrGet("src") ?? "");
    const alt = escapeHtml(token.content);
    if (!src.startsWith(IMAGE_ORIGIN)) return alt;
    return `<img src="${escapeHtml(src)}" alt="${alt}" loading="lazy" decoding="async">`;
  };

  rules.table_open = () => '<div class="table-scroll"><table>\n';
  rules.table_close = () => "</table></div>\n";
  return md;
}

let processor: Promise<Markdown> | undefined;

/**
 * The page has its title as the h1, so headings start at h2: "#" and "##" are both
 * h2 (people write either for a section), "###" h3, and so on.
 */
function shiftHeadings(tokens: Token[]): void {
  for (const token of tokens) {
    if (token.type === "heading_open" || token.type === "heading_close") {
      token.tag = `h${String(Math.max(2, Number(token.tag.slice(1))))}`;
    }
  }
}

/** A page of `wiki` (its slug): HTML, contents, links and categories. */
export async function renderWikiPage(
  body: string,
  wiki: string,
): Promise<RenderedWikiPage> {
  processor ??= getHighlighter().then(createMarkdown);
  const md = await processor;
  const env: RenderEnv = {
    wiki,
    links: new Map(),
    categories: new Set(),
    plain: [],
  };
  // The redirect line is for the wiki, not the reader.
  const source = parseRedirect(body)
    ? body.replace(/^\s*#REDIRECT[^\n]*\n?/i, "")
    : body;
  const tokens = md.parse(source, env);
  shiftHeadings(tokens);

  const slugger = new GithubSlugger();
  const toc: PostHeading[] = [];
  tokens.forEach((token: Token, index: number) => {
    if (token.type === "inline") {
      for (const child of token.children ?? []) {
        if (child.type === "text" || child.type === "code_inline")
          env.plain.push(child.content);
        else if (child.type === "wiki_link" && !isCategorization(child))
          env.plain.push((child.meta as WikiLink).label);
      }
    }
    if (token.type !== "heading_open") return;
    const text =
      tokens[index + 1]?.children
        ?.map((child: Token) =>
          child.type === "text" || child.type === "code_inline"
            ? child.content
            : child.type === "wiki_link"
              ? (child.meta as WikiLink).label
              : "",
        )
        .join("") ?? "";
    const id = slugger.slug(text);
    token.attrSet("id", id);
    const depth = Number(token.tag.slice(1));
    if (depth === 2 || depth === 3) toc.push({ depth, slug: id, text });
  });

  // A paragraph of nothing but categories leaves an empty one behind.
  const html = md.renderer
    .render(tokens, md.options, env)
    .replace(/<p>\s*<\/p>\n?/g, "");
  return {
    html,
    toc,
    links: [...env.links].map(([key, title]) => ({ key, title })),
    categories: [...env.categories],
    plain: env.plain.join(" ").replace(/\s+/g, " ").trim(),
  };
}

/** Marks links to pages that don't exist (by key), so they can look different. */
export function markMissing(
  html: string,
  missing: ReadonlySet<string>,
): string {
  if (missing.size === 0) return html;
  return html.replace(
    /class="wiki-link" data-wiki-key="([^"]*)"/g,
    (whole, escaped: string) => {
      const key = escaped.replace(/&quot;/g, '"').replace(/&amp;/g, "&");
      return missing.has(key)
        ? `class="wiki-link is-missing" data-wiki-key="${escaped}"`
        : whole;
    },
  );
}

/** The keys a page's HTML links to (what markMissing checks). */
export function linkedKeys(html: string): string[] {
  const keys = new Set<string>();
  for (const match of html.matchAll(/data-wiki-key="([^"]*)"/g)) {
    keys.add((match[1] ?? "").replace(/&quot;/g, '"').replace(/&amp;/g, "&"));
  }
  return [...keys];
}

/** A short plain description, cut at a word. */
export function snippet(plain: string, max = 200): string {
  if (plain.length <= max) return plain;
  const cut = plain.slice(0, max - 1);
  const space = cut.lastIndexOf(" ");
  return `${(space > max * 0.6 ? cut.slice(0, space) : cut).trimEnd()}…`;
}

export const CATEGORY_PREFIX = `${NAMESPACES.category}:`;
