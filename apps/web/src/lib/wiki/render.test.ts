import { describe, expect, it } from "vitest";
import {
  linkedKeys,
  markMissing,
  parseRedirect,
  parseWikiLink,
  renderWikiPage,
  snippet,
  splitInfobox,
  type RenderTarget,
} from "./render";

const SKY: RenderTarget = {
  slug: "sky",
  title: "Iron Ore",
  componentSets: ["core"],
};

describe("parseWikiLink", () => {
  it("reads titles, labels and sections", () => {
    expect(parseWikiLink("iron ore")).toMatchObject({
      kind: "page",
      title: "Iron ore",
      label: "iron ore",
    });
    expect(parseWikiLink("Iron Ore|the ore")).toMatchObject({
      title: "Iron Ore",
      label: "the ore",
    });
    expect(parseWikiLink("Iron Ore#Uses")).toMatchObject({
      title: "Iron Ore",
      fragment: "Uses",
    });
    expect(parseWikiLink("#Uses")).toEqual({
      kind: "section",
      fragment: "Uses",
      label: "Uses",
    });
  });

  it("reads links to other wikis, but not to the site's own paths", () => {
    expect(parseWikiLink("@trilleo-smp:Spawn|spawn")).toMatchObject({
      kind: "other-wiki",
      wiki: "trilleo-smp",
      title: "Spawn",
      label: "spawn",
    });
    expect(parseWikiLink("@minecraft:Spawn")).toBeNull();
    expect(parseWikiLink("@Bad Slug:Spawn")).toBeNull();
  });

  it("refuses what can't be a title", () => {
    expect(parseWikiLink("")).toBeNull();
    expect(parseWikiLink("a<b")).toBeNull();
  });
});

describe("parseRedirect", () => {
  it("finds a redirect on the first line only", () => {
    expect(parseRedirect("#REDIRECT [[iron ore]]")).toBe("Iron ore");
    expect(parseRedirect("  #redirect[[Iron Ore#Uses|x]]\nmore")).toBe(
      "Iron Ore",
    );
    expect(parseRedirect("Text\n#REDIRECT [[Iron Ore]]")).toBeNull();
  });
});

describe("renderWikiPage", () => {
  it("links pages in the same wiki and records them", async () => {
    const page = await renderWikiPage(
      "See [[iron ore]] and [[Coal|coal]].",
      SKY,
    );
    expect(page.html).toContain(
      '<a href="/sky/Iron_ore" class="wiki-link" data-wiki-key="iron ore">iron ore</a>',
    );
    expect(page.html).toContain('href="/sky/Coal"');
    expect(page.links).toEqual([
      { key: "iron ore", title: "Iron ore" },
      { key: "coal", title: "Coal" },
    ]);
    expect(page.plain).toBe("See iron ore and coal .");
  });

  it("collects categories without showing them, and links to them with a colon", async () => {
    const page = await renderWikiPage(
      "Text.\n\n[[Category:Items]] [[category:ores]]\n\nSee [[:Category:Tools]].",
      SKY,
    );
    expect(page.categories).toEqual(["Category:Items", "Category:Ores"]);
    expect(page.html).not.toContain("Category:Items");
    expect(page.html).not.toContain("<p></p>");
    expect(page.html).toContain('href="/sky/Category:Tools"');
  });

  it("marks links to other wikis", async () => {
    const page = await renderWikiPage("[[@trilleo-smp:Spawn]]", SKY);
    expect(page.html).toContain('href="/trilleo-smp/Spawn"');
    expect(page.html).toContain('class="wiki-link-wiki">trilleo-smp</span>');
    expect(page.links).toEqual([]);
  });

  it("starts headings at h2, with ids and a contents list", async () => {
    const page = await renderWikiPage(
      "# Obtaining\n\n## Uses\n\n### From mobs\n\n#### Rare",
      SKY,
    );
    expect(page.html).toContain('<h2 id="obtaining">Obtaining</h2>');
    expect(page.html).toContain('<h2 id="uses">Uses</h2>');
    expect(page.html).toContain('<h3 id="from-mobs">');
    expect(page.html).toContain('<h4 id="rare">');
    expect(page.toc).toEqual([
      { depth: 2, slug: "obtaining", text: "Obtaining" },
      { depth: 2, slug: "uses", text: "Uses" },
      { depth: 3, slug: "from-mobs", text: "From mobs" },
    ]);
  });

  it("keeps HTML as text and refuses unsafe links", async () => {
    const page = await renderWikiPage(
      "<script>alert(1)</script> <img src=x onerror=alert(1)> [x](javascript:alert(1)) [y](data:text/html,hi) [z](https://example.com)",
      SKY,
    );
    expect(page.html).not.toContain("<script");
    expect(page.html).not.toContain("<img");
    expect(page.html).not.toContain('href="javascript:');
    expect(page.html).not.toContain('href="data:');
    expect(page.html).toContain(
      '<a href="https://example.com" rel="nofollow ugc noopener noreferrer">z</a>',
    );
  });

  it("escapes what goes into link attributes", async () => {
    const page = await renderWikiPage('[[Say "hi" & bye|x]]', SKY);
    expect(page.html).toContain('data-wiki-key="say &quot;hi&quot; &amp; bye"');
    expect(linkedKeys(page.html)).toEqual(['say "hi" & bye']);
  });

  it("shows images only from the files domain", async () => {
    const page = await renderWikiPage(
      "![ok](https://files.trilleo.net/a.png) ![no](https://evil.test/a.png)",
      SKY,
    );
    expect(page.html).toContain(
      '<img src="https://files.trilleo.net/a.png" alt="ok"',
    );
    expect(page.html).not.toContain("evil.test");
    expect(page.html).toContain("no");
  });

  it("drops the redirect line from what readers see", async () => {
    const page = await renderWikiPage("#REDIRECT [[Coal]]\nOld notes", SKY);
    expect(page.html).not.toContain("REDIRECT");
    expect(page.html).toContain("Old notes");
  });
});

