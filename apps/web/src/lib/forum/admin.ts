/**
 * The admin's side of the forum's tree (/admin/forum/): reading and checking the
 * form for a category or forum, creating, changing, reordering and deleting them.
 */
import {
  forumTopics,
  forums,
  type Database,
  type Forum,
  type ForumKind,
  type ForumModeration,
} from "@trilleo/db";
import {
  DEFAULT_LAYOUT,
  FORUM_LIMITS,
  forumSlugProblem,
  isReadyLayout,
  slugify,
} from "@trilleo/forum";
import { and, count, eq, isNull, max, ne } from "drizzle-orm";
import { field } from "../comments/form";
import { characterCount, cleanLine } from "../profile/profile";
import type { ForumTree } from "./tree";

export interface ForumDraft {
  kind: ForumKind;
  name: string;
  slug: string;
  description: string;
  /** "" for none (a category). */
  parentId: string;
  layout: string;
  moderation: ForumModeration;
  locked: boolean;
  hidden: boolean;
}

export type ForumField =
  "name" | "slug" | "description" | "parentId" | "layout";

export function forumDraft(forum?: Forum, parentId?: number): ForumDraft {
  return {
    kind: forum?.kind ?? (parentId === undefined ? "category" : "forum"),
    name: forum?.name ?? "",
    slug: forum?.slug ?? "",
    description: forum?.description ?? "",
    parentId: String(forum?.parentId ?? parentId ?? ""),
    layout: forum?.layout ?? DEFAULT_LAYOUT,
    moderation: forum?.moderation ?? "newcomers",
    locked: forum?.locked ?? false,
    hidden: forum?.hidden ?? false,
  };
}

const MODERATIONS: readonly ForumModeration[] = ["none", "newcomers", "all"];

export function readForumForm(form: FormData, existing?: Forum): ForumDraft {
  const moderation = field(form, "moderation");
  return {
    // A forum's kind is chosen when it's made.
    kind:
      existing?.kind ??
      (field(form, "kind") === "category" ? "category" : "forum"),
    name: field(form, "name"),
    slug: field(form, "slug").trim().toLowerCase(),
    description: field(form, "description"),
    parentId: field(form, "parentId"),
    layout: field(form, "layout") || DEFAULT_LAYOUT,
    moderation:
      MODERATIONS.find((value) => value === moderation) ?? "newcomers",
    locked: field(form, "locked") === "on",
    hidden: field(form, "hidden") === "on",
  };
}

export interface ForumInput {
  kind: ForumKind;
  name: string;
  slug: string;
  description: string;
  parentId: number | null;
  layout: string;
  moderation: ForumModeration;
  locked: boolean;
  hidden: boolean;
}

const SLUG_PROBLEMS = {
  empty: "Give it an address.",
  invalid:
    "Lower-case letters, digits and single hyphens, starting with a letter or digit.",
  reserved: "That address is one of the forum’s own pages.",
} as const;

/**
 * Checks a draft against the tree: names and addresses, and a parent that makes
 * sense (categories at the top, forums under a category or forum, never under
 * themselves).
 */
export async function validateForum(
  db: Database,
  tree: ForumTree,
  draft: ForumDraft,
  existing?: Forum,
): Promise<
  | { ok: true; input: ForumInput }
  | { ok: false; errors: Partial<Record<ForumField, string>> }
