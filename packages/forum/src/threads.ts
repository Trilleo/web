/**
 * The order posts show in, per layout. Classic: by time. Q&A: the question, the
 * accepted answer, then answers by score. Threaded: each reply under the post it
 * answers, depth-first, each level by time. Pages are cut from that order (threaded:
 * whole threads per page).
 */

export interface OrderPost {
  id: number;
  parentId: number | null;
  score: number;
  createdAt: Date;
}

/** Replies nest at most this deep on screen; deeper ones line up at it. */
export const MAX_DEPTH = 5;

const byTime = (a: OrderPost, b: OrderPost) =>
  a.createdAt.getTime() - b.createdAt.getTime() || a.id - b.id;

export interface Placed {
  id: number;
  depth: number;
  /** Which page-group it belongs to (threaded: its top-level thread). */
  group: number;
}

export function orderPosts(
  layout: string,
  posts: readonly OrderPost[],
  options: { firstPostId: number | null; acceptedPostId: number | null },
): Placed[] {
  const sorted = [...posts].sort(byTime);
  const first =
    sorted.find((post) => post.id === options.firstPostId) ?? sorted[0];
  if (!first) return [];
  const rest = sorted.filter((post) => post.id !== first.id);

  if (layout === "qa") {
    const accepted = rest.find((post) => post.id === options.acceptedPostId);
    const others = rest
      .filter((post) => post !== accepted)
      .sort((a, b) => b.score - a.score || byTime(a, b));
    return [first, ...(accepted ? [accepted] : []), ...others].map(
      (post, index) => ({
        id: post.id,
        depth: 0,
        group: index,
      }),
    );
  }

  if (layout === "threaded") {
    const ids = new Set(sorted.map((post) => post.id));
    const children = new Map<number, OrderPost[]>();
    const roots: OrderPost[] = [];
    for (const post of rest) {
      // A reply to the opening post, to nothing, or to a post that's gone starts a thread.
      const parent =
        post.parentId !== null &&
        post.parentId !== first.id &&
        ids.has(post.parentId)
          ? post.parentId
          : null;
      if (parent === null) roots.push(post);
      else children.set(parent, [...(children.get(parent) ?? []), post]);
    }
    const out: Placed[] = [{ id: first.id, depth: 0, group: 0 }];
    const walk = (
      post: OrderPost,
      depth: number,
      group: number,
      seen: Set<number>,
    ) => {
      if (seen.has(post.id)) return;
      seen.add(post.id);
      out.push({ id: post.id, depth: Math.min(depth, MAX_DEPTH), group });
      for (const child of children.get(post.id) ?? [])
        walk(child, depth + 1, group, seen);
    };
    const seen = new Set<number>();
    roots.forEach((root, index) => {
      walk(root, 1, index + 1, seen);
    });
    return out;
  }

  return sorted.map((post, index) => ({ id: post.id, depth: 0, group: index }));
}

/**
 * One page of placed posts: `perPage` groups (posts, or threaded threads; the
 * opening post's group always leads page 1). Returns the page's posts and how many
 * pages there are.
 */
export function pageOf(
  placed: readonly Placed[],
  page: number,
  perPage: number,
): { items: Placed[]; pages: number; page: number } {
  const groups = [...new Set(placed.map((item) => item.group))];
  const pages = Math.max(1, Math.ceil(groups.length / perPage));
  const current = Math.min(Math.max(1, page), pages);
  const keep = new Set(
    groups.slice((current - 1) * perPage, current * perPage),
  );
  return {
    items: placed.filter((item) => keep.has(item.group)),
    pages,
    page: current,
  };
}

/** Which page a post is on. */
export function pageOfId(
  placed: readonly Placed[],
  id: number,
  perPage: number,
): number {
  const groups = [...new Set(placed.map((item) => item.group))];
  const group = placed.find((item) => item.id === id)?.group;
  const index = group === undefined ? 0 : groups.indexOf(group);
  return Math.floor(Math.max(0, index) / perPage) + 1;
}