describe("markMissing", () => {
  it("marks only the links whose pages are missing", async () => {
    const page = await renderWikiPage("[[Coal]] [[Gold]]", SKY);
    const html = markMissing(page.html, new Set(["gold"]));
    expect(html).toContain('class="wiki-link" data-wiki-key="coal"');
    expect(html).toContain('class="wiki-link is-missing" data-wiki-key="gold"');
  });
});

describe("snippet", () => {
  it("cuts long text at a word", () => {
    expect(snippet("short")).toBe("short");
    expect(snippet("alpha beta gamma delta", 15)).toBe("alpha beta…");
  });
});

describe("components on wiki pages", () => {
  it("render, link, categorize and count as text", async () => {
    const page = await renderWikiPage(
      [
        "::: infobox",
        "Mined in: [[Mines]]",
        ":::",
        "",
        "# Uses",
        "",
        "::: notice tip",
        "## Inside",
        "See [[Coal]].",
        ":::",
        "",
        "::: stub :::",
      ].join("\n"),
      SKY,
    );
    expect(page.html).toContain('<p class="wiki-infobox-title">Iron Ore</p>');
    expect(page.links.map((link) => link.title)).toEqual(["Mines", "Coal"]);
    expect(page.categories).toEqual(["Category:Stubs"]);
    expect(page.plain).toContain("Mined in: Mines");
    // Headings inside components start at h2 too; they aren't in the contents.
    expect(page.html).toContain("<h2>Inside</h2>");
    expect(page.toc.map((heading) => heading.text)).toEqual(["Uses"]);
  });

  it("keeps the core set on, and shows unknown components as errors", async () => {
    const page = await renderWikiPage("::: notice\nx\n:::", {
      ...SKY,
      componentSets: [],
    });
    expect(page.html).toContain("wiki-notice");
    const unknown = await renderWikiPage("::: recipe\nx\n:::", SKY);
    expect(unknown.html).toContain("wiki-error");
  });

  it("lifts the first top-level infobox out for the layout", async () => {
    const page = await renderWikiPage(
      [
        "Intro",
        "",
        "::: infobox",
        "A: b",
        ":::",
        "",
        "::: infobox Second",
        "C: d",
        ":::",
      ].join("\n"),
      SKY,
    );
    const { infobox, rest } = splitInfobox(page.html);
    expect(infobox).toMatch(
      /^<section class="wiki-infobox" aria-label="Iron Ore" data-placement="page">/,
    );
    expect(rest).toContain("<p>Intro</p>");
    expect(rest).not.toContain('aria-label="Iron Ore"');
    expect(rest).toContain('aria-label="Second"');
    expect(splitInfobox("<p>none</p>")).toEqual({
      infobox: null,
      rest: "<p>none</p>",
    });
  });
});
