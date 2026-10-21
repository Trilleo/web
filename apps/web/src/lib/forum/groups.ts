/**
 * The admin's side of who may do what: groups (their permissions, edit window,
 * title, members), each forum's overrides, and the people assigned to moderate a
 * forum. Pages: /admin/forum/groups/[<id>/] and the forum's own admin page.
 */
import {
  forumGroupMembers,
  forumGroups,
  forumModerators,
  forumPermissions,
  users,
  type Database,
  type ForumGroup,
} from "@trilleo/db";
import {
  AUTOMATIC_GROUPS,
  PERMISSION_KEYS,
  type ForumPermission,
} from "@trilleo/forum";
import { and, asc, count, eq, inArray, max } from "drizzle-orm";
import { normalizeUsername } from "../auth/usernames";
import { field } from "../comments/form";
import { characterCount, cleanLine } from "../profile/profile";

export const GROUP_LIMITS = {
  name: 40,
  title: 30,
  description: 200,
  /** Edit windows, in minutes: up to a year. */
  editWindow: 525_600,
} as const;

const GROUP_SLUG = /^[a-z][a-z0-9-]{1,29}$/;

export async function listGroups(db: Database) {
  const [groups, counts] = await Promise.all([
    db
      .select()
      .from(forumGroups)
      .orderBy(asc(forumGroups.sort), asc(forumGroups.id)),
    db
      .select({ groupId: forumGroupMembers.groupId, members: count() })
      .from(forumGroupMembers)
      .groupBy(forumGroupMembers.groupId),
  ]);
  const byGroup = new Map(counts.map((row) => [row.groupId, row.members]));
  return groups.map((group) => ({
    group,
    members: byGroup.get(group.id) ?? 0,
    /** People are added by hand (not worked out from the account). */
    manual: !AUTOMATIC_GROUPS.has(group.slug),
  }));
}

export async function getGroup(
  db: Database,
  id: number,
): Promise<ForumGroup | undefined> {
  const [group] = await db
    .select()
    .from(forumGroups)
    .where(eq(forumGroups.id, id))
    .limit(1);
  return group;
}

export interface GroupDraft {
  name: string;
  slug: string;
  title: string;
  description: string;
  /** Minutes, as typed; "" for no limit. */
  editWindow: string;
  permissions: Partial<Record<ForumPermission, boolean>>;
}

export type GroupField =
  "name" | "slug" | "title" | "description" | "editWindow";

export function groupDraft(group?: ForumGroup): GroupDraft {
  return {
    name: group?.name ?? "",
    slug: group?.slug ?? "",
    title: group?.title ?? "",
    description: group?.description ?? "",
    editWindow:
      group === undefined
        ? "60"
        : group.editWindowMinutes === null
          ? ""
          : String(group.editWindowMinutes),
    permissions: Object.fromEntries(
      PERMISSION_KEYS.map((key) => [key, group?.permissions[key] === true]),
    ),
  };
}

export function readGroupForm(form: FormData): GroupDraft {
  return {
    name: field(form, "name"),
    slug: field(form, "slug").trim().toLowerCase(),
    title: field(form, "title"),
    description: field(form, "description"),
    editWindow: field(form, "editWindow").trim(),
    permissions: Object.fromEntries(
      PERMISSION_KEYS.map((key) => [key, field(form, `perm:${key}`) === "on"]),
    ),
  };
}

export interface GroupInput {
  name: string;
  slug: string;
  title: string | null;
  description: string;
  editWindowMinutes: number | null;
  permissions: Record<string, boolean>;
}

export async function validateGroup(
  db: Database,
  draft: GroupDraft,
  existing?: ForumGroup,
): Promise<
  | { ok: true; input: GroupInput }
  | { ok: false; errors: Partial<Record<GroupField, string>> }
