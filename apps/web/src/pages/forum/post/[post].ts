import { can, postAnchor, topicPath } from "@trilleo/forum";
import type { APIRoute } from "astro";
import { parseId } from "../../../lib/comments/form";
import { getDb } from "../../../lib/db";
import {
  forumViewer,
  getPost,
  getTopic,
  loadTree,
  pageOfPost,
} from "../../../lib/forum/store";

export const prerender = false;

/**
 * GET /forum/post/<id>/: a post's permanent link. Sends the visitor to the page of
 * its topic it's on now, at the post.
 */
export const GET: APIRoute = async (context) => {
  const db = await getDb();
  const id = parseId(context.params.post ?? "");
  const post = id === null ? undefined : await getPost(db, id);
  const topic = post ? await getTopic(db, post.topicId) : undefined;
  const tree = await loadTree(db);
  const viewer = await forumViewer(db, tree, context.locals.user);
  const node = topic ? tree.get(topic.forumId) : undefined;
  if (!post || !topic || !node) return context.rewrite("/404");
  const place = tree.place(node.forum);
  const mod = tree.moderates(node.forum, viewer);
  const visible =
    can(viewer, "forum.view", place, topic) &&
    can(viewer, "forum.view", place, {
      ...topic,
      state: post.state,
      authorId: post.authorId,
    });
  if (!visible) return context.rewrite("/404");
  const page = await pageOfPost(
    db,
    post,
    topic,
    node.forum.layout,
    viewer,
    mod,
  );
  return new Response(null, {
    status: 302,
    headers: {
      Location: `${topicPath(node.forum, topic, page)}#${postAnchor(post)}`,
      "Cache-Control": "private, no-store",
    },
  });
};
