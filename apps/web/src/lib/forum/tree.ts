/**
 * The forum's tree, built from every `forums` row (a small table, read once per
 * request): lookups by id and slug, ancestors for breadcrumbs, and what a viewer
 * may see (a hidden forum hides everything under it). Pure, so it's tested alone.
 */
import type { Forum } from "@trilleo/db";
import {
  can,
  moderates,
  type ForumPlace,
  type ForumViewer,
} from "@trilleo/forum";

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

  constructor(rows: readonly Forum[]) {
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

  /** The forum as the permission rules see it: hidden if it or a parent is. */
  place(forum: Forum): ForumPlace {
    return {
      id: forum.id,
      kind: forum.kind,
      locked: forum.locked,
      hidden:
        forum.hidden ||
        this.ancestors(forum.id).some((parent) => parent.hidden),
      moderation: forum.moderation,
    };
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

  /** The tree the viewer may see, with counts recomputed over what's left. */
  visible(viewer: ForumViewer | null): ForumTree {
    const ids = new Set(this.visibleIds(viewer));
    return new ForumTree(
      [...this.byId.values()]
        .map((node) => node.forum)
        .filter((forum) => ids.has(forum.id)),
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
