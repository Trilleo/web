/**
 * Post logic that doesn't touch the database, so it can be unit-tested directly.
 * blog/store.ts feeds post rows through these functions (see toBlogPost).
 */
import { formatListingNumber, type PostListing } from "./listings";

export interface PostData {
  title: string;
  description: string;
  pubDate?: Date | undefined;
  updatedDate?: Date | undefined;
  tags: string[];
  draft: boolean;
}

export interface PostEntry {
  id: string;
  body?: string | undefined;
  data: PostData;
}

export interface TagSummary {
  name: string;
  slug: string;
  count: number;
}

const WORDS_PER_MINUTE = 230;

/** Newest published first, then drafts (undated) by title. */
export function sortPosts<T extends PostEntry>(posts: readonly T[]): T[] {
  return [...posts].sort((a, b) => {
    const aDate = a.data.pubDate?.getTime();
    const bDate = b.data.pubDate?.getTime();
    if (aDate !== undefined && bDate !== undefined) return bDate - aDate;
    if (aDate !== undefined) return -1;
    if (bDate !== undefined) return 1;
    return a.data.title.localeCompare(b.data.title);
  });
}

/**
 * Stable "No." for each post: 001 is the oldest published post, counting up; drafts
 * come after the published ones. Takes posts in sortPosts() order.
 */
export function numberPosts(sorted: readonly PostEntry[]): Map<string, string> {
  const published = sorted.filter((post) => post.data.pubDate).reverse();
  const drafts = sorted.filter((post) => !post.data.pubDate);
  return new Map(
    [...published, ...drafts].map((post, index) => [
      post.id,
      formatListingNumber(index),
    ]),
  );
}

export function postHref(id: string): string {
  return `/writing/${id}/`;
}

/** Whole minutes at ~230 words per minute; never less than 1. */
export function readingMinutes(body: string | undefined): number {
  const words = body?.split(/\s+/).filter(Boolean).length ?? 0;
  return Math.max(1, Math.ceil(words / WORDS_PER_MINUTE));
}

/** "Self-hosting" → "self-hosting", "C & Rust" → "c-rust". */
export function tagSlug(tag: string): string {
  return tag
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function tagHref(tag: string): string {
  return `/writing/tags/${tagSlug(tag)}/`;
}

/** Every tag with its post count, alphabetically. Tags that slug the same are merged. */
export function collectTags(posts: readonly PostEntry[]): TagSummary[] {
  const tags = new Map<string, TagSummary>();
  for (const post of posts) {
    for (const name of new Set(post.data.tags)) {
      const slug = tagSlug(name);
      const existing = tags.get(slug);
      if (existing) existing.count += 1;
      else tags.set(slug, { name, slug, count: 1 });
    }
  }
  return [...tags.values()].sort((a, b) => a.name.localeCompare(b.name));
}

export function hasTag(post: PostEntry, slug: string): boolean {
  return post.data.tags.some((tag) => tagSlug(tag) === slug);
}

/** The chronological neighbours of a post, given posts in sortPosts() order. */
export function adjacentPosts<T extends PostEntry>(
  sorted: readonly T[],
  id: string,
): { newer: T | undefined; older: T | undefined } {
  const index = sorted.findIndex((post) => post.id === id);
  if (index === -1) return { newer: undefined, older: undefined };
  return { newer: sorted[index - 1], older: sorted[index + 1] };
}

export function toListing(post: PostEntry, number: string): PostListing {
  return {
    number,
    title: post.data.title,
    href: postHref(post.id),
    date: post.data.pubDate ?? null,
    draft: post.data.draft,
    readingMinutes: readingMinutes(post.body),
  };
}

/** Listings for posts in sortPosts() order, numbered with numberPosts(). */
export function toListings(sorted: readonly PostEntry[]): PostListing[] {
  const numbers = numberPosts(sorted);
  return sorted.map((post) => toListing(post, numbers.get(post.id) ?? "—"));
}

/** What the search box says about its results. */
export function searchSummary(count: number, query: string): string {
  if (count === 0) return `No posts match “${query}”.`;
  return `${String(count)} ${count === 1 ? "post matches" : "posts match"} “${query}”.`;
}
