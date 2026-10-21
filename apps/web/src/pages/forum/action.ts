import { forumPath, isBanLength, topicPath } from "@trilleo/forum";
import type { APIRoute } from "astro";
import { requireUser } from "../../lib/auth/guard";
import { noStoreRedirect, safeNextPath } from "../../lib/auth/redirect";
import { field, parseId } from "../../lib/comments/form";
import { getDb } from "../../lib/db";
import { postErrorMessage } from "../../lib/forum/messages";
import {
  banUser,
  mergeTopic,
  moveTopic,
  parseTopicReference,
  splitPosts,
} from "../../lib/forum/moderation";
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

const text = (body: string, status: number) =>
  new Response(body, {
    status,
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });

/**
 * The buttons on posts and topics, as POST forms: `post` (an id), `action`, and
 * `back` (where to return, with ?done= or ?error=). Anyone may delete their own
 * post (`delete`); the rest are moderators': approve, hide, unhide, lock, unlock,
 * pin-*, move (`forum`), merge (`into`: an id or address), split (`posts`, `title`,
 * `forum`) and ban (`length`, `reason`, banning the post's author).
 */
export const POST: APIRoute = async (context) => {
  const user = requireUser(context);
  if (user instanceof Response) return user;
  const form = await context.request.formData();
  const db = await getDb();
  const id = parseId(field(form, "post"));
  const post = id === null ? undefined : await getPost(db, id);
  const topic = post ? await getTopic(db, post.topicId) : undefined;
  const tree = await loadTree(db);
  const node = topic ? tree.get(topic.forumId) : undefined;
  if (!post || !topic || !node)
    return text("That post isn’t there any more.", 404);
  const { forum } = node;
  const mod = tree.moderates(forum, await forumViewer(db, tree, user));
  const action = field(form, "action");

  const back = new URL(
    safeNextPath(field(form, "back") || "/forum/"),
    context.url,
  );
  back.searchParams.delete("done");
  back.searchParams.delete("error");
  const finish = (key: "done" | "error", value: string, to = back) => {
    to.searchParams.set(key, value);
    return noStoreRedirect(to.pathname + to.search + to.hash, 303);
  };
  const go = (path: string) => noStoreRedirect(path, 303);

  if (action === "delete" && !mod) {
    const result = await deletePost(db, { tree, forum, topic, post, by: user });
    if (!result.ok) return text("You can’t do that here.", 403);
    return go(
      result.value.topicDeleted ? forumPath(forum) : topicPath(forum, topic),
    );
  }
  if (!mod) return text("You can’t do that here.", 403);

  switch (action) {
    case "move": {
      const to = tree.get(parseId(field(form, "forum")) ?? 0)?.forum;
      if (to?.kind !== "forum")
        return finish("error", "Choose a forum (not a category).");
      if (!tree.moderates(to, await forumViewer(db, tree, user)))
        return finish("error", "You don’t moderate that forum.");
      await moveTopic(db, { topic, to, by: user });
      return go(topicPath(to, topic));
    }
    case "merge": {
      const intoId = parseTopicReference(field(form, "into"));
      const into = intoId === null ? undefined : await getTopic(db, intoId);
      const intoNode = into ? tree.get(into.forumId) : undefined;
      if (!into || !intoNode || into.id === topic.id)
        return finish("error", "There’s no such topic to merge into.");
      if (!tree.moderates(intoNode.forum, await forumViewer(db, tree, user)))
        return finish("error", "You don’t moderate that topic’s forum.");
      await mergeTopic(db, { from: topic, into, by: user });
      return go(topicPath(intoNode.forum, into));
    }
    case "split": {
      const ids = form
        .getAll("posts")
        .flatMap((value) =>
          typeof value === "string"
            ? [parseId(value)].filter((n) => n !== null)
            : [],
        );
      const to = tree.get(parseId(field(form, "forum")) ?? 0)?.forum ?? forum;
      if (ids.length === 0)
        return finish("error", "Tick the posts to split off first.");
      const result = await splitPosts(db, {
        topic,
        postIds: ids,
        title: field(form, "title"),
        to,
        by: user,
      });
      if (!result.ok)
        return finish(
          "error",
          result.error === "forbidden"
            ? "Choose some posts, but not all of them, and a forum."
            : postErrorMessage(result.error),
        );
      return go(topicPath(to, result.value));
    }
    case "ban": {
      const length = field(form, "length");
      if (!post.authorId || !isBanLength(length))
        return finish("error", "Choose how long.");
      const ban = await banUser(db, {
        userId: post.authorId,
        length,
        reason: field(form, "reason"),
        by: user,
      });
      if (!ban) return finish("error", "Say why (they’ll see it).");
      back.hash = `post-${String(post.id)}`;
      return finish("done", "banned");
    }
  }

  if (!isModerationAction(action)) return finish("error", "Unknown action.");
  await moderatePost(db, {
    topic,
    post,
    action,
    by: user.id,
    reason: field(form, "reason").trim().slice(0, 500),
  });
  // A deleted topic has no page to come back to (unless they came from a queue).
  const deletedTopic = action === "delete" && post.id === topic.firstPostId;
  if (
    deletedTopic &&
    !back.pathname.startsWith("/admin/") &&
    !back.pathname.startsWith("/forum/moderate/")
  )
    return go(forumPath(forum));
  return go(back.pathname + back.search + back.hash);
};
