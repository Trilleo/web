import rss from "@astrojs/rss";
import type { APIRoute } from "astro";
import { ensureRendered, listPublicPosts } from "../lib/blog/store";
import { getDb } from "../lib/db";
import { toFeedItem } from "../lib/feed";
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "../lib/site";

export const prerender = false;

const FEED_SIZE = 30;

/** Full-content feed of the latest public posts. */
export const GET: APIRoute = async ({ site }) => {
  const origin = site ?? SITE_URL;
  const db = await getDb();
  const posts = await Promise.all(
    (await listPublicPosts(db)).slice(0, FEED_SIZE).map(async (post) => ({
      ...post,
      rendered: { html: (await ensureRendered(db, post.row)).html },
    })),
  );
  return rss({
    title: `${SITE_NAME} · Writing`,
    description: SITE_DESCRIPTION,
    site: origin,
    items: posts.map((post) => toFeedItem(post, origin)),
    customData: "<language>en</language>",
  });
};
