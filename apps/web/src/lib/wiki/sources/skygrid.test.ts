import {
  ISLANDS,
  ISLAND_MAPS,
  ITEMS,
  MOBS,
  RESOURCE_IDS,
  SKILLS,
  SKILL_NAMES,
  itemName,
} from "@trilleo/game-skygrid/core";
import { describe, expect, it } from "vitest";
import { renderWikiPage } from "../render";
import { BUILT_IN_WIKIS } from "../seed";
import { titleKey } from "../titles";
import { skygridSource } from "./skygrid";

const pages = skygridSource.pages();
const titles = new Set(pages.map((page) => titleKey(page.title)));

describe("the Skygrid wiki's generated pages", () => {
  it("have one page per title", () => {
    expect(titles.size).toBe(pages.length);
  });

  it("cover every resource, tool, gear piece, mob, skill and island", () => {
    const expected = [
      ...RESOURCE_IDS.map((id) => itemName(id)),
      ...Object.values(ITEMS)
        .filter(
          (item) =>
            item.kind === "tool" ||
            item.kind === "gear" ||
            item.kind === "enchanted",
        )
        .map((item) => item.name),
      ...Object.values(MOBS).map((mob) => mob.name),
      ...SKILLS.map((skill) => SKILL_NAMES[skill]),
      ...ISLANDS.map((id) => ISLAND_MAPS[id].name),
    ];
    for (const title of expected)
      expect(titles.has(titleKey(title)), title).toBe(true);
  });

  it("only link to pages that exist (generated, or written by the seed)", async () => {
    const skygrid = BUILT_IN_WIKIS.find(
      (builtIn) => builtIn.wiki.slug === "skygrid",
    );
    const written = new Set(skygrid?.pages.map((page) => titleKey(page.title)));
    const missing = new Set<string>();
    for (const page of pages) {
      const rendered = await renderWikiPage(page.body, "skygrid");
      for (const link of rendered.links)
        if (!titles.has(link.key) && !written.has(link.key))
          missing.add(`${page.title} → ${link.title}`);
    }
    expect([...missing]).toEqual([]);
  });

  it("and so do the seed's written pages, and its sidebar", async () => {
    const skygrid = BUILT_IN_WIKIS.find(
      (builtIn) => builtIn.wiki.slug === "skygrid",
    );
    if (!skygrid) throw new Error("no Skygrid wiki");
    const written = new Set(skygrid.pages.map((page) => titleKey(page.title)));
    for (const page of skygrid.pages) {
      const rendered = await renderWikiPage(page.body, "skygrid");
      for (const link of rendered.links)
        expect(
          titles.has(link.key) || written.has(link.key),
          `${page.title} → ${link.title}`,
        ).toBe(true);
    }
    for (const link of skygrid.wiki.nav.flatMap((section) => section.links))
      expect(
        titles.has(titleKey(link.page)) || written.has(titleKey(link.page)),
        link.page,
      ).toBe(true);
  });
});
