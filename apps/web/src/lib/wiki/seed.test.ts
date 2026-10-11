import { openDatabase, type DatabaseHandle } from "@trilleo/db";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { upsertGitHubUser } from "../auth/accounts";
import { seedBuiltInWikis } from "./seed";
import { allPages, findPage, getWiki, savePage } from "./store";

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
});
