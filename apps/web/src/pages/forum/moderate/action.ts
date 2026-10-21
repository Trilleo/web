import type { APIRoute } from "astro";
import { requireUser } from "../../../lib/auth/guard";
import { noStoreRedirect, safeNextPath } from "../../../lib/auth/redirect";
import { field, parseId, parseUserId } from "../../../lib/comments/form";
import { getDb } from "../../../lib/db";
import { moderatesEverywhere } from "../../../lib/forum/access";
import {
  isReportDecision,
  resolveReports,
} from "../../../lib/forum/moderation";
import {
  forumViewer,
  getPost,
  getTopic,
  loadTree,
} from "../../../lib/forum/store";

export const prerender = false;

/**
 * A moderator settles the reports about a post (`post`: hide, delete, dismiss) or a
 * picture (`user`: remove-avatar, dismiss). Back to `back`.
 */
export const POST: APIRoute = async (context) => {
  const user = requireUser(context);
  if (user instanceof Response) return user;
  const form = await context.request.formData();
  const db = await getDb();
  const tree = await loadTree(db);
  const viewer = await forumViewer(db, tree, user);
  const decision = field(form, "decision");
  const back = safeNextPath(
    field(form, "back") || "/forum/moderate/?tab=reports",
  );
  const forbidden = () =>
    new Response("You can’t do that here.", {
      status: 403,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  if (!isReportDecision(decision)) return forbidden();

  const postId = parseId(field(form, "post"));
  if (postId !== null) {
    const post = await getPost(db, postId);
    const topic = post ? await getTopic(db, post.topicId) : undefined;
    const node = topic ? tree.get(topic.forumId) : undefined;
    if (!post || !topic || !node || !tree.moderates(node.forum, viewer))
      return forbidden();
    await resolveReports(db, {
      target: { kind: "post", post, topic },
      decision,
      by: user,
    });
    return noStoreRedirect(back, 303);
  }
  const userId = parseUserId(field(form, "user"));
  if (!userId || !moderatesEverywhere(tree, viewer)) return forbidden();
  await resolveReports(db, {
    target: { kind: "avatar", userId },
    decision,
    by: user,
  });
  return noStoreRedirect(back, 303);
};