> {
  const errors: Partial<Record<ForumField, string>> = {};
  const name = cleanLine(draft.name);
  if (!name) errors.name = "Give it a name.";
  else if (characterCount(name) > FORUM_LIMITS.name.max)
    errors.name = `Up to ${String(FORUM_LIMITS.name.max)} characters.`;

  const slug = draft.slug || (name ? slugify(name, 40) : "");
  const slugProblem = forumSlugProblem(slug);
  if (slugProblem) {
    errors.slug = SLUG_PROBLEMS[slugProblem];
  } else {
    const [taken] = await db
      .select({ id: forums.id })
      .from(forums)
      .where(
        and(
          eq(forums.slug, slug),
          existing ? ne(forums.id, existing.id) : undefined,
        ),
      )
      .limit(1);
    if (taken) errors.slug = "Another forum has that address.";
  }

  const description = cleanLine(draft.description);
  if (characterCount(description) > FORUM_LIMITS.description.max)
    errors.description = `Up to ${String(FORUM_LIMITS.description.max)} characters.`;

  let parentId: number | null = null;
  if (draft.kind === "category") {
    if (draft.parentId !== "")
      errors.parentId = "Categories sit at the top of the forum.";
  } else {
    const parent = tree.get(Number(draft.parentId));
    if (!parent) {
      errors.parentId = "Choose where it goes.";
    } else if (
      existing &&
      tree
        .descendants(existing.id)
        .some((forum) => forum.id === parent.forum.id)
    ) {
      errors.parentId = "A forum can’t go inside itself.";
    } else {
      parentId = parent.forum.id;
    }
  }

  if (!isReadyLayout(draft.layout)) errors.layout = "Choose a layout.";

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return {
    ok: true,
    input: {
      kind: draft.kind,
      name,
      slug,
      description,
      parentId,
      layout: draft.layout,
      moderation: draft.moderation,
      locked: draft.locked,
      hidden: draft.hidden,
    },
  };
}

/** Adds a category or forum at the end of its siblings. */
export async function createForum(
  db: Database,
  input: ForumInput,
  now = new Date(),
): Promise<Forum> {
  const [last] = await db
    .select({ sort: max(forums.sort) })
    .from(forums)
    .where(
      input.parentId === null
        ? isNull(forums.parentId)
        : eq(forums.parentId, input.parentId),
    );
  const [forum] = await db
    .insert(forums)
    .values({
      ...input,
      sort: (last?.sort ?? -1) + 1,
      createdAt: now,
      updatedAt: now,
    })
    .returning();
  if (!forum) throw new Error("Saving the forum returned nothing");
  return forum;
}

export async function updateForum(
  db: Database,
  existing: Forum,
  input: ForumInput,
  now = new Date(),
): Promise<Forum> {
  const moved = input.parentId !== existing.parentId;
  let sort = existing.sort;
  if (moved) {
    const [last] = await db
      .select({ sort: max(forums.sort) })
      .from(forums)
      .where(
        input.parentId === null
          ? isNull(forums.parentId)
          : eq(forums.parentId, input.parentId),
      );
    sort = (last?.sort ?? -1) + 1;
  }
  const [forum] = await db
    .update(forums)
    .set({ ...input, sort, updatedAt: now })
    .where(eq(forums.id, existing.id))
    .returning();
  if (!forum) throw new Error("The forum is gone");
  return forum;
}

/** Moves a forum one place up or down among its siblings. */
export async function moveForum(
  db: Database,
  tree: ForumTree,
  forum: Forum,
  direction: "up" | "down",
): Promise<boolean> {
  const siblings = (
    forum.parentId === null
      ? tree.roots
      : (tree.get(forum.parentId)?.children ?? [])
  ).map((node) => node.forum);
  const index = siblings.findIndex((sibling) => sibling.id === forum.id);
  const target = index + (direction === "up" ? -1 : 1);
  const other = siblings[target];
  if (index === -1 || !other) return false;
  // Renumber the whole row, so equal sort values can't keep them stuck.
  const order = [...siblings];
  order[index] = other;
  order[target] = forum;
  await db.transaction(async (tx) => {
    for (const [sort, sibling] of order.entries())
      await tx.update(forums).set({ sort }).where(eq(forums.id, sibling.id));
  });
  return true;
}

export type DeleteForumProblem = "has-children" | "has-topics";

/** Deletes an empty forum or category. Anything still in it has to go first. */
export async function deleteForum(
  db: Database,
  tree: ForumTree,
  forum: Forum,
): Promise<DeleteForumProblem | null> {
  if ((tree.get(forum.id)?.children.length ?? 0) > 0) return "has-children";
  const [topics] = await db
    .select({ total: count() })
    .from(forumTopics)
    .where(eq(forumTopics.forumId, forum.id));
  if ((topics?.total ?? 0) > 0) return "has-topics";
  await db.delete(forums).where(eq(forums.id, forum.id));
  return null;
}
