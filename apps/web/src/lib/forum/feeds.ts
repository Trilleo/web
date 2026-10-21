/**
 * The forum's RSS feeds, as visitors see it (nothing hidden or waiting): new topics
 * across the forum or in one forum, and a topic's posts. Each item carries the
 * post's HTML.
 */
import rss from "@astrojs/rss";
import {
  forumPosts,
  forumTopics,
  forums,
  users,
  type Database,
  type Forum,
  type ForumTopic,
} from "@trilleo/db";
import { postPath, topicPath } from "@trilleo/forum";
import { and, desc, eq, inArray, isNull, or } from "drizzle-orm";
import { SITE_NAME } from "../site";
import { FORUM_DESCRIPTION } from "./public";
import type { ForumTree } from "./tree";

export const FEED_SIZE = 30;

const live = and(
  eq(forumPosts.state, "published"),
  isNull(forumPosts.deletedAt),
  eq(forumTopics.state, "published"),
  isNull(forumTopics.deletedAt),
  or(isNull(forumPosts.authorId), isNull(users.blockedAt)),
);

function feed(input: {
  title: string;
  description: string;
  site: URL | string;
  items: {
    title: string;
    link: string;
    pubDate: Date;
    content: string;
    author: string | null;
  }[];
}) {
  return rss({
    title: input.title,
    description: input.description,
    site: input.site,
    items: input.items.map((item) => ({
      title: item.title,
      link: item.link,
      pubDate: item.pubDate,
      content: item.content,
      ...(item.author
        ? { customData: `<dc:creator>${item.author}</dc:creator>` }
        : {}),
    })),
    xmlns: { dc: "http://purl.org/dc/elements/1.1/" },
    customData: "<language>en</language>",
  });
}

/** New topics in these forums (visitors' view), newest first. */
export async function topicsFeed(
  db: Database,
  input: { tree: ForumTree; forum: Forum | null; site: URL | string },
) {
  const ids = input.forum
    ? input.tree.canView(input.forum, null)
      ? [input.forum.id]
      : []
    : input.tree.visibleIds(null);
  const rows = await db
    .select({
      topic: forumTopics,
      forum: { slug: forums.slug, name: forums.name },
      html: forumPosts.html,
      author: users.username,
    })
    .from(forumTopics)
    .innerJoin(forums, eq(forums.id, forumTopics.forumId))
    .innerJoin(forumPosts, eq(forumPosts.id, forumTopics.firstPostId))
    .leftJoin(users, eq(users.id, forumPosts.authorId))
    .where(and(inArray(forumTopics.forumId, [...ids, -1]), live))
    .orderBy(desc(forumTopics.createdAt))
    .limit(FEED_SIZE);
  return feed({
    title: input.forum
      ? `${input.forum.name} · ${SITE_NAME} forum`
      : `${SITE_NAME} · Forum`,
    description:
      input.forum && input.forum.description !== ""
        ? input.forum.description
        : FORUM_DESCRIPTION,
    site: input.site,
    items: rows.map((row) => ({
      title:
        row.forum.name && !input.forum
          ? `${row.topic.title} (${row.forum.name})`
          : row.topic.title,
      link: topicPath(row.forum, row.topic),
      pubDate: row.topic.createdAt,
      content: row.html,
      author: row.author,
    })),
  });
}

/** A topic's newest posts. */
export async function postsFeed(
  db: Database,
  input: { topic: ForumTopic; forum: Forum; site: URL | string },
) {
  const rows = await db
    .select({ post: forumPosts, author: users.username })
    .from(forumPosts)
    .innerJoin(forumTopics, eq(forumTopics.id, forumPosts.topicId))
    .leftJoin(users, eq(users.id, forumPosts.authorId))
    .where(and(eq(forumPosts.topicId, input.topic.id), live))
    .orderBy(desc(forumPosts.createdAt))
    .limit(FEED_SIZE);
  return feed({
    title: `${input.topic.title} · ${SITE_NAME} forum`,
    description: `Posts in “${input.topic.title}”, in ${input.forum.name}.`,
    site: input.site,
    items: rows.map((row) => ({
      title:
        row.post.id === input.topic.firstPostId
          ? input.topic.title
          : `${row.author ? `@${row.author}` : "Someone"} replied`,
      link: postPath(row.post),
      pubDate: row.post.createdAt,
      content: row.post.html,
      author: row.author,
    })),
  });
}

/** Public topics, for /sitemap-forum.xml: where and when they last changed. */
export async function sitemapTopics(db: Database, tree: ForumTree) {
  return db
    .select({
      topic: {
        id: forumTopics.id,
        slug: forumTopics.slug,
        lastPostAt: forumTopics.lastPostAt,
      },
      forum: { slug: forums.slug },
    })
    .from(forumTopics)
    .innerJoin(forums, eq(forums.id, forumTopics.forumId))
    .where(
      and(
        inArray(forumTopics.forumId, [...tree.visibleIds(null), -1]),
        eq(forumTopics.state, "published"),
        isNull(forumTopics.deletedAt),
      ),
    )
    .orderBy(desc(forumTopics.lastPostAt))
    .limit(5000);
}
