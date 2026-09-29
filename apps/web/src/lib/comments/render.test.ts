import { describe, expect, it } from "vitest";
import { isAllowedLink, renderComment } from "./render";

const REL = 'rel="nofollow ugc noopener noreferrer"';

describe("renderComment: formatting", () => {
  it("makes paragraphs and keeps single line breaks", () => {
    expect(renderComment("one\ntwo\n\nthree")).toBe(
      "<p>one<br>\ntwo</p>\n<p>three</p>\n",
    );
  });

  it("supports inline code, code blocks, emphasis and quotes", () => {
    expect(renderComment("Use `pnpm dev`, *really*, **now**.")).toBe(
      "<p>Use <code>pnpm dev</code>, <em>really</em>, <strong>now</strong>.</p>\n",
    );
    expect(renderComment("```ts\nconst a = 1 < 2;\n```")).toBe(
      '<pre><code class="language-ts">const a = 1 &lt; 2;\n</code></pre>\n',
    );
    expect(renderComment("> quoted")).toBe(
      "<blockquote>\n<p>quoted</p>\n</blockquote>\n",
    );
  });

  it("links web addresses, typed or bare, without endorsing them", () => {
    expect(renderComment("[docs](https://docs.astro.build/)")).toBe(
      `<p><a href="https://docs.astro.build/" ${REL}>docs</a></p>\n`,
    );
    expect(renderComment("see https://example.com/x")).toBe(
      `<p>see <a href="https://example.com/x" ${REL}>https://example.com/x</a></p>\n`,
    );
    expect(renderComment("[an earlier post](/writing/hello/)")).toContain(
      '<a href="/writing/hello/"',
    );
  });

  it.each([
    ["# Heading", "<p># Heading</p>\n"],
    ["- item", "<p>- item</p>\n"],
    ["1. item", "<p>1. item</p>\n"],
    ["| a | b |", "<p>| a | b |</p>\n"],
    ["    indented", "<p>indented</p>\n"],
    ["me@example.com", "<p>me@example.com</p>\n"],
  ])("leaves %j as plain text", (input, output) => {
    expect(renderComment(input)).toBe(output);
  });
});

const ALLOWED_TAGS = new Set([
  "p",
  "br",
  "code",
  "pre",
  "em",
  "strong",
  "blockquote",
  "a",
]);

/** Fails unless every tag is one the formatter makes, and links carry only href + rel. */
function expectOnlySafeMarkup(html: string) {
  for (const [tag, name = "", attributes = ""] of html.matchAll(
    /<([a-z0-9]+)([^>]*)>/gi,
  )) {
    expect(ALLOWED_TAGS, tag).toContain(name.toLowerCase());
    const names = [...attributes.matchAll(/\s([^\s=]+)=/g)].map(
      (match) => match[1],
    );
    const allowed =
      name === "a" ? ["href", "rel"] : name === "code" ? ["class"] : [];
    for (const attribute of names) expect(allowed, tag).toContain(attribute);
  }
}

describe("renderComment: safety", () => {
  it.each([
    "<script>alert(1)</script>",
    '<img src=x onerror="alert(1)">',
    "<a href='https://evil.example' onclick='alert(1)'>x</a>",
    '<iframe src="https://evil.example"></iframe>',
    "<style>body{display:none}</style>",
    '```"><script>alert(1)</script>\ncode\n```',
    "**<b onmouseover=alert(1)>bold</b>**",
  ])("typed HTML stays text: %s", (input) => {
    const html = renderComment(input);
    expectOnlySafeMarkup(html);
    expect(html).toContain("&lt;");
  });

  it.each([
    "[x](javascript:alert(1))",
    "[x](JAVASCRIPT:alert(1))",
    "[x](data:text/html,<script>alert(1)</script>)",
    "[x](vbscript:msgbox)",
    "[x](mailto:me@example.com)",
    "[x](//evil.example)",
    "<javascript:alert(1)>",
  ])("won't make a link of %s", (input) => {
    expect(renderComment(input)).not.toContain("<a ");
  });

  it("keeps a backslash trick on this site", () => {
    // Percent-encoded before it's checked, so browsers read it as a local path.
    expect(renderComment("[x](/\\evil.example)")).toContain(
      'href="/%5Cevil.example"',
    );
  });

  it("never shows images", () => {
    expect(
      renderComment("![alt](https://evil.example/pixel.png)"),
    ).not.toContain("<img");
  });

  it("keeps quotes inside the href", () => {
    const html = renderComment(
      '[x](https://a.example/" onmouseover="alert(1))',
    );
    expectOnlySafeMarkup(html);
    expect(html).not.toContain('" onmouseover');
  });

  it("makes only safe markup from everything it supports at once", () => {
    expectOnlySafeMarkup(
      renderComment(
        "Hi *there*, see [this](https://a.example) and https://b.example.\n\n> `x`\n\n```js\nlet y;\n```",
      ),
    );
  });
});

describe("isAllowedLink", () => {
  it("allows web links and links within the site only", () => {
    expect(isAllowedLink("https://example.com")).toBe(true);
    expect(isAllowedLink("HTTP://example.com")).toBe(true);
    expect(isAllowedLink("/writing/")).toBe(true);
    expect(isAllowedLink("//example.com")).toBe(false);
    expect(isAllowedLink("ftp://example.com")).toBe(false);
    expect(isAllowedLink("relative/path")).toBe(false);
  });
});
