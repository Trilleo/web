import { openDatabase, type DatabaseHandle } from "@trilleo/db";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { upsertGitHubUser } from "../auth/accounts";
import { seedBuiltInWikis } from "./seed";
import { TOWNYMENU } from "./seed-townymenu";
import { allPages, findPage, getWiki, savePage, wantedPages } from "./store";
import { titleFromPath, titleKey } from "./titles";

let handle: DatabaseHandle;

beforeEach(async () => {
  handle = await openDatabase("memory://");
});
afterEach(async () => {
  await handle.close();
});

describe("built-in wikis", () => {
  it("are created with their pages, and never overwritten", async () => {
    await seedBuiltInWikis(handle.db);
    const wiki = await getWiki(handle.db, "skygrid");
    if (!wiki) throw new Error("no Skygrid wiki");
    expect(wiki.source).toBe("skygrid");
    const home = await findPage(handle.db, wiki.id, "main page");
    expect(home?.html).toContain("Skygrid wiki");

    const editor = await upsertGitHubUser(handle.db, {
      id: 3,
      login: "editor",
      name: null,
    });
    await savePage(handle.db, {
      wiki,
      actor: editor,
      title: "Main Page",
      body: "Rewritten.",
      summary: "",
      minor: false,
      baseRevisionId: home?.revisionId ?? null,
      canEditProtected: true,
    });
    await seedBuiltInWikis(handle.db);
    expect((await findPage(handle.db, wiki.id, "main page"))?.html).toContain(
      "Rewritten.",
    );
    const pages = await allPages(handle.db, wiki);
    expect(
      pages.filter((page) => !page.generated).map((page) => page.title),
    ).toEqual(["Getting started", "Main Page"]);
  });

  it("can't be shadowed by a written page", async () => {
    await seedBuiltInWikis(handle.db);
    const wiki = await getWiki(handle.db, "skygrid");
    if (!wiki) throw new Error();
    const result = await savePage(handle.db, {
      wiki,
      actor: null,
      title: "wheat",
      body: "Fake.",
      summary: "",
      minor: false,
      baseRevisionId: null,
      canEditProtected: true,
    });
    expect(result).toEqual({ ok: false, error: "generated" });
  });

  it("include the TownyMenu wiki, whose pages and menu buttons all lead somewhere", async () => {
    await seedBuiltInWikis(handle.db);
    const wiki = await getWiki(handle.db, "townymenu");
    if (!wiki) throw new Error("no TownyMenu wiki");
    expect(wiki.componentSets).toContain("minecraft");
    const pages = await allPages(handle.db, wiki);
    expect(pages.map((page) => page.title).sort()).toEqual(
      TOWNYMENU.pages.map((page) => page.title).sort(),
    );
    expect(await wantedPages(handle.db, wiki)).toEqual([]);

    const html = new Map<string, string>();
    for (const page of TOWNYMENU.pages) {
      const found = await findPage(handle.db, wiki.id, titleKey(page.title));
      if (!found) throw new Error(`${page.title} wasn't saved`);
      expect(found.html, page.title).not.toContain("wiki-error");
      html.set(titleKey(page.title), found.html);
    }
    // Every link to a section of another page finds its heading.
    let sections = 0;
    for (const [key, page] of html) {
      for (const match of page.matchAll(
        /href="\/townymenu\/([^"#]*)#([^"]+)"/g,
      )) {
        const target = titleFromPath(decodeURIComponent(match[1] ?? ""));
        const body = html.get(titleKey(target ?? ""));
        expect(body, `${key} → ${match[1] ?? ""}`).toBeDefined();
        expect(body, `${key} → ${match[1] ?? ""}#${match[2] ?? ""}`).toContain(
          `id="${decodeURIComponent(match[2] ?? "")}"`,
        );
        sections += 1;
      }
    }
    expect(sections).toBeGreaterThan(20);
    // The menus are drawn: the main page's main menu has its buttons.
    const home = html.get("main page") ?? "";
    expect(home).toContain('class="mc-inventory mc-menu"');
    expect(home).toContain('href="/townymenu/Town_menu"');
  });
});
