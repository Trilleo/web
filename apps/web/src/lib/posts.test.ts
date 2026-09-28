import { describe, expect, it } from "vitest";
import {
  adjacentPosts,
  collectTags,
  hasTag,
  isVisible,
  numberPosts,
  postHref,
  readingMinutes,
  sortPosts,
  tagHref,
  tagSlug,
  toListings,
  type PostEntry,
} from "./posts";

function post(
  id: string,
  data: Partial<PostEntry["data"]> = {},
  body = "",
): PostEntry {
  return {
    id,
    body,
    data: {
      title: id,
      description: `${id} summary`,
      tags: [],
      draft: false,
      ...data,
    },
  };
}

const older = post("older", {
  title: "Older",
  pubDate: new Date("2026-01-10"),
});
const newer = post("newer", {
  title: "Newer",
  pubDate: new Date("2026-03-02"),
});
const draftB = post("draft-b", { title: "B draft", draft: true });
const draftA = post("draft-a", { title: "A draft", draft: true });

describe("isVisible", () => {
  it("hides drafts unless they're included", () => {
    expect(isVisible(draftA, false)).toBe(false);
    expect(isVisible(draftA, true)).toBe(true);
    expect(isVisible(newer, false)).toBe(true);
  });
});

describe("sortPosts", () => {
  it("puts published posts newest first, then drafts by title", () => {
    expect(sortPosts([draftB, older, draftA, newer]).map((p) => p.id)).toEqual([
      "newer",
      "older",
      "draft-a",
      "draft-b",
    ]);
  });

  it("doesn't mutate its input", () => {
    const input = [older, newer];
    sortPosts(input);
    expect(input.map((p) => p.id)).toEqual(["older", "newer"]);
  });
});

describe("numberPosts", () => {
  it("numbers the oldest published post 001, with drafts after the published ones", () => {
    const numbers = numberPosts(sortPosts([draftB, older, draftA, newer]));
    expect(Object.fromEntries(numbers)).toEqual({
      older: "001",
      newer: "002",
      "draft-a": "003",
      "draft-b": "004",
    });
  });
});

describe("readingMinutes", () => {
  it("rounds up at ~230 words per minute and never returns 0", () => {
    expect(readingMinutes(undefined)).toBe(1);
    expect(readingMinutes("")).toBe(1);
    expect(readingMinutes("word ".repeat(230))).toBe(1);
    expect(readingMinutes("word ".repeat(231))).toBe(2);
  });
});

describe("tags", () => {
  it("slugs names for URLs", () => {
    expect(tagSlug("Self-hosting")).toBe("self-hosting");
    expect(tagSlug("C & Rust")).toBe("c-rust");
    expect(tagSlug("Café")).toBe("cafe");
    expect(tagHref("Astro")).toBe("/writing/tags/astro/");
  });

  it("collects tags with counts, merging names that slug the same", () => {
    const tagged = [
      post("a", { tags: ["Astro", "Tooling"] }),
      post("b", { tags: ["astro"] }),
      post("c", { tags: ["Tooling", "Tooling"] }),
    ];
    expect(collectTags(tagged)).toEqual([
      { name: "Astro", slug: "astro", count: 2 },
      { name: "Tooling", slug: "tooling", count: 2 },
    ]);
    expect(hasTag(post("b", { tags: ["astro"] }), "astro")).toBe(true);
    expect(hasTag(post("c", { tags: ["Tooling"] }), "astro")).toBe(false);
  });
});

describe("adjacentPosts", () => {
  const sorted = sortPosts([older, newer, draftA]);

  it("finds the newer and older neighbours", () => {
    expect(adjacentPosts(sorted, "older")).toEqual({ newer, older: draftA });
    expect(adjacentPosts(sorted, "newer")).toEqual({ newer: undefined, older });
  });

  it("returns nothing for an unknown id", () => {
    expect(adjacentPosts(sorted, "missing")).toEqual({
      newer: undefined,
      older: undefined,
    });
  });
});

describe("toListings", () => {
  it("maps posts to numbered list rows", () => {
    const [first] = toListings(
      sortPosts([older, newer, post("x", { draft: true }, "one two")]),
    );
    expect(first).toEqual({
      number: "002",
      title: "Newer",
      href: postHref("newer"),
      date: newer.data.pubDate,
      draft: false,
      readingMinutes: 1,
    });
  });
});
