import { describe, expect, it } from "vitest";
import {
  DEFAULT_RANKS,
  earnedBadges,
  isReaction,
  normalizeTag,
  orderPosts,
  pageOf,
  pageOfId,
  parseTags,
  pointsFor,
  quotedPostIds,
  quoteFor,
  rankFor,
  type OrderPost,
} from "./index";

const at = (minute: number) => new Date(Date.UTC(2026, 0, 1, 12, minute));

describe("reactions", () => {
  it("knows the set", () => {
    expect(isReaction("like")).toBe(true);
    expect(isReaction("👍")).toBe(false);
  });
});

describe("reputation", () => {
  const stats = {
    posts: 10,
    topics: 2,
    reactionsReceived: 5,
    acceptedAnswers: 1,
  };

  it("adds up points and finds the rank", () => {
    expect(pointsFor(stats)).toBe(10 + 10 + 15);
    expect(rankFor(35, DEFAULT_RANKS)?.name).toBe("Regular");
    expect(rankFor(0, DEFAULT_RANKS)?.name).toBe("Newcomer");
    expect(rankFor(5000, DEFAULT_RANKS)?.name).toBe("Legend");
    expect(rankFor(5, [])).toBeNull();
  });

  it("awards badges from the counts", () => {
    const joined = new Date("2025-01-01T00:00:00Z");
    expect(
      earnedBadges(stats, joined, new Date("2025-06-01T00:00:00Z")),
    ).toEqual(["first-post", "helpful"]);
    expect(
      earnedBadges(stats, joined, new Date("2026-02-01T00:00:00Z")),
    ).toContain("one-year");
    expect(
      earnedBadges(
        { posts: 0, topics: 0, reactionsReceived: 0, acceptedAnswers: 0 },
        joined,
        new Date("2027-01-01T00:00:00Z"),
      ),
    ).toEqual([]);
  });
});

describe("tags", () => {
  it("normalizes and limits tags", () => {
    expect(normalizeTag(" Redstone Clocks! ")).toBe("redstone-clocks");
    expect(normalizeTag("你好")).toBe("");
    expect(parseTags("a, b c,,a d e f g")).toEqual(["a", "b", "c", "d", "e"]);
  });
});

describe("quotes", () => {
  it("finds the posts a reply quotes", () => {
    const body = `${quoteFor({ id: 7, body: "hi" }, "alice", "/forum/post/7/")}${quoteFor({ id: 9, body: "yo" }, null, "/forum/post/9/")}Reply`;
    expect(quotedPostIds(body)).toEqual([7, 9]);
    expect(quotedPostIds("see /forum/post/3/")).toEqual([]);
  });
});

describe("post order", () => {
  const posts: OrderPost[] = [
    { id: 1, parentId: null, score: 0, createdAt: at(0) },
    { id: 2, parentId: null, score: 1, createdAt: at(1) },
    { id: 3, parentId: 2, score: 5, createdAt: at(2) },
    { id: 4, parentId: null, score: 3, createdAt: at(3) },
    { id: 5, parentId: 3, score: 0, createdAt: at(4) },
    { id: 6, parentId: 1, score: 0, createdAt: at(5) },
  ];
  const options = { firstPostId: 1, acceptedPostId: null };

  it("keeps time order in classic forums", () => {
    expect(orderPosts("classic", posts, options).map((p) => p.id)).toEqual([
      1, 2, 3, 4, 5, 6,
    ]);
  });

  it("puts the accepted answer, then the best, first in Q&A", () => {
    expect(orderPosts("qa", posts, options).map((p) => p.id)).toEqual([
      1, 3, 4, 2, 5, 6,
    ]);
    expect(
      orderPosts("qa", posts, { firstPostId: 1, acceptedPostId: 2 }).map(
        (p) => p.id,
      ),
    ).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it("nests replies in threaded forums, page by thread", () => {
    const placed = orderPosts("threaded", posts, options);
    expect(placed.map((p) => [p.id, p.depth])).toEqual([
      [1, 0],
      [2, 1],
      [3, 2],
      [5, 3],
      [4, 1],
      [6, 1],
    ]);
    const first = pageOf(placed, 1, 2);
    expect(first.pages).toBe(2);
    expect(first.items.map((p) => p.id)).toEqual([1, 2, 3, 5]);
    expect(pageOf(placed, 2, 2).items.map((p) => p.id)).toEqual([4, 6]);
    expect(pageOfId(placed, 5, 2)).toBe(1);
    expect(pageOfId(placed, 6, 2)).toBe(2);
  });

  it("caps how deep replies nest", () => {
    const chain: OrderPost[] = Array.from({ length: 9 }, (_, n) => ({
      id: n + 1,
      parentId: n === 0 ? null : n,
      score: 0,
      createdAt: at(n),
    }));
    const depths = orderPosts("threaded", chain, {
      firstPostId: 1,
      acceptedPostId: null,
    }).map((p) => p.depth);
    expect(Math.max(...depths)).toBe(5);
  });
});
