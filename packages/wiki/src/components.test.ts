import { describe, expect, it } from "vitest";
import { COMPONENTS, componentsFor, effectiveSets } from "./registry";
import { render } from "./test-render";
import { parseField, plainSource, splitSections } from "./syntax";

describe("syntax helpers", () => {
  it("reads fields, sections and plain text", () => {
    expect(parseField("Sells for: 2 coins")).toEqual({
      key: "Sells for",
      value: "2 coins",
    });
    expect(parseField("Time: 10:30")).toEqual({ key: "Time", value: "10:30" });
    expect(parseField("no field here")).toBeNull();
    expect(splitSections("intro\n== A ==\none\n== B ==\ntwo")).toEqual([
      { label: null, body: "intro" },
      { label: "A", body: "one" },
      { label: "B", body: "two" },
    ]);
    expect(plainSource("::: notice\nSee [[Coal|coal]] {{kbd E}}\n:::")).toBe(
      "See coal E",
    );
  });
});

describe("the plugin", () => {
  it("renders blocks, one-line blocks and nested blocks", () => {
    const { html } = render(
      "::: notice tip\nOuter\n\n::: collapse Inner\nDeep\n:::\n:::\n\n::: stub :::\n\nAfter",
    );
    expect(html).toContain('data-tone="tip"');
    expect(html).toMatch(
      /<details class="wiki-collapse"><summary>Inner<\/summary><div class="wiki-collapse-body"><p>Deep<\/p>/,
    );
    expect(html).toContain('data-tone="stub"');
    expect(html).toContain("<p>After</p>");
  });

  it("interrupts a paragraph", () => {
    expect(render("Text\n::: notice\nHi\n:::").html).toContain("wiki-notice");
  });

  it("shows unknown, switched-off, misused and unclosed components as errors", () => {
    expect(render("::: nope\nx\n:::").html).toContain(
      "no component called “nope”.",
    );
    expect(render("::: notice\nx\n:::", ["other"]).html).toContain(
      "switched on",
    );
    expect(render("::: kbd E :::").html).toContain("goes inside a line");
    expect(render("Use {{notice}}.").html).toContain("is a block");
    expect(render("::: notice\nnever closed").html).toContain(
      "has no closing ::: line",
    );
  });

  it("leaves code and lookalikes alone", () => {
    expect(render("`{{kbd E}}`").html).toContain("<code>{{kbd E}}</code>");
    expect(render("```\n::: notice\n```").html).toContain("::: notice");
    expect(render("{{ not a component").html).toContain("{{ not a component");
  });

  it("escapes what's typed", () => {
    const { html } = render(
      '::: infobox <b>"x"</b>\n<i>Key</i>: <script>alert(1)</script>\n:::\n\n{{kbd <b>}} {{badge <img src=x>}}',
    );
    expect(html).not.toMatch(/<(b|i|script|img)\b/);
    expect(html).toContain('aria-label="&lt;b&gt;&quot;x&quot;&lt;/b&gt;"');
  });
});

