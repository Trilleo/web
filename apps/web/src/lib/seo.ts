/**
 * What search engines and link previews read: descriptions, share images and
 * structured data (JSON-LD). BaseLayout turns these into tags. Pure functions, so
 * they're tested directly.
 */
import type { ToolMeta } from "@trilleo/tool-kit";
import { formatPostDate } from "./listings";
import { readingMinutes, type PostEntry } from "./posts";
import { GITHUB_URL, SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "./site";

/** Who writes the site: the author of every post, in structured data. */
export const AUTHOR_NAME = "Trilleo";

/** Share images are 1200×630, the size Open Graph and X expect for large cards. */
export const OG_IMAGE_WIDTH = 1200;
export const OG_IMAGE_HEIGHT = 630;

/** Tag pages with fewer posts than this are noindex and left out of the sitemap. */
export const TAG_INDEX_MIN_POSTS = 2;

/** Search results show about this many characters of a description. */
export const DESCRIPTION_LENGTH = 155;

/** Search results cut titles at about this many characters. */
export const SEARCH_TITLE_LENGTH = 60;

/** Shorter descriptions leave room that search engines fill from the page. */
export const DESCRIPTION_MIN_LENGTH = 70;

/** How a title or description will fare in search results. */
export type LengthVerdict = "missing" | "short" | "good" | "long";

/** A page title as search results show it (with the site's name), judged. */
export function titleVerdict(fullTitle: string): LengthVerdict {
  if (!fullTitle.trim()) return "missing";
  return fullTitle.length > SEARCH_TITLE_LENGTH ? "long" : "good";
}

export function descriptionVerdict(description: string): LengthVerdict {
  const length = description.trim().length;
  if (length === 0) return "missing";
  if (length < DESCRIPTION_MIN_LENGTH) return "short";
  return length > DESCRIPTION_LENGTH ? "long" : "good";
}

/** Plain text of some HTML: tags dropped, common entities decoded, spaces collapsed. */
export function htmlToText(html: string): string {
  return (
    html
      // Footnote references and the footnotes section aren't reading text.
      .replace(/<sup[^>]*class="footnote-ref"[^>]*>[\s\S]*?<\/sup>/g, "")
      .replace(/<section[^>]*class="footnotes"[^>]*>[\s\S]*?<\/section>/g, "")
      .replace(/<(pre|style|script)[^>]*>[\s\S]*?<\/\1>/g, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&#(\d+);/g, (_, code: string) =>
        String.fromCodePoint(Number(code)),
      )
      .replace(/&amp;/g, "&")
      .replace(/\s+/g, " ")
      .trim()
  );
}

/** At most `max` characters, cut at a word boundary with an ellipsis. */
export function truncate(text: string, max = DESCRIPTION_LENGTH): string {
  const trimmed = text.trim();
  if (trimmed.length <= max) return trimmed;
  const cut = trimmed.slice(0, max - 1);
  const space = cut.lastIndexOf(" ");
  // A single very long word: cut mid-word rather than return almost nothing.
  const end = space > max / 2 ? space : cut.length;
  return `${cut.slice(0, end).replace(/[\s,;:.–—-]+$/, "")}…`;
}

/**
 * A page's meta description: the written one, else the start of the post's text,
 * else the site's. Search engines invent one when it's missing, usually worse.
 */
export function describe(description: string, html = ""): string {
  const written = description.trim();
  if (written) return written;
  const text = htmlToText(html);
  return text ? truncate(text) : SITE_DESCRIPTION;
}

/** A short, stable hash (FNV-1a), for cache-busting share image URLs. */
export function shortHash(text: string): string {
  let hash = 0x811c9dc5;
  for (const char of text) {
    hash ^= char.codePointAt(0) ?? 0;
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(36);
}

/** Bump when the share card's design changes, so every image gets a new URL. */
export const OG_CARD_VERSION = 1;

/** What a share card shows. The same fields always draw the same image. */
export interface OgCard {
  /** Mono label above the title, e.g. "(01) Writing". */
  section: string;
  title: string;
  /** Mono line at the bottom, e.g. the date and reading time. */
  meta: string;
}

/**
 * A share image's URL. `v` changes whenever what's drawn changes, so the image can
 * be cached forever and a retitled post still gets a fresh preview.
 */
export function ogImagePath(path: string, card: OgCard): string {
  const version = shortHash(
    JSON.stringify([OG_CARD_VERSION, card.section, card.title, card.meta]),
  );
  return `/og/${path}.png?v=${version}`;
}

/** Characters of a card's meta line that fit beside the logo. */
export const CARD_META_LENGTH = 46;

/** The site's own card: the home page, and pages without one of their own. */
export const SITE_CARD: OgCard = {
  section: "(00) Index",
  // The card's footer already names the site.
  title: SITE_DESCRIPTION,
  meta: "Writing · Tools · About",
};

export const SITE_IMAGE = ogImagePath("site", SITE_CARD);

/** A post's card: its No., title, date, reading time and tags. */
export function postCard(post: PostEntry, number: string): OgCard {
  let meta = `${formatPostDate(post.data.pubDate ?? null)} · ${String(readingMinutes(post.body))} min read`;
  // As many whole tags as fit on the card's one line.
  for (const tag of post.data.tags) {
    const longer = `${meta} · ${tag}`;
    if (longer.length > CARD_META_LENGTH) break;
    meta = longer;
  }
  return { section: `(01) Writing / ${number}`, title: post.data.title, meta };
}

export function toolCard(tool: ToolMeta): OgCard {
  return {
    section: "(02) Tools",
    title: tool.name,
    meta: truncate(tool.description, CARD_META_LENGTH),
  };
}

// Structured data (https://schema.org, as JSON-LD). Google reads it for rich results;
// other crawlers and assistants use it to tell who wrote what, and when.

export type JsonLd = Record<string, unknown>;

const WEBSITE_ID = `${SITE_URL}/#website`;
const AUTHOR_ID = `${SITE_URL}/#author`;

function absolute(path: string): string {
  return new URL(path, SITE_URL).href;
}

/** The author, referenced from posts by `@id`. */
export function authorJsonLd(): JsonLd {
  return {
    "@type": "Person",
    "@id": AUTHOR_ID,
    name: AUTHOR_NAME,
    url: absolute("/about/"),
    sameAs: [GITHUB_URL],
  };
}

/** The site itself, with the search box's URL (Google's "sitelinks search box"). */
export function websiteJsonLd(): JsonLd {
  return {
    "@type": "WebSite",
    "@id": WEBSITE_ID,
    name: SITE_NAME,
    url: absolute("/"),
    description: SITE_DESCRIPTION,
    inLanguage: "en",
    publisher: { "@id": AUTHOR_ID },
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${absolute("/writing/")}?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
}

export interface Crumb {
  name: string;
  path: string;
}

/** The trail above a page, e.g. Home › Writing › Post. */
export function breadcrumbJsonLd(crumbs: readonly Crumb[]): JsonLd {
  return {
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((crumb, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: crumb.name,
      item: absolute(crumb.path),
    })),
  };
}

export interface ArticleInput {
  title: string;
  description: string;
  path: string;
  image: string;
  published: Date;
  modified?: Date | undefined;
  tags: readonly string[];
  words?: number | undefined;
}

export function blogPostingJsonLd(post: ArticleInput): JsonLd {
  const url = absolute(post.path);
  return {
    "@type": "BlogPosting",
    "@id": `${url}#article`,
    headline: post.title,
    description: post.description,
    url,
    mainEntityOfPage: url,
    image: absolute(post.image),
    datePublished: post.published.toISOString(),
    dateModified: (post.modified ?? post.published).toISOString(),
    author: { "@id": AUTHOR_ID },
    publisher: { "@id": AUTHOR_ID },
    isPartOf: { "@id": WEBSITE_ID },
    inLanguage: "en",
    ...(post.tags.length > 0 && { keywords: post.tags.join(", ") }),
    ...(post.words !== undefined && { wordCount: post.words }),
  };
}

/** A tool, as a free web app. */
export function toolJsonLd(
  tool: ToolMeta,
  path: string,
  image: string,
): JsonLd {
  return {
    "@type": "WebApplication",
    name: tool.name,
    description: tool.description,
    url: absolute(path),
    image: absolute(image),
    applicationCategory: "UtilitiesApplication",
    operatingSystem: "Any (web browser)",
    browserRequirements: "Requires JavaScript.",
    isAccessibleForFree: true,
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    author: { "@id": AUTHOR_ID },
  };
}

/**
 * The page's JSON-LD as one `@graph`, safe inside <script>: `<` is escaped so a
 * title containing "</script>" can't end the element early (the same for `>`, `&`
 * and the line separators JavaScript treats as newlines).
 */
export function serializeJsonLd(items: readonly JsonLd[]): string {
  return JSON.stringify({ "@context": "https://schema.org", "@graph": items })
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}
