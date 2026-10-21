import type { APIRoute } from "astro";
import { getDb } from "../../lib/db";
import { topicsFeed } from "../../lib/forum/feeds";
import { loadTree } from "../../lib/forum/store";
import { SITE_URL } from "../../lib/site";

export const prerender = false;

/** New topics across the forum, as visitors see it. */
export const GET: APIRoute = async ({ site }) => {
  const db = await getDb();
  return topicsFeed(db, {
    tree: await loadTree(db),
    forum: null,
    site: site ?? SITE_URL,
  });
};
