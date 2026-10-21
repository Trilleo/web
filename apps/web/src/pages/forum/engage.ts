import { can, isReaction, parseTags, type ForumPlace } from "@trilleo/forum";
import type { APIRoute } from "astro";
import { requireUser } from "../../lib/auth/guard";
import { noStoreRedirect, safeNextPath } from "../../lib/auth/redirect";
import { field, parseId } from "../../lib/comments/form";
import { getDb } from "../../lib/db";
import { logAction } from "../../lib/forum/log";
import { markAllRead } from "../../lib/forum/reads";
import {
  acceptAnswer,
  react,
  reactionsFor,
  vote,
} from "../../lib/forum/reactions";
import { unwatch, watch } from "../../lib/forum/notifications";
import {
  forumViewer,
  getPost,
  getTopic,
  loadTree,
} from "../../lib/forum/store";
import { setSolved, setTopicLabels } from "../../lib/forum/tags";

export const prerender = false;

/**
 * Members' buttons that aren't writing: POST with `do` and `back`.
 *
 * - react (`post`, `reaction`), vote (`post`, `value` 1 or -1): on others' posts.
 * - accept / unaccept (`post`): in Q&A forums, the asker or a moderator.
 * - solved / unsolved (`topic`): the asker or a moderator.
 * - watch / unwatch (`topic` or `forum`).
 * - read-all: marks every topic read.
 * - labels (`topic`, `prefix`, `tags`): a moderator, or the asker.
 *
 * Asked for JSON (the reactions' script), react answers with the post's reactions.
 */
export const POST: APIRoute = async (context) => {
  const user = requireUser(context);
  if (user instanceof Response) return user;
  const form = await context.request.formData();
  const action = field(form, "do");
  const back = safeNextPath(field(form, "back") || "/forum/");
  const json = (context.request.headers.get("accept") ?? "").includes(
    "application/json",
  );
  const done = () => noStoreRedirect(back, 303);
  const refuse = () =>
    json
      ? Response.json({ error: "You can’t do that here." }, { status: 403 })
      : new Response("You can’t do that here.", {
          status: 403,
          headers: { "Content-Type": "text/plain; charset=utf-8" },
        });
  const db = await getDb();

  if (action === "read-all") {
    await markAllRead(db, user.id);
    return done();
  }

  const tree = await loadTree(db);
  const viewer = await forumViewer(db, tree, user);

  // Watching a forum.
  const forumId = parseId(field(form, "forum"));
  if (forumId !== null && (action === "watch" || action === "unwatch")) {
    const forum = tree.get(forumId)?.forum;
    if (!forum || !tree.canView(forum, viewer)) return refuse();
    if (action === "watch") await watch(db, user.id, { forumId });
    else await unwatch(db, user.id, { forumId });
    return done();
  }

  // Everything else is about a post or a topic.
  const postId = parseId(field(form, "post"));
  const post = postId === null ? undefined : await getPost(db, postId);
  const topicId = post?.topicId ?? parseId(field(form, "topic"));
  const topic = topicId === null ? undefined : await getTopic(db, topicId);
  const node = topic ? tree.get(topic.forumId) : undefined;
  if (!topic || !node) return refuse();
  const place: ForumPlace = tree.place(node.forum);
  if (!can(viewer, "forum.view", place, topic)) return refuse();
  const mod = tree.moderates(node.forum, viewer);
  const asker = topic.authorId === user.id;

  switch (action) {
    case "react": {
      const reaction = field(form, "reaction");
      if (
        !post ||
        !isReaction(reaction) ||
        !can(viewer, "post.react", place, topic, post)
      )
        return refuse();
      await react(db, { post, userId: user.id, reaction });
      if (json)
        return Response.json(
          {
            reactions:
              (await reactionsFor(db, [post.id], user.id)).get(post.id) ?? [],
          },
          { headers: { "Cache-Control": "private, no-store" } },
        );
      return done();
    }
    case "vote": {
      const value = field(form, "value") === "-1" ? -1 : 1;
      if (
        !post ||
        node.forum.layout !== "qa" ||
        post.id === topic.firstPostId ||
        !can(viewer, "post.vote", place, topic, post)
      )
        return refuse();
      await vote(db, { post, userId: user.id, value });
      return done();
    }
    case "accept":
    case "unaccept": {
      if (node.forum.layout !== "qa" || !(asker || mod) || !post)
        return refuse();
      await acceptAnswer(db, {
        topic,
        post: action === "accept" ? post : null,
        by: user.id,
      });
      return done();
    }
    case "solved":
    case "unsolved": {
      if (!(asker || mod) || user.blockedAt) return refuse();
      await setSolved(db, topic.id, action === "solved");
      if (!asker)
        await logAction(db, {
          actorId: user.id,
          action: "solved",
          forumId: topic.forumId,
          topicId: topic.id,
          detail: action === "solved" ? "Solved" : "Not solved",
        });
      return done();
    }
    case "watch":
      await watch(db, user.id, { topicId: topic.id });
      return done();
    case "unwatch":
      await unwatch(db, user.id, { topicId: topic.id });
      return done();
    case "labels": {
      if (!(
        mod ||
        (asker &&
          can(viewer, "post.edit-own", place, topic, { authorId: user.id }))
      ))
        return refuse();
      await setTopicLabels(db, topic, {
        prefixId: parseId(field(form, "prefix")),
        tags: parseTags(field(form, "tags")),
      });
      if (!asker)
        await logAction(db, {
          actorId: user.id,
          action: "labels",
          forumId: topic.forumId,
          topicId: topic.id,
        });
      return done();
    }
  }
  return refuse();
};
