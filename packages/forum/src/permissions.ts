/**
 * Who may do what, in one place: every check in the forum goes through `can`.
 *
 * People belong to groups. Some are worked out from the account (guest: signed
 * out; newcomer: signed in but not yet trusted; member: trusted; admin: the site's
 * admins), the rest are given (moderator, and the admin's own groups). Each group
 * allows a set of FORUM_PERMISSIONS; a forum can allow or deny any of them for any
 * group, and its subforums follow unless they say otherwise. The caller resolves
 * that into `ForumPlace.rules` (apps/web's lib/forum/tree.ts); this file only reads
 * it. Someone may do a thing if any of their groups may.
 *
 * Moderators are people whose group may "moderate" there, or who are assigned to the
 * forum or one above it. The admin may do everything, always.
 */

export const FORUM_PERMISSIONS = {
  "forum.view": { label: "See the forum and its topics", group: "Reading" },
  "topic.create": { label: "Start topics", group: "Writing" },
  "topic.reply": { label: "Reply to topics", group: "Writing" },
  "post.edit-own": {
    label: "Edit their own posts (within the group’s edit window)",
    group: "Writing",
  },
  "post.delete-own": { label: "Delete their own posts", group: "Writing" },
  "post.skip-review": {
    label: "Post without waiting for approval (where only newcomers wait)",
    group: "Writing",
  },
  "post.report": { label: "Report posts", group: "Writing" },
  "post.react": { label: "React to posts", group: "Writing" },
  "post.vote": { label: "Vote on answers (Q&A forums)", group: "Writing" },
  "poll.create": { label: "Add polls to their topics", group: "Writing" },
  "post.attach": { label: "Attach files to posts", group: "Writing" },
  moderate: {
    label:
      "Moderate: approve, hide, delete, pin, lock, move, merge, split, see edit history, ban",
    group: "Moderation",
  },
} as const;

export type ForumPermission = keyof typeof FORUM_PERMISSIONS;

export const PERMISSION_KEYS = Object.keys(
  FORUM_PERMISSIONS,
) as readonly ForumPermission[];

export function isForumPermission(value: string): value is ForumPermission {
  return Object.hasOwn(FORUM_PERMISSIONS, value);
}

export type PermissionSet = Readonly<Partial<Record<ForumPermission, boolean>>>;

/** A group as the rules need it: its slug, what it allows, its edit window. */
export interface GroupDefinition {
  slug: string;
  name: string;
  description: string;
  /** Shown next to its members' names on posts, e.g. "Moderator". */
  title: string | null;
  permissions: PermissionSet;
  /** How long after posting its members may edit (minutes); null: always. */
  editWindowMinutes: number | null;
}

const every = (allowed: boolean): PermissionSet =>
  Object.fromEntries(PERMISSION_KEYS.map((key) => [key, allowed]));

const writing: PermissionSet = {
  "forum.view": true,
  "topic.create": true,
  "topic.reply": true,
  "post.edit-own": true,
  "post.delete-own": true,
  "post.report": true,
  "post.react": true,
  "post.vote": true,
  "poll.create": true,
  "post.attach": true,
};

/**
 * The groups every forum has. Their permissions and edit windows are the defaults
 * the migration writes; the admin changes them from /admin/forum/groups/.
 */
export const BUILT_IN_GROUPS = [
  {
    slug: "guest",
    name: "Guests",
    description: "People who aren’t signed in.",
    title: null,
    permissions: { "forum.view": true },
    editWindowMinutes: null,
  },
  {
    slug: "newcomer",
    name: "Newcomers",
    description:
      "Signed in, but none of their posts or comments approved yet. Where newcomers wait for approval, theirs do.",
    title: null,
    permissions: writing,
    editWindowMinutes: 60,
  },
  {
    slug: "member",
    name: "Members",
    description:
      "Signed in and trusted: one of their posts or comments was approved.",
    title: null,
    permissions: { ...writing, "post.skip-review": true },
    editWindowMinutes: 24 * 60,
  },
  {
    slug: "moderator",
    name: "Moderators",
    description: "People the admin adds. They moderate every forum.",
    title: "Moderator",
    permissions: every(true),
    editWindowMinutes: null,
  },
  {
    slug: "admin",
    name: "Admins",
    description: "The site’s admins. They can do everything, everywhere.",
    title: "Admin",
    permissions: every(true),
    editWindowMinutes: null,
  },
] as const satisfies readonly GroupDefinition[];

export type BuiltInGroup = (typeof BUILT_IN_GROUPS)[number]["slug"];

/** Groups worked out from the account: nobody is added to these by hand. */
export const AUTOMATIC_GROUPS: ReadonlySet<string> = new Set([
  "guest",
  "newcomer",
  "member",
  "admin",
]);

/** Someone signed in, as the forum needs to know them. Null: a visitor. */
export interface ForumViewer {
  id: string;
  admin: boolean;
  /** Trusted by the admin (users.trusted_at), shared with comments. */
  trusted: boolean;
  blocked: boolean;
  /** The groups they were added to (moderator, the admin's own), by slug. */
  groups: readonly string[];
  /** Banned from posting in the forum right now. */
  banned: boolean;
  /** How long after posting they may edit (ms, from their groups); null: always. */
  editWindowMs: number | null;
}

/** Every group someone is in, the automatic ones first. */
export function groupsOf(viewer: ForumViewer | null): string[] {
  if (!viewer) return ["guest"];
  return [
    viewer.trusted ? "member" : "newcomer",
    ...(viewer.admin ? ["admin"] : []),
    ...viewer.groups,
  ];
}

