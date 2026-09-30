import { describe, expect, it } from "vitest";
import {
  auditPosts,
  internalLinks,
  knownPages,
  tagPaths,
  type AuditPost,
} from "./seo-audit";

const GOOD_DESCRIPTION =
  "A description long enough for search results, but short enough that nothing of it gets cut off.";

function post(overrides: Partial<AuditPost> = {}): AuditPost {
  return {
    id: 1,
    slug: "hello",
    title: "Hello",
    description: GOOD_DESCRIPTION,
    seoTitle: null,
    seoDescription: null,
    tags: ["Web"],
    html: "<p>Text.</p>",
    ...overrides,
  };
}

const known = knownPages(["/", "/writing/", "/writing/hello/"], ["/media/"]);

describe("internalLinks", () => {
  it("finds this site's links, relative or absolute", () => {
    const html =
      '<a href="/writing/a/">a</a> <a href="https://www.trilleo.net/tools/">b</a> ' +
      '<a href="https://example.com/x">c</a> <a href="#fn1">d</a> <a href="//cdn.example/x">e</a>';
    expect(internalLinks(html)).toEqual(["/writing/a/", "/tools/"]);
  });
});

describe("auditPosts", () => {
  it("passes a post with nothing wrong", () => {
    expect(auditPosts([post()], known)).toEqual([]);
  });

  it("flags missing, short and long descriptions", () => {
    const problems = (description: string) =>
      auditPosts([post({ description })], known)[0]?.problems ?? [];
    expect(problems("")).toContain("No description.");
    expect(problems("Short.")[0]).toMatch(/^Description is short/);
    expect(problems("x ".repeat(100))[0]).toMatch(/results cut at about 155/);
  });

  it("uses the search fields when they're set", () => {
    expect(
      auditPosts(
        [post({ description: "", seoDescription: GOOD_DESCRIPTION })],
        known,
      ),
    ).toEqual([]);
    const [issues] = auditPosts(
      [
        post({
          seoTitle: "A search title that goes on for far too long to fit",
        }),
      ],
      known,
    );
    expect(issues?.problems[0]).toMatch(/^Search title is \d+ characters/);
  });

  it("flags duplicate titles, missing tags and broken links", () => {
    const html =
      '<a href="/writing/hello/#intro">ok</a> <a href="/media/a.png">ok</a> <a href="/writing/gone/">gone</a>';
    const issues = auditPosts(
      [post({ html, tags: [] }), post({ id: 2, slug: "hello-again" })],
      known,
    );
    expect(issues.map((issue) => issue.id)).toEqual([1, 2]);
    expect(issues[0]?.problems).toEqual([
      "Another post has the same search title.",
      "No tags.",
      "Links to /writing/gone/, which doesn't exist.",
    ]);
  });
});

describe("tagPaths", () => {
  it("lists every tag's page", () => {
    expect(tagPaths([{ tags: ["Self hosting"] }])).toEqual([
      "/writing/tags/self-hosting/",
    ]);
  });
});
