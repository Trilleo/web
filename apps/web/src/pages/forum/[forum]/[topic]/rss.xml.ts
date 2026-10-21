import { can, parseTopicSegment } from "@trilleo/forum";
import type { APIRoute } from "astro";
import { getDb } from "../../../../lib/db";
import { postsFeed } from "../../../../lib/forum/feeds";
import { getTopic, loadTree } from "../../../../lib/forum/store";
import { SITE_URL } from "../../../../lib/site";

export const prerender = false;

/** A topic's newest posts, as visitors see it. */
export const GET: APIRoute = async ({ params, site, rewrite }) => {
  const db = await getDb();
  const id = parseTopicSegment(params.topic ?? "");
  const topic = id === null ? undefined : await getTopic(db, id);
  const tree = await loadTree(db);
  const node = topic ? tree.get(topic.forumId) : undefined;
  if (
    !topic ||
    !node ||
    !can(null, "forum.view", tree.place(node.forum), topic)
  )
    return rewrite("/404");
  return postsFeed(db, { topic, forum: node.forum, site: site ?? SITE_URL });
};
