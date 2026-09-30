/**
 * The admin's SEO checklist: problems in public posts that search engines would
 * notice (titles and descriptions that get cut or are missing, duplicate titles,
 * posts without tags, links to pages that don't exist). Pure: the caller loads the
 * posts and says which addresses exist.
 */
import { tagHref } from "./posts";
import {
  DESCRIPTION_LENGTH,
  DESCRIPTION_MIN_LENGTH,
  SEARCH_TITLE_LENGTH,
  descriptionVerdict,
  titleVerdict,
} from "./seo";
import { SITE_URL, formatTitle } from "./site";

export interface AuditPost {
  id: number;
  slug: string;
  title: string;
  description: string;
  seoTitle: string | null;
  seoDescription: string | null;
  tags: readonly string[];
  /** The rendered text. */
  html: string;
}

export interface PostIssues {
  id: number;
  slug: string;
  title: string;
  problems: string[];
}

/** Addresses that exist (paths) and prefixes under which everything is assumed to. */
export interface KnownPages {
  paths: ReadonlySet<string>;
  prefixes: readonly string[];
}

/** "/writing/a/?x#y" → "/writing/a", for comparing addresses. */
function normalize(path: string): string {
  const bare = path.replace(/[?#].*$/, "");
  return bare.length > 1 ? bare.replace(/\/+$/, "") : bare;
}

export function knownPages(
  paths: Iterable<string>,
  prefixes: readonly string[] = [],
): KnownPages {
  return { paths: new Set([...paths].map(normalize)), prefixes };
}

/** This site's addresses that a post's HTML links to, as paths. */
export function internalLinks(html: string, site = SITE_URL): string[] {
  const origin = new URL(site).origin;
  const links: string[] = [];
  for (const match of html.matchAll(/<a\s[^>]*href="([^"]+)"/g)) {
    const href = (match[1] ?? "").replace(/&amp;/g, "&");
    if (href.startsWith("/") && !href.startsWith("//")) links.push(href);
    else if (href.startsWith(`${origin}/`) || href === origin)
      links.push(href.slice(origin.length) || "/");
  }
  return links;
}

function isKnown(path: string, known: KnownPages): boolean {
  const normalized = normalize(path);
  return (
    known.paths.has(normalized) ||
    known.prefixes.some((prefix) => path.startsWith(prefix))
  );
}

/** Every public post with at least one problem, in the order given. */
export function auditPosts(
  posts: readonly AuditPost[],
  known: KnownPages,
): PostIssues[] {
  const searchTitles = new Map<string, number>();
  for (const post of posts) {
    const title = (post.seoTitle ?? post.title).trim().toLowerCase();
    searchTitles.set(title, (searchTitles.get(title) ?? 0) + 1);
  }

  const results: PostIssues[] = [];
  for (const post of posts) {
    const problems: string[] = [];
    const pageTitle = (post.seoTitle ?? post.title).trim();
    const fullTitle = formatTitle(pageTitle);
    if (titleVerdict(fullTitle) === "long") {
      problems.push(
        `Search title is ${String(fullTitle.length)} characters with the site's name; results cut at about ${String(SEARCH_TITLE_LENGTH)}.`,
      );
    }
    if ((searchTitles.get(pageTitle.toLowerCase()) ?? 0) > 1) {
      problems.push("Another post has the same search title.");
    }

    const description = (post.seoDescription ?? post.description).trim();
    const verdict = descriptionVerdict(description);
    if (verdict === "missing") problems.push("No description.");
    else if (verdict === "short")
      problems.push(
        `Description is short (${String(description.length)} characters): aim for ${String(DESCRIPTION_MIN_LENGTH)}–${String(DESCRIPTION_LENGTH)}.`,
      );
    else if (verdict === "long")
      problems.push(
        `Description is ${String(description.length)} characters; results cut at about ${String(DESCRIPTION_LENGTH)}.`,
      );

    if (post.tags.length === 0) problems.push("No tags.");

    const broken = [
      ...new Set(
        internalLinks(post.html).filter((path) => !isKnown(path, known)),
      ),
    ];
    for (const path of broken)
      problems.push(`Links to ${path}, which doesn't exist.`);

    if (problems.length > 0) {
      results.push({
        id: post.id,
        slug: post.slug,
        title: post.title,
        problems,
      });
    }
  }
  return results;
}

/** Tag pages' paths for a set of posts (every tag has one, indexed or not). */
export function tagPaths(posts: readonly Pick<AuditPost, "tags">[]): string[] {
  return posts.flatMap((post) => post.tags.map((tag) => tagHref(tag)));
}
