import { describe as group, expect, it } from "vitest";
import { meta as notes } from "@trilleo/tool-notes/meta";
import type { PostEntry } from "./posts";
import {
  DESCRIPTION_LENGTH,
  SITE_CARD,
  blogPostingJsonLd,
  breadcrumbJsonLd,
  describe,
  htmlToText,
  ogImagePath,
  postCard,
  serializeJsonLd,
  shortHash,
  toolJsonLd,
  truncate,
  websiteJsonLd,
} from "./seo";
import { SITE_DESCRIPTION } from "./site";

group("htmlToText", () => {
  it("keeps the reading text and drops markup, code and footnotes", () => {
    const html =
      '<h2 id="a">Intro</h2><p>Tom &amp; Jerry&#39;s <em>big</em> day<sup class="footnote-ref"><a href="#fn1">[1]</a></sup>.</p>' +
      '<pre><code>rm -rf /</code></pre><section class="footnotes"><ol><li>Note</li></ol></section>';
    expect(htmlToText(html)).toBe("Intro Tom & Jerry's big day.");
  });
});

group("truncate", () => {
  it("leaves short text alone", () => {
    expect(truncate("  Short.  ")).toBe("Short.");
  });

  it("cuts long text at a word, with an ellipsis", () => {
    const text = "word ".repeat(60);
    const cut = truncate(text);
    expect(cut.length).toBeLessThanOrEqual(DESCRIPTION_LENGTH);
    expect(cut).toMatch(/word…$/);
  });

  it("cuts a single long word mid-word", () => {
    expect(truncate("x".repeat(40), 10)).toBe(`${"x".repeat(9)}…`);
  });
});

group("describe", () => {
  it("prefers the written description", () => {
    expect(describe(" Mine. ", "<p>Body</p>")).toBe("Mine.");
  });

  it("falls back to the start of the text, then the site's", () => {
    expect(describe("", "<p>The body text.</p>")).toBe("The body text.");
    expect(describe("", "")).toBe(SITE_DESCRIPTION);
  });
});

group("share images", () => {
  const post: PostEntry = {
    id: "hello",
    body: "one two three",
    data: {
      title: "Hello",
      description: "",
      pubDate: new Date("2026-09-28T10:00:00Z"),
      tags: ["Docker", "Web", "Astro", "Extra"],
      draft: false,
    },
  };

  it("have a stable hash", () => {
    expect(shortHash("abc")).toBe(shortHash("abc"));
    expect(shortHash("abc")).not.toBe(shortHash("abd"));
  });

  it("get a new URL when what they show changes", () => {
    const card = postCard(post, "007");
    expect(card).toEqual({
      section: "(01) Writing / 007",
      title: "Hello",
      meta: "2026.09.28 · 1 min read · Docker · Web · Astro",
    });
    const url = ogImagePath("posts/hello", card);
    expect(url).toMatch(/^\/og\/posts\/hello\.png\?v=[0-9a-z]+$/);
    expect(ogImagePath("posts/hello", { ...card, title: "Hi" })).not.toBe(url);
    expect(ogImagePath("site", SITE_CARD)).toMatch(/^\/og\/site\.png\?v=/);
  });
});

group("structured data", () => {
  it("describes a post with absolute URLs and ISO dates", () => {
    const data = blogPostingJsonLd({
      title: "Hello",
      description: "A post.",
      path: "/writing/hello/",
      image: "/og/posts/hello.png?v=1",
      published: new Date("2026-09-28T10:00:00Z"),
      tags: ["Docker", "Web"],
      words: 42,
    });
    expect(data).toMatchObject({
      "@type": "BlogPosting",
      headline: "Hello",
      url: "https://www.trilleo.net/writing/hello/",
      image: "https://www.trilleo.net/og/posts/hello.png?v=1",
      datePublished: "2026-09-28T10:00:00.000Z",
      dateModified: "2026-09-28T10:00:00.000Z",
      keywords: "Docker, Web",
      wordCount: 42,
      author: { "@id": "https://www.trilleo.net/#author" },
    });
  });

  it("numbers breadcrumbs from 1", () => {
    const data = breadcrumbJsonLd([
      { name: "Home", path: "/" },
      { name: "Writing", path: "/writing/" },
    ]);
    expect(data.itemListElement).toEqual([
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: "https://www.trilleo.net/",
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Writing",
        item: "https://www.trilleo.net/writing/",
      },
    ]);
  });

  it("points the search box at /writing/?q=", () => {
    expect(JSON.stringify(websiteJsonLd())).toContain(
      "https://www.trilleo.net/writing/?q={search_term_string}",
    );
  });

  it("describes a tool as a free web app", () => {
    expect(
      toolJsonLd(notes, "/tools/notes/", "/og/tools/notes.png"),
    ).toMatchObject({
      "@type": "WebApplication",
      name: notes.name,
      isAccessibleForFree: true,
    });
  });

  it("can't be broken out of by a title", () => {
    // U+2028 ends a line in older JavaScript, even inside a string.
    const title = `</script><script>alert(1)</script> & ${String.fromCharCode(0x2028)}`;
    const json = serializeJsonLd([{ "@type": "Thing", name: title }]);
    expect(json).not.toMatch(/[<>&\u2028]/);
    const parsed = JSON.parse(json) as { "@graph": { name: string }[] };
    expect(parsed["@graph"][0]?.name).toBe(title);
  });
});