> {
  const errors: Partial<Record<GroupField, string>> = {};
  const name = cleanLine(draft.name);
  if (!name) errors.name = "Give it a name.";
  else if (characterCount(name) > GROUP_LIMITS.name)
    errors.name = `Up to ${String(GROUP_LIMITS.name)} characters.`;
  const title = cleanLine(draft.title);
  if (characterCount(title) > GROUP_LIMITS.title)
    errors.title = `Up to ${String(GROUP_LIMITS.title)} characters.`;
  const description = cleanLine(draft.description);
  if (characterCount(description) > GROUP_LIMITS.description)
    errors.description = `Up to ${String(GROUP_LIMITS.description)} characters.`;

  // Built-in groups keep their slugs: the rules and the code know them by it.
  const slug = existing?.builtIn ? existing.slug : draft.slug;
  if (!existing?.builtIn) {
    if (!GROUP_SLUG.test(slug)) {
      errors.slug =
        "2–30 lower-case letters, digits and hyphens, starting with a letter.";
    } else {
      const [taken] = await db
        .select({ id: forumGroups.id })
        .from(forumGroups)
        .where(eq(forumGroups.slug, slug))
        .limit(1);
      if (taken && taken.id !== existing?.id)
        errors.slug = "Another group has that key.";
    }
  }

  let editWindowMinutes: number | null = null;
  if (draft.editWindow !== "") {
    const minutes = Number(draft.editWindow);
    if (
      !Number.isInteger(minutes) ||
      minutes < 0 ||
      minutes > GROUP_LIMITS.editWindow
    )
      errors.editWindow = "A whole number of minutes, or empty for no limit.";
    else editWindowMinutes = minutes;
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return {
    ok: true,
    input: {
      name,
      slug,
      title: title || null,
      description,
      editWindowMinutes,
      permissions: Object.fromEntries(
        PERMISSION_KEYS.map((key) => [key, draft.permissions[key] === true]),
      ),
    },
  };
}

export async function createGroup(
  db: Database,
  input: GroupInput,
): Promise<ForumGroup> {
  const [last] = await db
    .select({ sort: max(forumGroups.sort) })
    .from(forumGroups);
  const [group] = await db
    .insert(forumGroups)
    .values({ ...input, builtIn: false, sort: (last?.sort ?? 0) + 1 })
    .returning();
  if (!group) throw new Error("Saving the group returned nothing");
  return group;
}

export async function updateGroup(
  db: Database,
  group: ForumGroup,
  input: GroupInput,
): Promise<void> {
  await db
    .update(forumGroups)
    .set({ ...input, slug: group.builtIn ? group.slug : input.slug })
    .where(eq(forumGroups.id, group.id));
}

/** Deletes one of the admin's own groups (built-in ones stay). */
export async function deleteGroup(
  db: Database,
  group: ForumGroup,
): Promise<boolean> {
  if (group.builtIn) return false;
  await db.delete(forumGroups).where(eq(forumGroups.id, group.id));
  return true;
}

/** People in a group put there by hand, by username. */
export async function groupMembers(db: Database, groupId: number) {
  return db
    .select({
      id: users.id,
      username: users.username,
      addedAt: forumGroupMembers.addedAt,
    })
    .from(forumGroupMembers)
    .innerJoin(users, eq(users.id, forumGroupMembers.userId))
    .where(eq(forumGroupMembers.groupId, groupId))
    .orderBy(asc(users.username));
}

export async function findUser(db: Database, username: string) {
  const [user] = await db
    .select({ id: users.id, username: users.username })
    .from(users)
    .where(eq(users.username, normalizeUsername(username)))
    .limit(1);
  return user;
}

export type MemberProblem = "no-user" | "automatic";

/** Puts someone in a group (not one worked out from the account). */
export async function addMember(
  db: Database,
  group: ForumGroup,
  username: string,
): Promise<MemberProblem | null> {
  if (AUTOMATIC_GROUPS.has(group.slug)) return "automatic";
  const user = await findUser(db, username);
  if (!user) return "no-user";
  await db
    .insert(forumGroupMembers)
    .values({ groupId: group.id, userId: user.id })
    .onConflictDoNothing();
  return null;
}

export async function removeMember(
  db: Database,
  groupId: number,
  userId: string,
): Promise<void> {
  await db
    .delete(forumGroupMembers)
    .where(
      and(
        eq(forumGroupMembers.groupId, groupId),
        eq(forumGroupMembers.userId, userId),
      ),
    );
}

export type OverrideChoice = "inherit" | "allow" | "deny";

/**
 * Sets a forum's choices for every group and permission at once, from its form's
 * `override:<groupId>:<permission>` fields ("inherit", "allow" or "deny").
 */
export async function saveOverrides(
  db: Database,
  forumId: number,
  form: FormData,
  groupIds: readonly number[],
): Promise<void> {
  const rows: {
    forumId: number;
    groupId: number;
    permission: string;
    allowed: boolean;
  }[] = [];
  for (const groupId of groupIds) {
    for (const permission of PERMISSION_KEYS) {
      const choice = field(form, `override:${String(groupId)}:${permission}`);
      if (choice === "allow" || choice === "deny")
        rows.push({
          forumId,
          groupId,
          permission,
          allowed: choice === "allow",
        });
    }
  }
  await db.transaction(async (tx) => {
    await tx
      .delete(forumPermissions)
      .where(eq(forumPermissions.forumId, forumId));
    if (rows.length > 0) await tx.insert(forumPermissions).values(rows);
  });
}

/** People assigned to moderate a forum, by username. */
export async function forumModeratorList(db: Database, forumId: number) {
  return db
    .select({ id: users.id, username: users.username })
    .from(forumModerators)
    .innerJoin(users, eq(users.id, forumModerators.userId))
    .where(eq(forumModerators.forumId, forumId))
    .orderBy(asc(users.username));
}

export async function addModerator(
  db: Database,
  forumId: number,
  username: string,
): Promise<boolean> {
  const user = await findUser(db, username);
  if (!user) return false;
  await db
    .insert(forumModerators)
    .values({ forumId, userId: user.id })
    .onConflictDoNothing();
  return true;
}

export async function removeModerator(
  db: Database,
  forumId: number,
  userId: string,
): Promise<void> {
  await db
    .delete(forumModerators)
    .where(
      and(
        eq(forumModerators.forumId, forumId),
        eq(forumModerators.userId, userId),
      ),
    );
}

/** The titles to show beside each of these people's names (their groups' titles). */
export async function titlesOf(
  db: Database,
  userIds: readonly string[],
): Promise<Map<string, string[]>> {
  const out = new Map<string, string[]>();
  if (userIds.length === 0) return out;
  const rows = await db
    .select({ userId: forumGroupMembers.userId, title: forumGroups.title })
    .from(forumGroupMembers)
    .innerJoin(forumGroups, eq(forumGroups.id, forumGroupMembers.groupId))
    .where(inArray(forumGroupMembers.userId, [...userIds]))
    .orderBy(asc(forumGroups.sort));
  for (const row of rows) {
    if (!row.title) continue;
    out.set(row.userId, [...(out.get(row.userId) ?? []), row.title]);
  }
  return out;
}
