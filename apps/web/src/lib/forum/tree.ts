/**
 * The forum's tree, built from every `forums` row and what decides access (groups,
 * each forum's permission overrides, assigned moderators: small tables, read once
 * per request). Lookups by id and slug, ancestors for breadcrumbs, each forum as
 * the permission rules see it (`place`: hidden if a parent is, rules and moderators
 * inherited down the tree), and what a viewer may see. Pure, so it's tested alone.
 */
import type { Forum } from "@trilleo/db";
import {
  BUILT_IN_GROUPS,
  can,
  moderates,
  resolveRules,
  type ForumPermission,
  type ForumPlace,
  type ForumViewer,
  type GroupDefinition,
  type PermissionOverride,
} from "@trilleo/forum";

export interface TreeGroup extends GroupDefinition {
  /** Null for a group that only exists in code (tests). */
  id: number | null;
  builtIn: boolean;
}

/** What decides who may do what, besides the forums themselves. */
export interface TreeAccess {
  groups: readonly TreeGroup[];
  /** Per forum: its overrides, by group slug. */
  overrides: readonly (PermissionOverride & { forumId: number })[];
  /** Per forum: the accounts assigned to moderate it. */
  moderators: readonly { forumId: number; userId: string }[];
}

/** The built-in groups and nothing else (tests, and before anything's loaded). */
export const DEFAULT_ACCESS: TreeAccess = {
  groups: BUILT_IN_GROUPS.map((group) => ({
    ...group,
    id: null,
    builtIn: true,
  })),
  overrides: [],
  moderators: [],
};

export interface ForumNode {
  forum: Forum;
  children: ForumNode[];
  depth: number;
  /** This forum's and every subforum's counts together. */
  totals: { topics: number; posts: number };
  /** The newest post in it or any subforum (forums.last_post_id), if any. */
  lastPostId: number | null;
  lastPostAt: Date | null;
}

export class ForumTree {
  readonly roots: ForumNode[];
  private readonly byId = new Map<number, ForumNode>();
  private readonly bySlug = new Map<string, ForumNode>();
  private readonly places = new Map<number, ForumPlace>();
  /** Groups by slug, in the admin's order. */
  readonly groups: ReadonlyMap<string, TreeGroup>;

  constructor(
    rows: readonly Forum[],
    readonly access: TreeAccess = DEFAULT_ACCESS,
    places?: ReadonlyMap<number, ForumPlace>,
  ) {
    this.groups = new Map(access.groups.map((group) => [group.slug, group]));
    if (places) for (const [id, place] of places) this.places.set(id, place);
    const sorted = [...rows].sort((a, b) => a.sort - b.sort || a.id - b.id);
    for (const forum of sorted) {
      const node: ForumNode = {
        forum,
        children: [],
        depth: 0,
        totals: { topics: forum.topicCount, posts: forum.postCount },
        lastPostId: forum.lastPostId,
        lastPostAt: forum.lastPostAt,
      };
      this.byId.set(forum.id, node);
      this.bySlug.set(forum.slug, node);
    }
    this.roots = [];
    for (const node of this.byId.values()) {
      const parent =
        node.forum.parentId === null
          ? undefined
          : this.byId.get(node.forum.parentId);
      if (parent) parent.children.push(node);
      else this.roots.push(node);
    }
    const settle = (node: ForumNode, depth: number) => {
      node.depth = depth;
      for (const child of node.children) {
        settle(child, depth + 1);
        node.totals.topics += child.totals.topics;
        node.totals.posts += child.totals.posts;
        if (
          child.lastPostAt &&
          (!node.lastPostAt || child.lastPostAt > node.lastPostAt)
        ) {
          node.lastPostAt = child.lastPostAt;
          node.lastPostId = child.lastPostId;
        }
      }
    };
    for (const root of this.roots) settle(root, 0);
  }

  get(id: number): ForumNode | undefined {
    return this.byId.get(id);
  }

