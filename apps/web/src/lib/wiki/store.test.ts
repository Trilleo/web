import {
  openDatabase,
  type DatabaseHandle,
  type User,
  type Wiki,
} from "@trilleo/db";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { upsertGitHubUser } from "../auth/accounts";
import {
  allCategories,
  allPages,
  backlinks,
  categoryMembers,
  createWiki,
  deletePage,
  ensurePageRendered,
  existingKeys,
  findPage,
  listMembers,
  listWikis,
  movePage,
  pageCategories,
  pageHistory,
  protectPage,
  recentChanges,
  removeMember,
  restorePage,
  roleIn,
  savePage,
  searchPages,
  setMember,
  updateWiki,
  wantedPages,
  wikiExport,
  wikiLogEntries,
  type SaveInput,
} from "./store";
import { titleKey } from "./titles";

const now = new Date("2026-10-11T12:00:00Z");
let handle: DatabaseHandle;
let owner: User;
let editor: User;
let wiki: Wiki;

beforeEach(async () => {
  handle = await openDatabase("memory://");
  owner = await upsertGitHubUser(handle.db, {
    id: 1,
    login: "owner",
    name: null,
  });
  editor = await upsertGitHubUser(handle.db, {
    id: 2,
    login: "writer",
    name: null,
  });
  const created = await createWiki(handle.db, owner, {
    slug: "sky",
    name: "Sky",
    code: "SKY",
    description: "",
    kind: "game",
    visibility: "public",
    homeTitle: "Main Page",
    nav: [],
    source: null,
  });
  if (!created.ok) throw new Error("no wiki");
  wiki = created.wiki;
});
afterEach(async () => {
  await handle.close();
});

function save(title: string, body: string, extra: Partial<SaveInput> = {}) {
  return savePage(handle.db, {
    wiki,
    actor: editor,
    title,
    body,
    summary: "",
    minor: false,
    baseRevisionId: null,
    canEditProtected: false,
    now,
    ...extra,
  });
}

describe("wikis and members", () => {
  it("refuses a second wiki at the same address", async () => {
    const again = await createWiki(handle.db, owner, { ...wiki, source: null });
    expect(again).toEqual({ ok: false, error: "taken" });
  });

  it("adds, changes and removes members, and logs it", async () => {
    expect(
      await setMember(handle.db, wiki, owner, "@Writer", "editor"),
    ).toEqual({ ok: true, username: "writer" });
    expect(await roleIn(handle.db, wiki.id, editor.id)).toBe("editor");
    await setMember(handle.db, wiki, owner, "writer", "owner");
    expect(await roleIn(handle.db, wiki.id, editor.id)).toBe("owner");
    expect(await setMember(handle.db, wiki, owner, "nobody", "editor")).toEqual(
      { ok: false, error: "no-user" },
    );
    expect(
      (await listMembers(handle.db, wiki.id)).map((m) => m.username),
    ).toEqual(["writer"]);
    await removeMember(handle.db, wiki, owner, editor.id);
    expect(await roleIn(handle.db, wiki.id, editor.id)).toBeNull();
    const log = await wikiLogEntries(handle.db, wiki.id);
    expect(log.map((entry) => entry.action)).toEqual([
      "member-removed",
      "member-changed",
      "member-added",
      "create-wiki",
    ]);
  });

  it("lists private and unlisted wikis only to their members and the admin", async () => {
    const hidden = await createWiki(handle.db, owner, {
      ...wiki,
      slug: "staff",
      name: "Staff",
      visibility: "private",
      source: null,
    });
    if (!hidden.ok) throw new Error("no wiki");
    await setMember(handle.db, hidden.wiki, owner, "writer", "editor");
    const slugs = async (userId: string | null, admin = false) =>
      (await listWikis(handle.db, userId, admin)).map((s) => s.wiki.slug);
    expect(await slugs(null)).toEqual(["sky"]);
    expect(await slugs(owner.id)).toEqual(["sky"]);
    expect(await slugs(editor.id)).toEqual(["sky", "staff"]);
    expect(await slugs(null, true)).toEqual(["sky", "staff"]);
  });
});

