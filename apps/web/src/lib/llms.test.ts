import { meta as skygrid } from "@trilleo/game-skygrid/meta";
import { meta as notes } from "@trilleo/tool-notes/meta";
import { describe, expect, it } from "vitest";
import { llmsTxt } from "./llms";
import { SITE_NAME } from "./site";

describe("llmsTxt", () => {
  it("names the site, then lists posts and tools as links", () => {
    const text = llmsTxt(
      [
        {
          slug: "hello",
          title: "Hello [world]",
          description: "A first\npost.",
        },
      ],
      [notes, { ...notes, slug: "later", name: "Later", status: "planned" }],
    );
    const lines = text.split("\n");
    expect(lines[0]).toBe(`# ${SITE_NAME}`);
    expect(lines[2]).toMatch(/^> /);
    expect(text).toContain(
      "- [Hello world](https://www.trilleo.net/writing/hello/): A first post.",
    );
    expect(text).toContain(
      `- [Notes](https://www.trilleo.net/tools/notes/): ${notes.description}`,
    );
    expect(text).not.toContain("Later");
  });

  it("lists the information pages under Optional", () => {
    const text = llmsTxt([], []);
    const optional = text.slice(text.indexOf("## Optional"));
    expect(optional).toContain("(https://www.trilleo.net/legal/privacy/)");
    expect(optional).toContain("(https://www.trilleo.net/contact/)");
  });

  it("lists playable games, and leaves the section out when there are none", () => {
    const text = llmsTxt(
      [],
      [],
      [
        skygrid,
        { ...skygrid, slug: "someday", name: "Someday", status: "planned" },
      ],
    );
    expect(text).toContain(
      `## Games

- [Skygrid](https://www.trilleo.net/games/skygrid/): ${skygrid.description}`,
    );
    expect(text).not.toContain("Someday");
    expect(llmsTxt([], [])).not.toContain("## Games");
  });

  it("says so when there's nothing yet", () => {
    expect(llmsTxt([], [])).toContain("No posts yet.");
  });
});
