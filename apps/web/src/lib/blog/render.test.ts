// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { addSidenotes } from "../post-html";
import { renderPost } from "./render";

function parse(html: string): Document {
  return new DOMParser().parseFromString(html, "text/html");
}

describe("renderPost", () => {
  it("gives headings GitHub-style ids and lists h2/h3 in the table of contents", async () => {
    const { html, toc } = await renderPost(
      "# Title\n\n## Why `tools` live here\n\n### Step one\n\n#### Deep\n\n## Step one\n",
    );
    const doc = parse(html);
    expect(doc.querySelector("h2")?.id).toBe("why-tools-live-here");
    expect(toc).toEqual([
      { depth: 2, slug: "why-tools-live-here", text: "Why tools live here" },
      { depth: 3, slug: "step-one", text: "Step one" },
      { depth: 2, slug: "step-one-1", text: "Step one" },
    ]);
  });

  it("writes footnotes the way GFM does, so side notes work", async () => {
    const { html } = await renderPost(
      "Cached.[^cache] Done.[^2]\n\n[^cache]: Turborepo hashes *inputs*.\n[^2]: Second.\n",
    );
    const doc = parse(html);
    const ref = doc.querySelector("sup a[data-footnote-ref]");
    expect(ref?.getAttribute("href")).toBe("#user-content-fn-cache");
    expect(ref?.id).toBe("user-content-fnref-cache");
    expect(ref?.textContent).toBe("1");
    expect(
      doc.querySelector("section[data-footnotes] #footnote-label"),
    ).not.toBeNull();
    expect(
      doc
        .querySelector("li#user-content-fn-cache a[data-footnote-backref]")
        ?.getAttribute("href"),
    ).toBe("#user-content-fnref-cache");

    const withNotes = parse(addSidenotes(html));
    expect(withNotes.querySelector(".sidenote")?.textContent).toContain(
      "Turborepo hashes inputs.",
    );
    expect(withNotes.querySelectorAll(".sidenote")).toHaveLength(2);
  });

  it("highlights known languages and leaves others as plain text", async () => {
    const { html } = await renderPost(
      "```ts\nconst a: number = 1;\n```\n\n```nonsense\n<b>x</b>\n```\n",
    );
    const blocks = parse(html).querySelectorAll("pre");
    expect(blocks[0]?.classList.contains("astro-code")).toBe(true);
    expect(blocks[0]?.dataset.language).toBe("ts");
    expect(blocks[0]?.querySelectorAll("span[style]").length).toBeGreaterThan(
      1,
    );
    expect(blocks[1]?.textContent).toBe("<b>x</b>");
    expect(blocks[1]?.querySelector("b")).toBeNull();
  });

  it("uses curly quotes, lazy images, tables and raw HTML", async () => {
    const { html } = await renderPost(
      `"Hi," it's me.\n\n![A cat](/media/abc.png)\n\n| a | b |\n| - | - |\n| 1 | 2 |\n\n<kbd>Ctrl</kbd>\n`,
    );
    const doc = parse(html);
    expect(doc.querySelector("p")?.textContent).toBe("“Hi,” it’s me.");
    expect(doc.querySelector("img")?.getAttribute("loading")).toBe("lazy");
    expect(doc.querySelector("img")?.getAttribute("alt")).toBe("A cat");
    expect(doc.querySelector("table td")?.textContent).toBe("1");
    expect(doc.querySelector("kbd")?.textContent).toBe("Ctrl");
  });
});
