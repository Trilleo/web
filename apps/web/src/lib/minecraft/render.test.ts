import { describe, expect, it } from "vitest";
import { plainText, renderMarkdown } from "./render";

const OURS = "https://files.trilleo.net/f/abc123def456/shot.png";

describe("renderMarkdown", () => {
  it("renders headings one level down, lists, tables and code", () => {
    const html = renderMarkdown(
      "# Title\n\n## Part\n\n- one\n- two\n\n| a | b |\n|---|---|\n| 1 | 2 |\n\n```\ncode\n```",
    );
    expect(html).toContain("<h2>Title</h2>");
    expect(html).toContain("<h3>Part</h3>");
    expect(html).toContain("<li>one</li>");
    expect(html).toContain('<div class="table-scroll"><table>');
    expect(html).toContain("<pre><code>code\n</code></pre>");
  });

  it("never lets HTML or script links through", () => {
    const html = renderMarkdown(
      "<script>alert(1)</script>\n\n[x](javascript:alert(1)) [y](data:text/html,hi) <img src=x onerror=alert(1)>",
    );
    expect(html).not.toContain("<script");
    expect(html).not.toContain("<img");
    expect(html).not.toContain('href="javascript:');
    expect(html).not.toContain('href="data:');
  });

  it("marks links as user content", () => {
    expect(renderMarkdown("[site](https://example.com)")).toContain(
      'rel="nofollow ugc noopener noreferrer"',
    );
  });

  it("shows only the gallery's images, escaping their alt text", () => {
    const html = renderMarkdown(
      `![A "shot"](${OURS})\n\n![Elsewhere](https://evil.example/x.png)`,
      new Set([OURS]),
    );
    expect(html).toContain(
      `<img src="${OURS}" alt="A &quot;shot&quot;" loading="lazy" decoding="async">`,
    );
    expect(html).not.toContain("evil.example");
    expect(html).toContain("Elsewhere");
  });
});

describe("plainText", () => {
  it("strips Markdown and shortens", () => {
    expect(plainText("## Hi\n\n**Bold** [link](https://x.y) `code`")).toBe(
      "Hi Bold link code",
    );
    expect(plainText("word ".repeat(100), 20)).toHaveLength(20);
  });
});
