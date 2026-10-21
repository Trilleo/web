/**
 * Who may do what, in one place: every check in the forum goes through `can`. Each
 * permission is listed in FORUM_PERMISSIONS (a key, what it means, and which
 * group of the admin's matrix it belongs to), so a new feature adds its row here.
 *
 * For now there are three kinds of people: the admin (who moderates everything),
 * signed-in members, and visitors. User groups and per-forum moderators will decide
 * `moderates` instead, without the callers changing.
 */

export const FORUM_PERMISSIONS = {
  "forum.view": { label: "See the forum and its topics", group: "Reading" },
  "topic.create": { label: "Start topics", group: "Writing" },
  "topic.reply": { label: "Reply to topics", group: "Writing" },
  "post.edit-own": { label: "Edit their own posts", group: "Writing" },
  "post.delete-own": { label: "Delete their own posts", group: "Writing" },
  "post.skip-review": {
    label: "Post without waiting for approval",
    group: "Writing",
  },
  moderate: {
    label: "Moderate: approve, hide, delete, pin and lock",
    group: "Moderation",
  },
} as const;

export type ForumPermission = keyof typeof FORUM_PERMISSIONS;

/** Someone signed in, as the forum needs to know them. Null: a visitor. */
export interface ForumViewer {
  id: string;
  admin: boolean;
  /** Trusted by the admin (users.trusted_at), shared with comments. */
  trusted: boolean;
  blocked: boolean;
}

export interface ForumPlace {
  id: number;
  kind: "category" | "forum";
  locked: boolean;
  hidden: boolean;
  moderation: "none" | "newcomers" | "all";
  /** Accounts that moderate this forum besides the admin (ids), as the caller found them. */
  moderators?: readonly string[];
}

export interface TopicPlace {
  locked: boolean;
  /** Not yet approved, or hidden: only its author (pending) and moderators see it. */
  state: "pending" | "published" | "hidden";
  authorId: string | null;
}

export interface PostPlace {
  authorId: string | null;
}

/** Moderates this forum (and everything in it). */
export function moderates(viewer: ForumViewer | null, forum: ForumPlace) {
  if (viewer === null || viewer.blocked) return false;
  return viewer.admin || (forum.moderators?.includes(viewer.id) ?? false);
}

/**
 * Whether the viewer may do `permission` in `forum` (and, for things done to a
 * topic or post, to that one).
 */
export function can(
  viewer: ForumViewer | null,
  permission: ForumPermission,
  forum: ForumPlace,
  topic?: TopicPlace,
  post?: PostPlace,
): boolean {
  const mod = moderates(viewer, forum);
  if (forum.hidden && !mod) return false;
  const member = viewer !== null && !viewer.blocked;
  const own = (authorId: string | null | undefined) =>
    member && authorId !== null && authorId === viewer.id;
  const topicVisible =
    !topic ||
    topic.state === "published" ||
    mod ||
    (topic.state === "pending" && own(topic.authorId));

  switch (permission) {
    case "forum.view":
      return topicVisible;
    case "moderate":
      return mod;
    case "topic.create":
      return member && forum.kind === "forum" && (!forum.locked || mod);
    case "topic.reply":
      return (
        member &&
        forum.kind === "forum" &&
        topic !== undefined &&
        topicVisible &&
        topic.state !== "hidden" &&
        (mod || (!forum.locked && !topic.locked))
      );
    case "post.edit-own":
    case "post.delete-own":
      return (
        own(post?.authorId) &&
        topicVisible &&
        (mod || (!forum.locked && !topic?.locked))
      );
    case "post.skip-review":
      return (
        mod ||
        (member &&
          (forum.moderation === "none" ||
            (forum.moderation === "newcomers" && viewer.trusted)))
      );
  }
}