describe("saving pages", () => {
  it("creates a page, then adds revisions on top of the one edited", async () => {
    const first = await save("Iron Ore", "Found in [[Mines]].");
    if (!first.ok) throw new Error(first.error);
    expect(first.created).toBe(true);
    expect(first.page.html).toContain('href="/sky/Mines"');
    const second = await save("iron ore", "Found in [[The Mines]].", {
      baseRevisionId: first.revision.id,
      summary: "Rename",
    });
    if (!second.ok) throw new Error(second.error);
    expect(second.created).toBe(false);
    expect(second.page.title).toBe("Iron Ore");
    const history = await pageHistory(handle.db, first.page.id);
    expect(history.map((r) => [r.summary, r.previousBytes])).toEqual([
      ["Rename", first.revision.bytes],
      ["", null],
    ]);
    expect(history[0]?.author).toBe("writer");
  });

  it("refuses an edit made on top of an old revision, and hands back the new one", async () => {
    const first = await save("Coal", "one");
    if (!first.ok) throw new Error();
    await save("Coal", "two", { baseRevisionId: first.revision.id });
    const late = await save("Coal", "three", {
      baseRevisionId: first.revision.id,
    });
    expect(late.ok).toBe(false);
    if (!late.ok && late.error === "conflict")
      expect(late.current.body).toBe("two");
    else throw new Error("expected a conflict");
  });

  it("saves nothing when nothing changed, and refuses too much", async () => {
    const first = await save("Coal", "one");
    if (!first.ok) throw new Error();
    expect(
      await save("Coal", "one\r\n".trim(), {
        baseRevisionId: first.revision.id,
      }),
    ).toEqual({ ok: false, error: "unchanged" });
    expect(await save("Big", "x".repeat(200_001))).toEqual({
      ok: false,
      error: "too-long",
    });
  });

  it("keeps protected pages for owners", async () => {
    const first = await save("Rules", "Be kind.");
    if (!first.ok) throw new Error();
    await protectPage(handle.db, wiki, owner, first.page, "owners");
    expect(
      await save("Rules", "Be mean.", { baseRevisionId: first.revision.id }),
    ).toEqual({ ok: false, error: "protected" });
    const owners = await save("Rules", "Be kinder.", {
      baseRevisionId: first.revision.id,
      canEditProtected: true,
    });
    expect(owners.ok).toBe(true);
  });

  it("records redirects", async () => {
    const result = await save("Iron", "#REDIRECT [[iron ore]]");
    if (!result.ok) throw new Error();
    expect(result.page.redirectTo).toBe("Iron ore");
  });
});

describe("links and categories", () => {
  beforeEach(async () => {
    await save("Mines", "Has [[Iron Ore]] and [[Gold]]. [[Category:Places]]");
    await save(
      "Iron Ore",
      "Mined in [[Mines]]. [[Category:Items]] [[Category:Ores]]",
    );
  });

  it("finds wanted pages, backlinks and what exists", async () => {
    expect(await wantedPages(handle.db, wiki)).toEqual([
      { title: "Gold", links: 1 },
    ]);
    expect(await backlinks(handle.db, wiki, titleKey("Iron Ore"))).toEqual([
      "Mines",
    ]);
    const found = await existingKeys(handle.db, wiki, [
      "mines",
      "gold",
      "iron ore",
    ]);
    expect([...found].sort()).toEqual(["iron ore", "mines"]);
  });

  it("lists categories and their pages", async () => {
    expect(await categoryMembers(handle.db, wiki, "category:ores")).toEqual([
      "Iron Ore",
    ]);
    expect(await allCategories(handle.db, wiki)).toEqual([
      { title: "Category:Items", pages: 1 },
      { title: "Category:Ores", pages: 1 },
      { title: "Category:Places", pages: 1 },
    ]);
    const page = await findPage(handle.db, wiki.id, "iron ore");
    expect(page && (await pageCategories(handle.db, page.id))).toEqual([
      "Category:Items",
      "Category:Ores",
    ]);
  });

  it("forgets a deleted page's links until it's restored", async () => {
    const mines = await findPage(handle.db, wiki.id, "mines");
    if (!mines) throw new Error();
    await deletePage(handle.db, wiki, owner, mines, "spam");
    expect(await backlinks(handle.db, wiki, "iron ore")).toEqual([]);
    expect(await wantedPages(handle.db, wiki)).toEqual([
      { title: "Mines", links: 1 },
    ]);
    expect((await allPages(handle.db, wiki)).map((p) => p.title)).toEqual([
      "Iron Ore",
    ]);
    const deleted = await findPage(handle.db, wiki.id, "mines");
    if (!deleted) throw new Error();
    await restorePage(handle.db, wiki, owner, deleted);
    expect(await backlinks(handle.db, wiki, "iron ore")).toEqual(["Mines"]);
  });

  it("moves a page and leaves a redirect", async () => {
    const page = await findPage(handle.db, wiki.id, "mines");
    if (!page) throw new Error();
    const moved = await movePage(handle.db, {
      wiki,
      actor: owner,
      page,
      to: "The Mines",
      redirect: true,
      reason: "",
    });
    expect(moved.ok).toBe(true);
    const old = await findPage(handle.db, wiki.id, "mines");
    expect(old?.redirectTo).toBe("The Mines");
    const ore = await findPage(handle.db, wiki.id, "iron ore");
    if (!ore) throw new Error();
    const taken = await movePage(handle.db, {
      wiki,
      actor: owner,
      page: ore,
      to: "the mines",
      redirect: false,
      reason: "",
    });
    expect(taken).toEqual({ ok: false, error: "exists" });
  });

  it("searches titles and text, exact titles first", async () => {
    expect(
      (await searchPages(handle.db, wiki, "iron ore")).map((h) => h.title),
    ).toEqual(["Iron Ore", "Mines"]);
    expect(
      (await searchPages(handle.db, wiki, "gold")).map((h) => h.title),
    ).toEqual(["Mines"]);
    expect(await searchPages(handle.db, wiki, "  ")).toEqual([]);
  });

  it("shows recent changes, newest first", async () => {
    const changes = await recentChanges(handle.db, wiki.id);
    expect(changes.map((c) => c.title)).toEqual(["Iron Ore", "Mines"]);
  });
});

