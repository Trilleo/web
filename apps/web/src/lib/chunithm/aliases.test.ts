import {
  adminAlerts,
  chuniAliasSuggestions,
  chuniAliases,
  chuniCharts,
  chuniSongs,
  openDatabase,
  users,
  type DatabaseHandle,
} from "@trilleo/db";
import { ALIAS_LIMITS } from "@trilleo/chunithm";
import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  SUGGESTION_LIMITS,
  addAlias,
  aliasExport,
  decideSuggestion,
  importAliases,
  removeAlias,
  songAliases,
  suggestAlias,
  suggestionsFor,
  waitingSuggestions,
} from "./aliases";
import { forgetIndex, songIndex } from "./viewer";

let handle: DatabaseHandle;
let userId: string;
const clock = new Date("2026-10-24T08:00:00.000Z");

beforeEach(async () => {
  handle = await openDatabase("memory://");
  forgetIndex();
  await handle.db.insert(chuniSongs).values([
    { id: 2710, title: "Oracle", artist: "DJ Noriken" },
    { id: 3062, title: "コンクエスト・チャレンジ" },
  ]);
  await handle.db
    .insert(chuniCharts)
    .values({ songId: 2710, difficulty: "master", level: "14+" });
  const [user] = await handle.db
    .insert(users)
    .values({ username: "player", email: "player@example.com" })
    .returning({ id: users.id });
  userId = user?.id ?? "";
});
afterEach(async () => {
  await handle.close();
});

describe("aliases", () => {
  it("are added, refused when they repeat, and removed", async () => {
    const added = await addAlias(handle.db, 2710, " 神谕 ");
    expect(added).toMatchObject({
      ok: true,
      value: { alias: "神谕", key: "神谕" },
    });
    expect(await addAlias(handle.db, 2710, "神谕")).toEqual({
      ok: false,
      error: "taken",
    });
    expect(await addAlias(handle.db, 2710, "ORACLE")).toEqual({
      ok: false,
      error: "title",
    });
    expect(await addAlias(handle.db, 1, "x")).toEqual({
      ok: false,
      error: "no-song",
    });
    expect(await addAlias(handle.db, 2710, "!!")).toEqual({
      ok: false,
      error: "no-letters",
    });
    if (added.ok) await removeAlias(handle.db, added.value.id);
    expect(await songAliases(handle.db, 2710)).toEqual([]);
  });

  it("are searched: the index carries them, under a new ETag", async () => {
    const before = await songIndex(handle.db, null);
    await addAlias(handle.db, 2710, "神谕");
    const { index, key } = await songIndex(handle.db, null);
    expect(key).not.toBe(before.key);
    expect(index.songs.find((s) => s.id === 2710)?.aliases).toEqual(["神谕"]);
  });

  it("stop at the most a song may have", async () => {
    for (let i = 0; i < ALIAS_LIMITS.perSong; i++)
      await addAlias(handle.db, 2710, `name ${String(i)}`);
    expect(await addAlias(handle.db, 2710, "one more")).toEqual({
      ok: false,
      error: "full",
    });
  });
});

describe("suggestions", () => {
  it("wait for the admin, who approves one into an alias", async () => {
    const suggested = await suggestAlias(
      handle.db,
      userId,
      2710,
      "神谕",
      clock,
    );
    expect(suggested.ok).toBe(true);
    // The same name again, by anyone, waits with the first.
    expect(await suggestAlias(handle.db, userId, 2710, "神谕", clock)).toEqual({
      ok: false,
      error: "waiting",
    });
    const [alert] = await handle.db.select().from(adminAlerts);
    expect(alert).toMatchObject({
      kind: "chunithm-alias",
      path: "/admin/chunithm/aliases/",
    });
    const queue = await waitingSuggestions(handle.db);
    expect(queue).toMatchObject([
      { songId: 2710, title: "Oracle", alias: "神谕", username: "player" },
    ]);
    // One song's, for its chart pages.
    expect(await waitingSuggestions(handle.db, 2710)).toHaveLength(1);
    expect(await waitingSuggestions(handle.db, 3062)).toEqual([]);

    expect(
      await decideSuggestion(
        handle.db,
        queue[0]?.id ?? 0,
        true,
        "Thanks",
        clock,
      ),
    ).toEqual({ ok: true, value: undefined });
    expect(await songAliases(handle.db, 2710)).toMatchObject([
      { alias: "神谕", source: "suggestion", suggestedBy: userId },
    ]);
    expect(await suggestionsFor(handle.db, userId, 2710)).toMatchObject([
      { status: "approved", note: "Thanks" },
    ]);
    // Decided once only.
    expect(await decideSuggestion(handle.db, queue[0]?.id ?? 0, false)).toEqual(
      { ok: false, error: "decided" },
    );
  });

  it("can be declined, with a note", async () => {
    const suggested = await suggestAlias(handle.db, userId, 2710, "orc", clock);
    if (!suggested.ok) throw new Error("not suggested");
    await decideSuggestion(handle.db, suggested.value.id, false, "Too vague");
    expect(await songAliases(handle.db, 2710)).toEqual([]);
    expect(await aliasExport(handle.db, userId)).toMatchObject([
      { song: 2710, alias: "orc", status: "declined", note: "Too vague" },
    ]);
  });

  it("are limited per person", async () => {
    for (let i = 0; i < SUGGESTION_LIMITS.perDay; i++)
      await suggestAlias(handle.db, userId, 2710, `try ${String(i)}`, clock);
    expect(
      await suggestAlias(handle.db, userId, 2710, "one more", clock),
    ).toEqual({ ok: false, error: "too-many" });
  });

  it("go with the account; approved names stay, without the author", async () => {
    const suggested = await suggestAlias(
      handle.db,
      userId,
      2710,
      "神谕",
      clock,
    );
    if (!suggested.ok) throw new Error("not suggested");
    await decideSuggestion(handle.db, suggested.value.id, true);
    await suggestAlias(handle.db, userId, 3062, "征服", clock);
    await handle.db.delete(users).where(eq(users.id, userId));
    expect(await handle.db.select().from(chuniAliasSuggestions)).toEqual([]);
    expect(await handle.db.select().from(chuniAliases)).toMatchObject([
      { alias: "神谕", suggestedBy: null },
    ]);
  });
});

describe("importing aliases", () => {
  it("adds what it can and reports the rest", async () => {
    await addAlias(handle.db, 2710, "神谕");
    const report = await importAliases(
      handle.db,
      JSON.stringify({
        "2710": ["神谕", "oracle", "预言"],
        "3062": "征服",
        "9": "x",
      }),
    );
    expect(report).toEqual({
      added: 2,
      skipped: 2,
      unknownSongs: [9],
      problems: [],
    });
    expect((await songAliases(handle.db, 2710)).map((a) => a.alias)).toEqual([
      "神谕",
      "预言",
    ]);
  });
});
