import type { APIRoute } from "astro";
import { getDb } from "../../../lib/db";
import { topicsFeed } from "../../../lib/forum/feeds";
import { loadTree } from "../../../lib/forum/store";
import { SITE_URL } from "../../../lib/site";

export const prerender = false;

/** New topics in one forum, as visitors see it. */
export const GET: APIRoute = async ({ params, site, rewrite }) => {
  const db = await getDb();
  const tree = await loadTree(db);
  const node = tree.find(params.forum ?? "");
  if (node?.forum.kind !== "forum" || !tree.canView(node.forum, null))
    return rewrite("/404");
  return topicsFeed(db, { tree, forum: node.forum, site: site ?? SITE_URL });
};
