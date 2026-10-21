import { forumPath, topicPath } from "@trilleo/forum";
import type { APIRoute } from "astro";
import { requireUser } from "../../lib/auth/guard";
import { noStoreRedirect, safeNextPath } from "../../lib/auth/redirect";
import { field, parseId } from "../../lib/comments/form";
import { getDb } from "../../lib/db";
import {
  deletePost,
  forumViewer,
  getPost,
  getTopic,
  isModerationAction,
  loadTree,
  moderatePost,
} from "../../lib/forum/store";

export const prerender = false;

/**
 * The buttons on posts and topics, as POST forms: `post` (an id), `action`, and
 * `back` (where to return). Anyone may delete their own post (`delete`); the rest
 * (approve, hide, unhide, lock, unlock, pin-*) are moderators'. A deleted topic
 * returns to its forum.
 */
export const POST: APIRoute = async (context) => {
  const user = requireUser(context);
  if (user instanceof Response) return user;
  const form = await context.request.formData();
  const back = safeNextPath(field(form, "back") || "/forum/");
  const db = await getDb();
  const id = parseId(field(form, "post"));
  const post = id === null ? undefined : await getPost(db, id);
  const topic = post ? await getTopic(db, post.topicId) : undefined;
  const tree = await loadTree(db);
  const node = topic ? tree.get(topic.forumId) : undefined;
  if (!post || !topic || !node)
    return new Response("That post isn’t there any more.", {
      status: 404,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  const { forum } = node;
  const mod = tree.moderates(forum, forumViewer(user));
  const action = field(form, "action");
  const forbidden = () =>
    new Response("You can’t do that here.", {
      status: 403,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });

  if (action === "delete" && !mod) {
    const result = await deletePost(db, { tree, forum, topic, post, by: user });
    if (!result.ok) return forbidden();
    return noStoreRedirect(
      result.value.topicDeleted ? forumPath(forum) : topicPath(forum, topic),
      303,
    );
  }
  if (!mod || !isModerationAction(action)) return forbidden();
  await moderatePost(db, { topic, post, action });
  const deletedTopic = action === "delete" && post.id === topic.firstPostId;
  // A deleted topic has no page to come back to (unless they came from the queue).
  return noStoreRedirect(
    deletedTopic && !back.startsWith("/admin/") ? forumPath(forum) : back,
    303,
  );
};
