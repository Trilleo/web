import { readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  RESERVED_WIKI_SLUGS,
  WIKI_SLUG_PATTERN,
  checkWikiSlug,
  formatNav,
  normalizeCode,
  parseNav,
  validateWiki,
  type WikiDraft,
} from "./wikis";

describe("wiki slugs", () => {
  it("takes lower-case words joined by hyphens", () => {
    expect(checkWikiSlug("skygrid")).toBeNull();
    expect(checkWikiSlug("trilleo-smp")).toBeNull();
    expect(checkWikiSlug("Sky")).toBe("format");
    expect(checkWikiSlug("a--b")).toBe("format");
    expect(checkWikiSlug("1abc")).toBe("format");
    expect(checkWikiSlug("a")).toBe("length");
    expect(checkWikiSlug("tools")).toBe("reserved");
  });

  it("reserves every top-level path of the main site", () => {
    // The wiki's host serves the same app; a wiki there would hide a page.
    const pages = new URL("../../pages/", import.meta.url);
    // Folders and pages are paths like /tools/; files such as rss.xml.ts are
    // /rss.xml, which no wiki address (no dots) can be.
    const names = readdirSync(pages)
      .filter((name) => !name.startsWith("[") && !name.startsWith("_"))
      .map((name) => name.replace(/\.(astro|ts)$/, ""))
      .filter((name) => !name.includes("."));
    for (const name of names) {
      // Names that can't be slugs anyway (.well-known, 404, …) need no entry.
      if (name === "index" || !WIKI_SLUG_PATTERN.test(name)) continue;
      expect(RESERVED_WIKI_SLUGS.has(name), name).toBe(true);
    }
  });
});

describe("codes", () => {
  it("are 2–5 letters or digits, upper case", () => {
    expect(normalizeCode(" sky ")).toBe("SKY");
    expect(normalizeCode("S")).toBeNull();
    expect(normalizeCode("TOOLONG")).toBeNull();
    expect(normalizeCode("S-K")).toBeNull();
  });
});

describe("the sidebar", () => {
  it("reads sections and links, and writes them back the same", () => {
    const text =
      "Start here\nMain Page\nFirst steps | Getting started\n\nReference\nItems";
    const nav = parseNav(text);
    expect(nav).toEqual([
      {
        label: "Start here",
        links: [
          { label: "Main Page", page: "Main Page" },
          { label: "First steps", page: "Getting started" },
        ],
      },
      { label: "Reference", links: [{ label: "Items", page: "Items" }] },
    ]);
    expect(formatNav(nav)).toBe(text);
  });
});

describe("validateWiki", () => {
  const draft: WikiDraft = {
    slug: "trilleo-smp",
    name: "Trilleo SMP",
    code: "smp",
    description: "",
    kind: "minecraft",
    visibility: "private",
    homeTitle: "main page",
    nav: "Start\nMain Page",
    componentSets: ["unknown"],
  };

  it("accepts a good draft, tidied", () => {
    const result = validateWiki(draft);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.input.code).toBe("SMP");
      expect(result.input.homeTitle).toBe("Main page");
      expect(result.input.componentSets).toEqual(["core"]);
    }
  });

  it("names every problem", () => {
    const result = validateWiki({
      ...draft,
      slug: "admin",
      name: "",
      code: "x",
      kind: "blog",
      visibility: "secret",
      homeTitle: "-",
      nav: "Start\nBad | a#b",
    });
    expect(result.ok).toBe(false);
    if (!result.ok)
      expect(Object.keys(result.errors).sort()).toEqual([
        "code",
        "homeTitle",
        "kind",
        "name",
        "nav",
        "slug",
        "visibility",
      ]);
  });
});