  find(slug: string): ForumNode | undefined {
    return this.bySlug.get(slug);
  }

  /** From the top of the tree down to (not including) this forum. */
  ancestors(id: number): Forum[] {
    const chain: Forum[] = [];
    let parentId = this.byId.get(id)?.forum.parentId ?? null;
    while (parentId !== null) {
      const parent = this.byId.get(parentId);
      if (!parent || chain.includes(parent.forum)) break;
      chain.unshift(parent.forum);
      parentId = parent.forum.parentId;
    }
    return chain;
  }

  /** This forum and everything under it. */
  descendants(id: number): Forum[] {
    const node = this.byId.get(id);
    if (!node) return [];
    const out: Forum[] = [];
    const walk = (current: ForumNode) => {
      out.push(current.forum);
      current.children.forEach(walk);
    };
    walk(node);
    return out;
  }

  /**
   * The forum as the permission rules see it: hidden if it or a parent is, each
   * group's permissions after this forum's and its parents' overrides, and the
   * moderators assigned to it or a parent.
   */
  place(forum: Forum): ForumPlace {
    const cached = this.places.get(forum.id);
    if (cached) return cached;
    const chain = [...this.ancestors(forum.id), forum];
    const ids = new Set(chain.map((item) => item.id));
    const place: ForumPlace = {
      id: forum.id,
      kind: forum.kind,
      locked: forum.locked,
      hidden: chain.some((item) => item.hidden),
      moderation: forum.moderation,
      moderators: this.access.moderators
        .filter((row) => ids.has(row.forumId))
        .map((row) => row.userId),
      rules: resolveRules(
        this.access.groups,
        chain.map((item) =>
          this.access.overrides.filter((row) => row.forumId === item.id),
        ),
      ),
    };
    this.places.set(forum.id, place);
    return place;
  }

  /** A forum's own overrides (not its parents'): group slug → permission → allowed. */
  overridesOf(forumId: number): Map<string, Map<ForumPermission, boolean>> {
    const out = new Map<string, Map<ForumPermission, boolean>>();
    for (const row of this.access.overrides) {
      if (row.forumId !== forumId) continue;
      const set = out.get(row.group) ?? new Map<ForumPermission, boolean>();
      set.set(row.permission, row.allowed);
      out.set(row.group, set);
    }
    return out;
  }

  /** The accounts assigned to this forum itself (not its parents). */
  moderatorsOf(forumId: number): string[] {
    return this.access.moderators
      .filter((row) => row.forumId === forumId)
      .map((row) => row.userId);
  }

  canView(forum: Forum, viewer: ForumViewer | null): boolean {
    return can(viewer, "forum.view", this.place(forum));
  }

  moderates(forum: Forum, viewer: ForumViewer | null): boolean {
    return moderates(viewer, this.place(forum));
  }

  /** The ids of every forum the viewer may see (for lists across forums). */
  visibleIds(viewer: ForumViewer | null): number[] {
    return [...this.byId.values()]
      .filter((node) => this.canView(node.forum, viewer))
      .map((node) => node.forum.id);
  }

  /**
   * The tree the viewer may see, with counts recomputed over what's left. Access is
   * worked out on the whole tree first, so a missing parent changes nothing.
   */
  visible(viewer: ForumViewer | null): ForumTree {
    const ids = new Set(this.visibleIds(viewer));
    const kept = [...this.byId.values()]
      .map((node) => node.forum)
      .filter((forum) => ids.has(forum.id));
    return new ForumTree(
      kept,
      this.access,
      new Map(kept.map((forum) => [forum.id, this.place(forum)])),
    );
  }

  /** Every forum, depth first, for pickers (the admin's "parent" select). */
  flat(): ForumNode[] {
    const out: ForumNode[] = [];
    const walk = (node: ForumNode) => {
      out.push(node);
      node.children.forEach(walk);
    };
    this.roots.forEach(walk);
    return out;
  }
}
