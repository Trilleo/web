import {
  chuniBuilds,
  chuniCharts,
  chuniConstants,
  chuniSongs,
  chuniSyncs,
  chuniVersions,
  openDatabase,
  type DatabaseHandle,
} from "@trilleo/db";
import { LocalDriver } from "@trilleo/storage/server";
import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { chartPage, forgetIndex, peekBuild, songIndex } from "./viewer";

let handle: DatabaseHandle;
const storage = new LocalDriver({ root: null, baseUrl: "/api/storage/local" });

beforeEach(async () => {
  handle = await openDatabase("memory://");
  forgetIndex();
  await handle.db.insert(chuniVersions).values([
    { slug: "x-verse-x", name: "X-VERSE-X", sortOrder: 0 },
    { slug: "mate", name: "Mate", sortOrder: 1 },
  ]);
  await handle.db.insert(chuniSongs).values([
    {
      id: 3062,
      title: "コンクエスト・チャレンジ",
      reading: "コンクエストチヤレンシ",
      artist: "サツキ feat.ろん",
      version: "mate",
      jacketKey: "chunithm/jackets/3062-ab.webp",
    },
    { id: 9, title: "Gone", inGame: false, removedIn: "x-verse-x" },
    { id: 10, title: "No charts" },
  ]);
  await handle.db.insert(chuniCharts).values([
    {
      songId: 3062,
      difficulty: "master",
      level: "14+",
      constant: 147,
      sdvxRef: "11061/mst",
    },
    { songId: 3062, difficulty: "basic", level: "4" },
    {
      songId: 9,
      difficulty: "master",
      level: "13",
      sdvxRef: "01009/mst",
      withdrawnAt: new Date(),
    },
  ]);
  await handle.db.insert(chuniSyncs).values({
    startedAt: new Date(),
    finishedAt: new Date(),
    ok: true,
  });
});
afterEach(async () => {
  await handle.close();
});

describe("the catalog index", () => {
  it("lists songs with charts, what can be viewed, and the versions", async () => {
    const { index } = await songIndex(handle.db, storage);
    expect(index.versions.map((v) => v.slug)).toEqual(["x-verse-x", "mate"]);
    expect(index.songs.map((s) => s.id)).toEqual([9, 3062]);
    const song = index.songs.find((s) => s.id === 3062);
    expect(song).toMatchObject({
      jacket: "/api/storage/local/public/chunithm/jackets/3062-ab.webp",
      aliases: [],
      inGame: true,
    });
    expect(song?.charts).toEqual([
      {
        difficulty: "basic",
        level: "4",
        constant: null,
        worldsEndStars: null,
        viewable: false,
      },
      {
        difficulty: "master",
        level: "14+",
        constant: 147,
        worldsEndStars: null,
        viewable: true,
      },
    ]);
    // Withdrawn: listed, not viewable.
    expect(index.songs.find((s) => s.id === 9)?.charts[0]?.viewable).toBe(
      false,
    );
  });

  it("is reused until the next catalog update", async () => {
    const first = await songIndex(handle.db, storage);
    await handle.db
      .update(chuniSongs)
      .set({ title: "Changed" })
      .where(eq(chuniSongs.id, 3062));
    expect((await songIndex(handle.db, storage)).index).toBe(first.index);
    await handle.db.insert(chuniSyncs).values({
      startedAt: new Date(),
      finishedAt: new Date(),
      ok: true,
    });
    const next = await songIndex(handle.db, storage);
    expect(next.key).not.toBe(first.key);
    expect(next.index.songs.find((s) => s.id === 3062)?.title).toBe("Changed");
  });
});

describe("a chart's page", () => {
  it("gathers the song, its charts and its constants, newest first", async () => {
    const [master] = await handle.db
      .select()
      .from(chuniCharts)
      .where(eq(chuniCharts.sdvxRef, "11061/mst"));
    await handle.db.insert(chuniConstants).values([
      { chartId: master?.id ?? 0, version: "x-verse-x", constant: 145 },
      { chartId: master?.id ?? 0, version: "mate", constant: 147 },
    ]);
    const page = await chartPage(handle.db, storage, 3062, "master");
    expect(page?.song.title).toBe("コンクエスト・チャレンジ");
    expect(page?.charts.map((c) => c.difficulty)).toEqual(["basic", "master"]);
    expect(page?.constants).toEqual([
      { version: "mate", name: "Mate", constant: 147 },
      { version: "x-verse-x", name: "X-VERSE-X", constant: 145 },
    ]);
    expect(page?.versionName).toBe("Mate");
    expect(await chartPage(handle.db, storage, 3062, "ultima")).toBeNull();
    expect(await chartPage(handle.db, storage, 1, "master")).toBeNull();
  });

  it("links the original jacket on sdvx.in itself", async () => {
    // Where sdvx.in keeps the song's jacket: its folder's jacket/.
    expect(
      (await chartPage(handle.db, storage, 3062, "master"))?.jacketOriginal,
    ).toBe("https://sdvx.in/chunithm/11/jacket/11061.png");
  });

  it("shows what's built without starting a build", async () => {
    const [master] = await handle.db
      .select()
      .from(chuniCharts)
      .where(eq(chuniCharts.sdvxRef, "11061/mst"));
    if (!master) throw new Error("no chart");
    expect(await peekBuild(handle.db, storage, master, "normal")).toBeNull();
    expect(await handle.db.select().from(chuniBuilds)).toEqual([]);
    await handle.db.insert(chuniBuilds).values({
      chartId: master.id,
      variant: "normal",
      status: "ready",
      builtAt: new Date(),
      manifest: {
        width: 200,
        height: 100,
        gutter: 50,
        lane: 150,
        tiles: [{ key: "chunithm/1/normal-x/0.webp", height: 100 }],
        measures: [24],
        columns: 1,
      },
    });
    expect(await peekBuild(handle.db, storage, master, "normal")).toMatchObject(
      {
        status: "ready",
        manifest: {
          tiles: [
            {
              url: "/api/storage/local/public/chunithm/1/normal-x/0.webp",
              height: 100,
            },
          ],
        },
      },
    );
    expect(
      await peekBuild(
        handle.db,
        storage,
        { ...master, withdrawnAt: new Date() },
        "normal",
      ),
    ).toEqual({ status: "unavailable", reason: "withdrawn" });
  });
});
