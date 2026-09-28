import { describe, expect, it } from "vitest";
import { toFeedItem, type FeedPost } from "./feed";

const base: FeedPost = {
  id: "hello",
  body: "Hello",
  data: {
    title: "Hello",
    description: "A first post.",
    pubDate: new Date("2026-10-01T00:00:00Z"),
    tags: ["Astro"],
    draft: false,
  },
};

describe("toFeedItem", () => {
  it("includes the full post with absolute links", () => {
    const item = toFeedItem(
      {
        ...base,
        rendered: { html: '<p>See <a href="/writing/other/">this</a>.</p>' },
      },
      "https://trilleo.example",
    );
    expect(item).toMatchObject({
      title: "Hello",
      description: "A first post.",
      link: "/writing/hello/",
      categories: ["Astro"],
      pubDate: base.data.pubDate,
    });
    expect(item.content).toContain(
      'href="https://trilleo.example/writing/other/"',
    );
  });

  it("falls back to the description when there's no rendered HTML (MDX)", () => {
    expect(toFeedItem(base, "https://trilleo.example").content).toBeUndefined();
  });
});