describe("the account export", () => {
  it("has someone's memberships and edits", async () => {
    await setMember(handle.db, wiki, owner, "writer", "editor");
    await save("Coal", "Black rock.", { summary: "New" });
    const data = await wikiExport(handle.db, editor.id);
    expect(data.memberships).toMatchObject([{ wiki: "sky", role: "editor" }]);
    expect(data.edits).toMatchObject([
      { wiki: "sky", page: "Coal", summary: "New", text: "Black rock." },
    ]);
    expect((await wikiExport(handle.db, owner.id)).edits).toEqual([]);
  });
});

describe("items", () => {
  it("are recorded from Item: pages, shown elsewhere, and kept up to date", async () => {
    const created = await createWiki(handle.db, owner, {
      slug: "mc",
      name: "MC",
      code: "MC",
      description: "",
      kind: "minecraft",
      visibility: "public",
      homeTitle: "Main Page",
      nav: [],
      componentSets: ["minecraft"],
    });
    if (!created.ok) throw new Error();
    const mc = created.wiki;
    const saveIn = (title: string, body: string, base: number | null = null) =>
      savePage(handle.db, {
        wiki: mc,
        actor: editor,
        title,
        body,
        summary: "",
        minor: false,
        baseRevisionId: base,
        canEditProtected: true,
        now,
      });

    // Shown before it exists: a link to the page that would describe it.
    const shop = await saveIn("Shop", "Buy {{item Magic Wand}}.");
    if (!shop.ok) throw new Error();
    expect(shop.page.html).toContain("is-missing");

    const wand = await saveIn(
      "Item:Magic Wand",
      "::: item\nrarity: epic\nlore: §7Zap.\n:::",
    );
    if (!wand.ok) throw new Error();
    // The shop shows it the next time it's read.
    const stale = await findPage(handle.db, mc.id, "shop");
    expect(stale?.renderVersion).toBe(0);
    const fresh = stale && (await ensurePageRendered(handle.db, mc, stale));
    expect(fresh?.html).toContain('<span class="mc-c-5">Magic Wand</span>');
    expect(fresh?.html).toContain("Zap.");

    // A change to the item reaches the shop again; deleting it leaves a link.
    await saveIn(
      "Item:Magic Wand",
      "::: item\nrarity: rare\n:::",
      wand.revision.id,
    );
    const again = await findPage(handle.db, mc.id, "shop");
    expect(again?.renderVersion).toBe(0);
    const page = await findPage(handle.db, mc.id, "item:magic wand");
    if (!page) throw new Error();
    await deletePage(handle.db, mc, owner, page, "");
    const gone = await findPage(handle.db, mc.id, "shop");
    const shown = gone && (await ensurePageRendered(handle.db, mc, gone));
    expect(shown?.html).toContain("is-missing");
  });

  it("aren't recorded from other namespaces", async () => {
    const updated = await updateWiki(handle.db, wiki, owner, {
      ...wiki,
      componentSets: ["minecraft"],
    });
    const result = await save("Wand", "::: item\nrarity: epic\n:::", {
      wiki: updated,
    });
    if (!result.ok) throw new Error();
    expect(result.page.html).toContain(
      "Items are described on pages called Item:",
    );
  });
});
