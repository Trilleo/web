import type { ToolMeta } from "@trilleo/tool-kit";
import { describe, expect, it } from "vitest";
import { TOOLS, findTool, toolListings, toolPath } from "./registry";

const planned: ToolMeta = {
  slug: "someday",
  name: "Someday",
  description: "Not built yet.",
  status: "planned",
  icon: "notes",
};

describe("the registry", () => {
  it("lists Notes, with unique slugs fit for URLs", () => {
    expect(TOOLS.map((tool) => tool.slug)).toContain("notes");
    const slugs = TOOLS.map((tool) => tool.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const slug of slugs) expect(slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
  });

  it("finds tools by slug", () => {
    expect(findTool("notes")?.name).toBe("Notes");
    expect(findTool("nope")).toBeUndefined();
    expect(findTool(undefined)).toBeUndefined();
  });
});

describe("toolListings", () => {
  it("links tools that exist, and not planned ones", () => {
    const listings = toolListings([...TOOLS, planned]);
    const notes = listings[0];
    const someday = listings.at(-1);
    expect(notes).toMatchObject({
      name: "Notes",
      href: "/tools/notes/",
      status: "live",
    });
    expect(someday).toMatchObject({
      name: "Someday",
      href: null,
      path: "/tools/someday",
    });
  });

  it("puts tools at /tools/<slug>/", () => {
    expect(toolPath("notes")).toBe("/tools/notes/");
  });
});