/** The longest edit window among some groups (null wins: no limit). */
export function editWindowOf(
  groups: readonly string[],
  definitions: ReadonlyMap<string, Pick<GroupDefinition, "editWindowMinutes">>,
): number | null {
  let longest = 0;
  for (const slug of groups) {
    const definition = definitions.get(slug);
    if (!definition) continue;
    if (definition.editWindowMinutes === null) return null;
    longest = Math.max(longest, definition.editWindowMinutes);
  }
  return longest * 60_000;
}

/** What each group may do in a forum, after the forum's (and its parents') overrides. */
export type ForumRules = Readonly<Record<string, PermissionSet>>;

/** The built-in groups' defaults, for places nobody resolved rules for. */
export const DEFAULT_RULES: ForumRules = Object.fromEntries(
  BUILT_IN_GROUPS.map((group) => [group.slug, group.permissions]),
);

export interface ForumPlace {
  id: number;
  kind: "category" | "forum";
  locked: boolean;
  hidden: boolean;
  moderation: "none" | "newcomers" | "all";
  /** Accounts assigned to moderate this forum or one above it (ids). */
  moderators?: readonly string[];
  /** Resolved permissions per group slug; DEFAULT_RULES when left out. */
  rules?: ForumRules;
}

export interface TopicPlace {
  locked: boolean;
  /** Not yet approved, or hidden: only its author (pending) and moderators see it. */
  state: "pending" | "published" | "hidden";
  authorId: string | null;
}

export interface PostPlace {
  authorId: string | null;
  /** For the edit window. */
  createdAt?: Date;
}

/** Whether any of the viewer's groups allows `permission` in this forum. */
export function allows(
  viewer: ForumViewer | null,
  permission: ForumPermission,
  forum: ForumPlace,
): boolean {
  if (viewer?.admin && !viewer.blocked) return true;
  const rules = forum.rules ?? DEFAULT_RULES;
  return groupsOf(viewer).some((slug) => rules[slug]?.[permission] === true);
}

/** Moderates this forum (and everything in it). */
export function moderates(viewer: ForumViewer | null, forum: ForumPlace) {
  if (viewer === null || viewer.blocked) return false;
  return (
    allows(viewer, "moderate", forum) ||
    (forum.moderators?.includes(viewer.id) ?? false)
  );
}

/**
 * Whether the viewer may do `permission` in `forum` (and, for things done to a
 * topic or post, to that one). `now` is for edit windows.
 */
export function can(
  viewer: ForumViewer | null,
  permission: ForumPermission,
  forum: ForumPlace,
  topic?: TopicPlace,
  post?: PostPlace,
  now: Date = new Date(),
): boolean {
  const mod = moderates(viewer, forum);
  if (forum.hidden && !mod) return false;
  const member = viewer !== null && !viewer.blocked;
  const writer = member && !viewer.banned;
  const allowed = (key: ForumPermission) => mod || allows(viewer, key, forum);
  const own = (authorId: string | null | undefined) =>
    member && authorId !== null && authorId === viewer.id;
  const topicVisible =
    !topic ||
    topic.state === "published" ||
    mod ||
    (topic.state === "pending" && own(topic.authorId));
  const open = mod || (!forum.locked && !topic?.locked);

  switch (permission) {
    case "forum.view":
      return allowed("forum.view") && topicVisible;
    case "moderate":
      return mod;
    case "topic.create":
      return (
        writer &&
        forum.kind === "forum" &&
        allowed("topic.create") &&
        (!forum.locked || mod)
      );
    case "topic.reply":
      return (
        writer &&
        forum.kind === "forum" &&
        topic !== undefined &&
        topicVisible &&
        topic.state !== "hidden" &&
        allowed("topic.reply") &&
        open
      );
    case "post.edit-own": {
      if (!(writer && own(post?.authorId) && topicVisible && open))
        return false;
      if (mod) return true;
      if (!allowed("post.edit-own")) return false;
      const window = viewer.editWindowMs;
      return (
        window === null ||
        post?.createdAt === undefined ||
        now.getTime() - post.createdAt.getTime() <= window
      );
    }
    case "post.delete-own":
      return (
        own(post?.authorId) &&
        topicVisible &&
        open &&
        allowed("post.delete-own")
      );
    case "post.report":
      return member && topicVisible && allowed("post.report");
    case "poll.create":
      return writer && forum.kind === "forum" && allowed("poll.create");
    case "post.attach":
      return writer && forum.kind === "forum" && allowed("post.attach");
    case "post.react":
    case "post.vote":
      return (
        writer &&
        topicVisible &&
        topic?.state !== "hidden" &&
        !own(post?.authorId) &&
        allowed(permission)
      );
    case "post.skip-review":
      return (
        mod ||
        (member &&
          (forum.moderation === "none" ||
            (forum.moderation === "newcomers" &&
              allows(viewer, "post.skip-review", forum))))
      );
  }
}

/** One forum's choice for one group: allow or deny a permission there. */
export interface PermissionOverride {
  group: string;
  permission: ForumPermission;
  allowed: boolean;
}

/**
 * What each group may do in a forum: its defaults, then each forum's overrides from
 * the top of the tree down to this one (the nearest wins).
 */
export function resolveRules(
  groups: readonly Pick<GroupDefinition, "slug" | "permissions">[],
  overridesFromTop: readonly (readonly PermissionOverride[])[],
): ForumRules {
  const rules: Record<string, Partial<Record<ForumPermission, boolean>>> = {};
  for (const group of groups) rules[group.slug] = { ...group.permissions };
  for (const level of overridesFromTop) {
    for (const override of level) {
      const set = rules[override.group];
      if (set) set[override.permission] = override.allowed;
    }
  }
  return rules;
}