describe("core components", () => {
  it("infobox: title, picture, rows and sections; first at the top is placed beside the page", () => {
    const { html } = render(
      "::: infobox\nimage: https://files.trilleo.net/a.png\ncaption: A sheaf\nSkill: [Farming](/sky/Farming)\n== Minion ==\nTier I: 30 s\nA note\n:::",
    );
    expect(html).toContain(
      '<section class="wiki-infobox" aria-label="Wheat" data-placement="page">',
    );
    expect(html).toContain('<p class="wiki-infobox-title">Wheat</p>');
    expect(html).toContain(
      '<img src="https://files.trilleo.net/a.png" alt="A sheaf">',
    );
    expect(html).toContain("<figcaption>A sheaf</figcaption>");
    expect(html).toContain(
      '<dt>Skill</dt><dd><a href="/sky/Farming">Farming</a></dd>',
    );
    expect(html).toContain('<p class="wiki-infobox-section">Minion</p>');
    expect(html).toContain('<p class="wiki-infobox-note">A note</p>');
    const nested = render(
      "::: collapse\n::: infobox Inner\nA: b\n:::\n:::",
    ).html;
    expect(nested).not.toContain("data-placement");
  });

  it("notice: kinds, titles, and spoilers that stay closed", () => {
    expect(render("::: notice warning Careful\nx\n:::").html).toContain(
      '<p class="wiki-notice-label"><span class="sr-only">Warning: </span>Careful</p>',
    );
    expect(render("::: notice danger\nx\n:::").html).toContain(
      '<p class="wiki-notice-label">Danger</p>',
    );
    expect(render("::: notice My title\nx\n:::").html).toContain(
      'data-tone="note"',
    );
    expect(
      render("::: notice spoiler Ending\nIt runs away.\n:::").html,
    ).toMatch(
      /^<details class="wiki-notice" data-tone="spoiler"><summary class="wiki-notice-label">Ending<\/summary>/,
    );
  });

  it("tabs: one section per label, and an error without any", () => {
    const { html } = render("::: tabs\n== Java ==\nA\n== Bedrock ==\nB\n:::");
    expect(html.match(/data-tab>/g)).toHaveLength(2);
    expect(html).toContain(
      '<p class="wiki-tab-label" data-tab-label>Bedrock</p>',
    );
    expect(render("::: tabs\njust text\n:::").html).toContain("wiki-error");
  });

  it("collapse, navbox and columns", () => {
    expect(render("::: collapse open\nx\n:::").html).toContain(
      '<details class="wiki-collapse" open><summary>More</summary>',
    );
    const nav = render(
      "::: navbox Mining\nOres: [Coal](/sky/Coal)\nPlain line\n:::",
    ).html;
    expect(nav).toContain('<nav class="wiki-navbox" aria-label="Mining">');
    expect(nav).toContain('<span class="wiki-navbox-group">Ores</span>');
    expect(render("::: navbox\nx\n:::").html).toContain("needs a title");
    expect(render("::: columns 3\n- a\n:::").html).toContain(
      'data-columns="3"',
    );
    expect(render("::: columns 9\n- a\n:::").html).toContain("2, 3 or 4");
  });

  it("badges and keys", () => {
    expect(render("{{badge Stable}}").html).toContain(
      '<span class="wiki-badge" data-tone="neutral">Stable</span>',
    );
    expect(render("{{badge accent New}}").html).toContain(
      'data-tone="accent">New</span>',
    );
    expect(render("{{badge accent}}").html).toContain(
      'data-tone="neutral">accent</span>',
    );
    expect(render("{{kbd Ctrl + Shift+S}}").html).toContain(
      "<kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>S</kbd>",
    );
  });

  it("stub and outdated put the page in their categories", () => {
    const { env } = render(
      "::: stub :::\n\n::: outdated 1.2 :::\n\n::: stub :::",
    );
    expect(env.components?.categories).toEqual(["Stubs", "Outdated pages"]);
    expect(render("::: outdated 1.2 :::").html).toContain("It describes 1.2.");
  });
});

describe("the registry", () => {
  it("has unique names, examples that render without errors, and the core set always on", () => {
    // A block and an inline component may share a name, but not two of one kind.
    const names = COMPONENTS.map(
      (component) => `${component.kind}:${component.name}`,
    );
    expect(new Set(names).size).toBe(names.length);
    for (const component of COMPONENTS) {
      // Examples render as the documentation shows them: on an Item: page.
      expect(
        render(
          component.example,
          ["core", "minecraft"],
          "Item:Aspect of the End",
        ).html,
        component.name,
      ).not.toContain("wiki-error");
    }
    expect([...effectiveSets([])]).toEqual(["core"]);
    expect([...effectiveSets(["core", "unknown"])]).toEqual(["core"]);
    expect(componentsFor(new Set(["core", "minecraft"]))).toHaveLength(
      COMPONENTS.length,
    );
    expect(
      componentsFor(new Set(["core"])).every((c) => c.set === "core"),
    ).toBe(true);
  });
});
