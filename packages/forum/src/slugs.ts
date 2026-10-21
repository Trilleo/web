/**
 * Addresses. A forum is /forum/<slug>/ (its slug alone, so moving it in the tree
 * keeps its links); a topic is /forum/<forum>/<id>-<slug>/, found by its id, so a
 * changed title or forum only means a redirect to the current address.
 */

/** Forum slugs can't be the forum section's own pages. */
export const RESERVED_FORUM_SLUGS: ReadonlySet<string> = new Set([
  "action",
  "admin",
  "api",
  "edit",
  "feed",
  "members",
  "messages",
  "new",
  "page",
  "post",
  "recent",
  "rss",
  "search",
  "tags",
  "unread",
]);

export const FORUM_SLUG_MAX = 40;
const FORUM_SLUG = /^[a-z0-9](?:[a-z0-9]|-(?=[a-z0-9])){0,39}$/;

export type ForumSlugProblem = "empty" | "invalid" | "reserved";

/** What's wrong with a forum slug, or null if it can be used. */
export function forumSlugProblem(slug: string): ForumSlugProblem | null {
  if (slug === "") return "empty";
  if (!FORUM_SLUG.test(slug)) return "invalid";
  if (RESERVED_FORUM_SLUGS.has(slug)) return "reserved";
  return null;
}

export const TOPIC_SLUG_MAX = 60;

/**
 * A title as it reads in an address: lower-case Latin letters and digits joined by
 * hyphens, accents dropped. A title with none of those (all Chinese, say) is "topic":
 * the id finds the topic anyway.
 */
export function slugify(title: string, max = TOPIC_SLUG_MAX): string {
  const slug = title
    .normalize("NFKD")
    .replace(/\p{M}+/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, max)
    .replace(/-+$/, "");
  return slug || "topic";
}

/** "12-how-to-start" for topic 12 titled "How to start". */
export function topicSegment(topic: { id: number; slug: string }): string {
  return `${String(topic.id)}-${topic.slug}`;
}

const MAX_ID = 2_147_483_647;

/** The topic id at the start of an address segment ("12-how-to-start" → 12). */
export function parseTopicSegment(segment: string): number | null {
  const match = /^([1-9]\d{0,9})(?:-|$)/.exec(segment);
  if (!match?.[1]) return null;
  const id = Number(match[1]);
  return id <= MAX_ID ? id : null;
}

export function forumPath(forum: { slug: string }): string {
  return `/forum/${forum.slug}/`;
}

export function topicPath(
  forum: { slug: string },
  topic: { id: number; slug: string },
  page = 1,
): string {
  const base = `/forum/${forum.slug}/${topicSegment(topic)}/`;
  return page > 1 ? `${base}?page=${String(page)}` : base;
}

/** A post's permanent link: redirects to wherever it is now (page and anchor). */
export function postPath(post: { id: number }): string {
  return `/forum/post/${String(post.id)}/`;
}

export function postAnchor(post: { id: number }): string {
  return `post-${String(post.id)}`;
}
