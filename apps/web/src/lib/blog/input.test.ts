import { describe, expect, it } from "vitest";
import {
  POST_LIMITS,
  isValidSlug,
  parsePostAction,
  parsePostForm,
  parseTags,
  publishErrors,
  slugify,
} from "./input";

function form(fields: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
}

describe("slugify / isValidSlug", () => {
  it("turns a title into a URL slug", () => {
    expect(slugify("Why I moved off WordPress!")).toBe(
      "why-i-moved-off-wordpress",
    );
    expect(slugify("Café & Crème")).toBe("cafe-creme");
  });

  it("accepts lowercase words joined by single hyphens, not the site's own paths", () => {
    expect(isValidSlug("a-post-2")).toBe(true);
    expect(isValidSlug("A-post")).toBe(false);
    expect(isValidSlug("a--post")).toBe(false);
    expect(isValidSlug("-post")).toBe(false);
    expect(isValidSlug("tags")).toBe(false);
    expect(isValidSlug("preview")).toBe(false);
    expect(isValidSlug("")).toBe(false);
  });
});

describe("parseTags", () => {
  it("trims, drops empties, and keeps one tag per slug", () => {
    expect(parseTags(" Astro, tooling,, astro ,  Self  hosting")).toEqual([
      "Astro",
      "tooling",
      "Self hosting",
    ]);
  });
});

describe("parsePostForm", () => {
  it("reads every field and fills the slug from the title", () => {
    const result = parsePostForm(
      form({
        title: " Hello world ",
        slug: "",
        description: "A test.",
        body: "Line\r\nNext",
        tags: "A, B",
        publishedAt: "2026-10-01T08:00:00.000Z",
        commentMode: "closed",
        revised: "on",
      }),
    );
    expect(result).toEqual({
      ok: true,
      input: {
        title: "Hello world",
        slug: "hello-world",
        description: "A test.",
        body: "Line\nNext",
        tags: ["A", "B"],
        publishedAt: new Date("2026-10-01T08:00:00.000Z"),
        commentMode: "closed",
        revised: true,
        seoTitle: "",
        seoDescription: "",
      },
    });
  });

  it("reports each problem by field", () => {
    const result = parsePostForm(
      form({
        title: "",
        slug: "Bad Slug",
        publishedAt: "soon",
        commentMode: "weird",
      }),
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(Object.keys(result.errors).sort()).toEqual([
      "publishedAt",
      "slug",
      "title",
    ]);
    expect(result.input.commentMode).toBe("open");
  });

  it("refuses too many tags", () => {
    const tags = Array.from({ length: 13 }, (_, i) => `t${String(i)}`).join(
      ",",
    );
    const result = parsePostForm(form({ title: "T", tags }));
    expect(result.ok ? null : result.errors.tags).toMatch(/at most 12/);
  });
});

describe("parsePostAction / publishErrors", () => {
  it("falls back to saving", () => {
    expect(parsePostAction("publish")).toBe("publish");
    expect(parsePostAction("unpublish")).toBe("unpublish");
    expect(parsePostAction("delete")).toBe("save");
  });

  it("needs a description to publish", () => {
    const result = parsePostForm(form({ title: "T" }));
    if (!result.ok) throw new Error("expected a valid form");
    expect(publishErrors(result.input).description).toBeDefined();
  });
});

describe("the search fields", () => {
  it("are optional, and trimmed to one line", () => {
    const result = parsePostForm(
      form({
        title: "T",
        seoTitle: "  A search\n title ",
        seoDescription: "",
      }),
    );
    expect(result.ok && result.input.seoTitle).toBe("A search title");
    expect(result.ok && result.input.seoDescription).toBe("");
  });

  it("have length limits", () => {
    const result = parsePostForm(
      form({
        title: "T",
        seoTitle: "x".repeat(POST_LIMITS.seoTitle + 1),
        seoDescription: "x".repeat(POST_LIMITS.seoDescription + 1),
      }),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(Object.keys(result.errors).sort()).toEqual([
        "seoDescription",
        "seoTitle",
      ]);
    }
  });
});
