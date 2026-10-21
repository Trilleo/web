import { can, isReportReason, postPath } from "@trilleo/forum";
import type { APIRoute } from "astro";
import { requireUser } from "../../lib/auth/guard";
import { noStoreRedirect, safeNextPath } from "../../lib/auth/redirect";
import { field, parseId, parseUserId } from "../../lib/comments/form";
import { getDb } from "../../lib/db";
import {
  REPORT_ERROR_MESSAGES,
  createReport,
} from "../../lib/forum/moderation";
import {
  forumViewer,
  getPost,
  getTopic,
  loadTree,
} from "../../lib/forum/store";
import { profileHref } from "../../lib/profile/profile";
import { users } from "@trilleo/db";
import { eq } from "drizzle-orm";

export const prerender = false;

/**
 * POST /forum/report: a signed-in member reports a post (`post`) or someone's
 * profile picture (`user`), with a `reason` and an optional `note`. Back to the
 * post or profile with ?reported=1 or ?report-error=<message>.
 */
export const POST: APIRoute = async (context) => {
  const user = requireUser(context);
  if (user instanceof Response) return user;
  const form = await context.request.formData();
  const db = await getDb();
  const reason = field(form, "reason");
  const note = field(form, "note");
  const back = (path: string, key: string, value: string) => {
    const url = new URL(safeNextPath(path), context.url);
    url.searchParams.set(key, value);
    return noStoreRedirect(url.pathname + url.search + url.hash, 303);
  };

  const postId = parseId(field(form, "post"));
  if (postId !== null) {
    const post = await getPost(db, postId);
    const topic = post ? await getTopic(db, post.topicId) : undefined;
    const tree = await loadTree(db);
    const node = topic ? tree.get(topic.forumId) : undefined;
    const viewer = await forumViewer(db, tree, user);
    const place = node ? tree.place(node.forum) : undefined;
    if (
      !post ||
      !topic ||
      !place ||
      !can(viewer, "forum.view", place, topic) ||
      !can(viewer, "forum.view", place, {
        ...topic,
        state: post.state,
        authorId: post.authorId,
      })
    )
      return back(
        "/forum/",
        "report-error",
        REPORT_ERROR_MESSAGES["not-found"],
      );
    const where = field(form, "back") || postPath(post);
    if (!can(viewer, "post.report", place, topic))
      return back(where, "report-error", REPORT_ERROR_MESSAGES.forbidden);
    if (!isReportReason(reason))
      return back(where, "report-error", REPORT_ERROR_MESSAGES.empty);
    const result = await createReport(db, {
      reporter: user,
      reason,
      note,
      target: { kind: "post", post, topic },
    });
    return result.ok
      ? back(where, "reported", "1")
      : back(where, "report-error", REPORT_ERROR_MESSAGES[result.error]);
  }

  const userId = parseUserId(field(form, "user"));
  const [owner] = userId
    ? await db
        .select({
          id: users.id,
          username: users.username,
          avatarHash: users.avatarHash,
        })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1)
    : [];
  if (!owner?.avatarHash)
    return back("/forum/", "report-error", REPORT_ERROR_MESSAGES["not-found"]);
  const where = profileHref(owner.username);
  if (user.blockedAt)
    return back(where, "report-error", REPORT_ERROR_MESSAGES.forbidden);
  if (!isReportReason(reason))
    return back(where, "report-error", REPORT_ERROR_MESSAGES.empty);
  const result = await createReport(db, {
    reporter: user,
    reason,
    note,
    target: { kind: "avatar", userId: owner.id },
  });
  return result.ok
    ? back(where, "reported", "1")
    : back(where, "report-error", REPORT_ERROR_MESSAGES[result.error]);
};
