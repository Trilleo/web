import type { SdvxSong } from "@trilleo/chunithm";
import {
  chuniBuilds,
  chuniCharts,
  chuniLayers,
  chuniSdvxEntries,
  chuniSdvxOverrides,
  chuniSdvxPlacements,
  chuniSongs,
  openDatabase,
  type ChuniBuildManifest,
  type DatabaseHandle,
} from "@trilleo/db";
import { LocalDriver } from "@trilleo/storage/server";
import { asc, eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { checkBuild } from "./build";
import {
  JACKETS_RENUMBERED,
  LANES_RENUMBERED,
  findRef,
  moveBuilds,
  moveLegacyBuilds,
  movePlacements,
  moveSummary,
  moved,
} from "./move";

let handle: DatabaseHandle;
let storage: LocalDriver;
const now = new Date("2026-10-26T08:00:00.000Z");
const ORIGIN = "https://sdvx.test";

/** sdvx.in's new lists: ハイボルテージガール moved from 11060 to 11061. */
const sdvx: SdvxSong[] = [
  song("11060", "SAN値直葬", "Artist A", "14"),
  song("11061", "ハイボルテージガール", "Artist B", "14+"),
  song("01001", "Same", "One", "13"),
  song("01002", "Same", "One", "14"),
];

function song(
  id: string,
  title: string,
  artist: string,
  level: string,
): SdvxSong {
  return {
    key: id,
    id,
    list: "songs",
    title,
    artist,
    genre: "",
    bpm: null,
    removed: null,
    charts: [
      {
        difficulty: "master",
        ref: `${id}/mst`,
        level,
        worldsEndStars: null,
        designer: null,
        noteTypes: null,
      },
    ],
  };
}

const manifest: ChuniBuildManifest = {
  width: 200,
  height: 400,
  gutter: 50,
  lane: 150,
  tiles: [{ key: "chunithm/1/normal-aa/0.webp", height: 400 }],
  measures: [0],
  columns: 2,
};

const legacySource = (path: string) => ({
  path,
  bg: "/chunithm/11/bg/11060bg.png",
  obj: "/chunithm/11/obj/data11060mst.png",
  bar: "/chunithm/11/bg/11060bar.png",
  tags: { bg: '"1"|1', obj: '"1"|2', bar: '"1"|3' },
});

beforeEach(async () => {
  handle = await openDatabase("memory://");
  storage = new LocalDriver({ root: null, baseUrl: "/api/storage/local" });
  await handle.db.insert(chuniSongs).values([
    { id: 1, title: "ハイボルテージガール" },
    { id: 2, title: "SAN値直葬" },
    { id: 3, title: "Unlinked" },
  ]);
});
afterEach(async () => {
  await handle.close();
});

describe("the admin's placements", () => {
  it("finds the older page's chart on the new lists by what it said, not its number", async () => {
    // The older site's 11060 was ハイボルテージガール; now it's 11061.
    await handle.db.insert(chuniSdvxEntries).values([
      {
        script: "11/11060sort",
        entryId: "11060",
        kind: "song",
        details: {
          title: "ハイボルテージガール",
          artist: "Artist B",
          bpm: null,
          charts: [
            {
              difficulty: "master",
              path: "11/11060mst",
              level: "14+",
              worldsEndStars: null,
              designer: null,
              chain: null,
            },
          ],
        },
      },
      {
        script: "01/01002sort",
        entryId: "01002",
        kind: "song",
        details: {
          title: "Same",
          artist: "One",
          bpm: null,
          charts: [
            {
              difficulty: "master",
              path: "01/01002mst",
              level: null,
              worldsEndStars: null,
              designer: null,
              chain: null,
            },
          ],
        },
      },
    ]);
    await handle.db.insert(chuniSdvxOverrides).values([
      { path: "11/11060mst", songId: 1, difficulty: "master" },
      // Two charts called "Same" by One, and no level to tell: its number does.
      { path: "01/01002mst", songId: null, difficulty: null },
      { path: "01/01009mst", songId: 3, difficulty: "master" },
    ]);
    const result = await movePlacements(handle.db, sdvx, now);
    expect(result.placements).toBe(2);
    expect(result.unmoved).toEqual([
      {
        path: "01/01009mst",
        reason:
          "The older page was never read, so there's nothing to find it by.",
      },
    ]);
    expect(
      await handle.db
        .select()
        .from(chuniSdvxPlacements)
        .orderBy(asc(chuniSdvxPlacements.ref)),
    ).toMatchObject([
      {
        ref: "01002/mst",
        songId: null,
        difficulty: null,
        fromPath: "01/01002mst",
      },
      {
        ref: "11061/mst",
        songId: 1,
        difficulty: "master",
        fromPath: "11/11060mst",
      },
    ]);
  });

  it("says why a page can't be found", () => {
    const page = { title: "Nowhere", artist: "", level: null, stars: null };
    expect(findRef(sdvx, "master", page, "01/01005mst")).toEqual({
      reason: 'No master chart called "Nowhere" on sdvx.in\'s lists.',
    });
    expect(
      findRef(
        sdvx,
        "master",
        { title: "Same", artist: "One", level: null, stars: null },
        "02/02001mst",
      ),
    ).toEqual({
      reason: 'Several charts called "Same" fit: 01001/mst, 01002/mst.',
    });
    expect(
      findRef(
        sdvx,
        "master",
        { title: "Same", artist: "One", level: "14", stars: null },
        "02/02001mst",
      ),
    ).toBe("01002/mst");
  });
});

describe("pictures built from the older site", () => {
  const insertChart = async (songId: number, ref: string | null) => {
    const [row] = await handle.db
      .insert(chuniCharts)
      .values({ songId, difficulty: "master", level: "14", sdvxRef: ref })
      .returning({ id: chuniCharts.id });
    return row?.id ?? 0;
  };

  it("keeps good ones, rebuilds suspect ones, clears failures", async () => {
    const good = await insertChart(1, "11061/mst");
    const suspect = await insertChart(2, "11060/mst");
    const unlinked = await insertChart(3, null);
    await handle.db.insert(chuniBuilds).values([
      {
        chartId: good,
        variant: "normal",
        status: "ready",
        manifest,
        builtAt: new Date(LANES_RENUMBERED.getTime() - 1),
        checkedAt: now,
        source: legacySource("11/11060mst"),
      },
      {
        chartId: good,
        variant: "mirror",
        status: "failed",
        error: "The notes layer is 5050×2448, the lanes 5250×1968.",
        source: legacySource("11/11060mst"),
      },
      {
        chartId: suspect,
        variant: "normal",
        status: "ready",
        manifest,
        builtAt: new Date(LANES_RENUMBERED.getTime() + 1),
        source: legacySource("11/11059mst"),
      },
      {
        chartId: unlinked,
        variant: "normal",
        status: "ready",
        manifest,
        builtAt: new Date(LANES_RENUMBERED.getTime() - 1),
        source: legacySource("01/01003mst"),
      },
    ]);
    expect(await moveLegacyBuilds(handle.db, now)).toEqual({
      kept: 1,
      rebuilt: 1,
      retried: 1,
      waiting: 1,
    });
    const rows = await handle.db
      .select()
      .from(chuniBuilds)
      .orderBy(asc(chuniBuilds.id));
    expect(rows.map((row) => [row.chartId, row.variant, row.status])).toEqual([
      [good, "normal", "ready"],
      [suspect, "normal", "queued"],
      [unlinked, "normal", "ready"],
    ]);
    expect(rows[0]).toMatchObject({
      checkedAt: null,
      manifest,
      source: {
        ref: "11061/mst",
        path: "11/11060mst",
        bg: "/chunithm/11/bg/11061bg.webp",
        obj: "/chunithm/11/obj/data11061mst.webp",
        bar: "/chunithm/11/bg/11061bar.webp",
        tags: { bg: "", obj: "", bar: "" },
      },
    });
    // The one waiting for a link keeps its older source until a pass links it.
    expect(rows[2]?.source?.ref).toBeUndefined();
    // Moving again changes nothing.
    expect(await moveLegacyBuilds(handle.db, now)).toEqual({
      kept: 0,
      rebuilt: 0,
      retried: 0,
      waiting: 1,
    });
  });

  it("fills in a moved picture's tags on its first check, without rebuilding", async () => {
    const id = await insertChart(1, "11061/mst");
    await handle.db.insert(chuniBuilds).values({
      chartId: id,
      variant: "normal",
      status: "ready",
      manifest,
      builtAt: new Date(LANES_RENUMBERED.getTime() - 1),
      source: legacySource("11/11060mst"),
    });
    await moveLegacyBuilds(handle.db, now);
    const heads: string[] = [];
    const fetcher: typeof fetch = (input, init) => {
      const url =
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.href
            : input.url;
      heads.push(`${init?.method ?? "GET"} ${url.slice(ORIGIN.length)}`);
      return Promise.resolve(
        new Response(null, {
          status: 200,
          headers: { etag: '"new"', "content-length": "10" },
        }),
      );
    };
    const deps = {
      db: handle.db,
      storage,
      fetch: fetcher,
      sdvxOrigin: ORIGIN,
      now: () => now,
    };
    const [row] = await handle.db.select().from(chuniBuilds);
    expect(await checkBuild(deps, row?.id ?? 0)).toBe("same");
    expect(heads).toEqual([
      "HEAD /chunithm/11/bg/11061bg.webp",
      "HEAD /chunithm/11/obj/data11061mst.webp",
      "HEAD /chunithm/11/bg/11061bar.webp",
    ]);
    const [after] = await handle.db.select().from(chuniBuilds);
    expect(after).toMatchObject({ status: "ready", checkedAt: now });
    expect(after?.source?.tags).toEqual({
      bg: '"new"|10',
      obj: '"new"|10',
      bar: '"new"|10',
    });
    // From then on, a change is a change.
    expect(await checkBuild(deps, row?.id ?? 0)).toBe("same");
  });
});

describe("the move", () => {
  it("removes kept PNG layers, copies suspect jackets again, and is recorded once", async () => {
    await storage.put("chunithm/layers/a.png", new Uint8Array([1]), {
      contentType: "application/octet-stream",
      contentDisposition: "attachment",
      cacheControl: "private, no-store",
    });
    await handle.db.insert(chuniLayers).values({
      url: `${ORIGIN}/chunithm/11/bg/11060bg.png`,
      key: "chunithm/layers/a.png",
      tag: '"1"|1',
      bytes: 1,
      savedAt: now,
    });
    await storage.put("chunithm/jackets/1-aa.webp", new Uint8Array([1]), {
      contentType: "image/webp",
      contentDisposition: "inline",
      cacheControl: "public, max-age=60",
    });
    await handle.db
      .update(chuniSongs)
      .set({
        jacketKey: "chunithm/jackets/1-aa.webp",
        jacketCheckedAt: new Date(JACKETS_RENUMBERED.getTime() + 60_000),
      })
      .where(eq(chuniSongs.id, 1));
    await handle.db
      .update(chuniSongs)
      .set({
        jacketKey: "chunithm/jackets/2-bb.webp",
        jacketCheckedAt: new Date(JACKETS_RENUMBERED.getTime() - 60_000),
      })
      .where(eq(chuniSongs.id, 2));

    expect(await moved(handle.db)).toBe(false);
    const summary = await moveBuilds(handle.db, storage, now, {
      placements: 1,
      unmoved: [{ path: "01/01009mst", reason: "Gone." }],
    });
    expect(summary).toMatchObject({ layers: 1, jackets: 1, placements: 1 });
    expect(await moved(handle.db)).toBe(true);
    expect(await moveSummary(handle.db)).toEqual({ movedAt: now, summary });
    expect(await handle.db.select().from(chuniLayers)).toEqual([]);
    expect(await storage.head("chunithm/layers/a.png")).toBeNull();
    expect(await storage.head("chunithm/jackets/1-aa.webp")).toBeNull();
    const songs = await handle.db
      .select({ id: chuniSongs.id, key: chuniSongs.jacketKey })
      .from(chuniSongs)
      .orderBy(asc(chuniSongs.id));
    expect(songs).toEqual([
      { id: 1, key: null },
      { id: 2, key: "chunithm/jackets/2-bb.webp" },
      { id: 3, key: null },
    ]);
  });
});
