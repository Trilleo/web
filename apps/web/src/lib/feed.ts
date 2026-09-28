import type { RSSFeedItem } from "@astrojs/rss";
import { absolutizeUrls } from "./post-html";
import { postHref, type PostEntry } from "./posts";

export interface FeedPost extends PostEntry {
  /** Rendered HTML; present for Markdown posts, absent for MDX. */
  rendered?: { html: string } | undefined;
}

/**
 * One RSS item with the full post as HTML (links made absolute so they work in feed
 * readers). MDX posts, which have no pre-rendered HTML, fall back to the description.
 */
export function toFeedItem(post: FeedPost, site: string | URL): RSSFeedItem {
  const { title, description, pubDate, tags } = post.data;
  return {
    title,
    description,
    pubDate,
    link: postHref(post.id),
    categories: tags,
    content: post.rendered?.html
      ? absolutizeUrls(post.rendered.html, site)
      : undefined,
  };
}
