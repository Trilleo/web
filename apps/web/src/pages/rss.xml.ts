import rss from "@astrojs/rss";
import type { APIRoute } from "astro";
import { getPosts } from "../lib/collection";
import { toFeedItem } from "../lib/feed";
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "../lib/site";

/** Full-content feed of published posts. Drafts never appear, even in dev. */
export const GET: APIRoute = async ({ site }) => {
  const origin = site ?? SITE_URL;
  const posts = await getPosts({ includeDrafts: false });
  return rss({
    title: `${SITE_NAME} · Writing`,
    description: SITE_DESCRIPTION,
    site: origin,
    items: posts.map((post) => toFeedItem(post, origin)),
    customData: "<language>en</language>",
  });
};
