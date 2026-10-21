/**
 * Loading who may do what: the tree with its groups, overrides and moderators
 * (`loadTree`), and a signed-in person as the rules see them (`forumViewer`: their
 * groups, whether they're banned, their edit window).
 */
import {
  forumBans,
  forumGroupMembers,
  forumGroups,
  forumModerators,
  forumPermissions,
  forums,
  type Database,
  type ForumBan,
  type ForumGroup,
  type User,
} from "@trilleo/db";
import {
  editWindowOf,
  groupsOf,
  isForumPermission,
  type ForumViewer,
} from "@trilleo/forum";
import { and, asc, desc, eq, gt, isNull, or, sql } from "drizzle-orm";
import { isAdmin } from "../auth/guard";
import { ForumTree, type TreeGroup } from "./tree";

type ViewerUser = Pick<
  User,
  "id" | "email" | "githubId" | "trustedAt" | "blockedAt"
>;

export function treeGroup(row: ForumGroup): TreeGroup {
  const permissions = Object.fromEntries(
    Object.entries(row.permissions).filter(([key]) => isForumPermission(key)),
  );
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    title: row.title,
    permissions,
    editWindowMinutes: row.editWindowMinutes,
    builtIn: row.builtIn,
  };
}

export async function loadTree(db: Database): Promise<ForumTree> {
  const [forumRows, groupRows, overrideRows, moderatorRows] = await Promise.all(
    [
      db.select().from(forums),
      db
        .select()
        .from(forumGroups)
        .orderBy(asc(forumGroups.sort), asc(forumGroups.id)),
      db
        .select({
          forumId: forumPermissions.forumId,
          group: forumGroups.slug,
          permission: forumPermissions.permission,
          allowed: forumPermissions.allowed,
        })
        .from(forumPermissions)
        .innerJoin(forumGroups, eq(forumGroups.id, forumPermissions.groupId)),
      db
        .select({
          forumId: forumModerators.forumId,
          userId: forumModerators.userId,
        })
        .from(forumModerators),
    ],
  );
  return new ForumTree(forumRows, {
    groups: groupRows.map(treeGroup),
    overrides: overrideRows.flatMap((row) =>
      isForumPermission(row.permission)
        ? [{ ...row, permission: row.permission }]
        : [],
    ),
    moderators: moderatorRows,
  });
}

/** Their ban, if one is in force now. */
export async function activeBan(
  db: Database,
  userId: string,
  now = new Date(),
): Promise<ForumBan | undefined> {
  const [ban] = await db
    .select()
    .from(forumBans)
    .where(
      and(
        eq(forumBans.userId, userId),
        isNull(forumBans.liftedAt),
        or(isNull(forumBans.until), gt(forumBans.until, now)),
      ),
    )
    .orderBy(desc(forumBans.createdAt))
    .limit(1);
  return ban;
}

/** The groups someone was put in by hand, by slug. */
export async function memberGroups(
  db: Database,
  userId: string,
): Promise<string[]> {
  const rows = await db
    .select({ slug: forumGroups.slug })
    .from(forumGroupMembers)
    .innerJoin(forumGroups, eq(forumGroups.id, forumGroupMembers.groupId))
    .where(eq(forumGroupMembers.userId, userId));
  return rows.map((row) => row.slug);
}

/** How the forum sees a signed-in person (null: a visitor). */
export async function forumViewer(
  db: Database,
  tree: ForumTree,
  user: ViewerUser | null | undefined,
  now = new Date(),
): Promise<ForumViewer | null> {
  if (!user) return null;
  const [groups, ban] = await Promise.all([
    memberGroups(db, user.id),
    activeBan(db, user.id, now),
  ]);
  const viewer: ForumViewer = {
    id: user.id,
    admin: isAdmin(user),
    trusted: user.trustedAt !== null,
    blocked: user.blockedAt !== null,
    groups,
    banned: ban !== undefined,
    editWindowMs: null,
  };
  viewer.editWindowMs = editWindowOf(groupsOf(viewer), tree.groups);
  return viewer;
}

/**
 * Moderates every forum: the admin, or someone whose group may moderate by default
 * (the Moderator group). Pictures' reports and bans' lists are theirs.
 */
export function moderatesEverywhere(
  tree: ForumTree,
  viewer: ForumViewer | null,
): boolean {
  if (!viewer || viewer.blocked) return false;
  if (viewer.admin) return true;
  return groupsOf(viewer).some(
    (slug) => tree.groups.get(slug)?.permissions.moderate === true,
  );
}

/**
 * Moderates any forum at all (for the account menu's "Forum moderation" link):
 * the admin, someone assigned to a forum, or in a group that may moderate somewhere.
 */
export async function isForumModerator(
  db: Database,
  user: ViewerUser,
): Promise<boolean> {
  if (user.blockedAt) return false;
  if (isAdmin(user)) return true;
  const [assigned] = await db
    .select({ forumId: forumModerators.forumId })
    .from(forumModerators)
    .where(eq(forumModerators.userId, user.id))
    .limit(1);
  if (assigned) return true;
  const [grouped] = await db
    .select({ id: forumGroups.id })
    .from(forumGroupMembers)
    .innerJoin(forumGroups, eq(forumGroups.id, forumGroupMembers.groupId))
    .where(
      and(
        eq(forumGroupMembers.userId, user.id),
        sql`${forumGroups.permissions} ->> 'moderate' = 'true'`,
      ),
    )
    .limit(1);
  if (grouped) return true;
  const [overridden] = await db
    .select({ forumId: forumPermissions.forumId })
    .from(forumPermissions)
    .innerJoin(
      forumGroupMembers,
      eq(forumGroupMembers.groupId, forumPermissions.groupId),
    )
    .where(
      and(
        eq(forumGroupMembers.userId, user.id),
        eq(forumPermissions.permission, "moderate"),
        eq(forumPermissions.allowed, true),
      ),
    )
    .limit(1);
  return overridden !== undefined;
}
