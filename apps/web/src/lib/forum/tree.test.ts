import type { Forum } from "@trilleo/db";
import { describe, expect, it } from "vitest";
import { formatWhen, pagerPages } from "./public";
import { ForumTree } from "./tree";

const date = new Date("2026-03-01T00:00:00Z");

function forum(
  id: number,
  parentId: number | null,
  extra: Partial<Forum> = {},
): Forum {
  return {
    id,
    parentId,
    kind: parentId === null ? "category" : "forum",
    slug: `f${String(id)}`,
    name: `Forum ${String(id)}`,
    description: "",
    sort: id,
    layout: "classic",
    moderation: "newcomers",
    locked: false,
    hidden: false,
    topicCount: 1,
    postCount: 2,
    lastPostId: id * 10,
    lastPostAt: new Date(date.getTime() + id * 1000),
    createdAt: date,
    updatedAt: date,
    ...extra,
  };
}

const admin = {
  id: "a",
  admin: true,
  trusted: true,
  blocked: false,
  groups: [],
  banned: false,
  editWindowMs: null,
};

describe("ForumTree", () => {
  const tree = new ForumTree([
    forum(1, null, {
      topicCount: 0,
      postCount: 0,
      lastPostId: null,
      lastPostAt: null,
    }),
    forum(2, 1),
    forum(3, 2, { hidden: true }),
    forum(4, 3),
    forum(5, 1, { sort: 0 }),
  ]);

  it("nests forums, in order, and adds up counts", () => {
    expect(tree.roots.map((node) => node.forum.id)).toEqual([1]);
    expect(tree.get(1)?.children.map((node) => node.forum.id)).toEqual([5, 2]);
    expect(tree.get(1)?.totals).toEqual({ topics: 4, posts: 8 });
    // The newest post anywhere below.
    expect(tree.get(1)?.lastPostId).toBe(50);
    expect(tree.ancestors(4).map((f) => f.id)).toEqual([1, 2, 3]);
    expect(tree.flat().map((node) => node.forum.id)).toEqual([1, 5, 2, 3, 4]);
  });

  it("hides a hidden forum and everything in it", () => {
    expect(tree.place(tree.get(4)?.forum ?? forum(0, null)).hidden).toBe(true);
    expect(tree.visibleIds(null).sort()).toEqual([1, 2, 5]);
    expect(tree.visibleIds(admin).length).toBe(5);
    expect(tree.visible(null).get(2)?.totals).toEqual({ topics: 1, posts: 2 });
  });
});

describe("formatting", () => {
  it("says how long ago, then the date", () => {
    const now = new Date("2026-03-10T12:00:00Z");
    const ago = (ms: number) => formatWhen(new Date(now.getTime() - ms), now);
    expect(ago(10_000)).toBe("just now");
    expect(ago(5 * 60_000)).toBe("5 min ago");
    expect(ago(3 * 3_600_000)).toBe("3 h ago");
    expect(ago(86_400_000)).toBe("1 day ago");
    expect(ago(30 * 86_400_000)).toBe("2026.02.08");
  });

  it("chooses the pages a pager links", () => {
    expect(pagerPages(1, 1)).toEqual([1]);
    expect(pagerPages(5, 10)).toEqual([1, "gap", 3, 4, 5, 6, 7, "gap", 10]);
    expect(pagerPages(2, 4)).toEqual([1, 2, 3, 4]);
  });
});
