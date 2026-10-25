import {
  adminAlerts,
  chuniCharts,
  chuniConstants,
  chuniSdvxPlacements,
  chuniSdvxSongs,
  chuniSongs,
  chuniSyncs,
  chuniVersions,
  openDatabase,
  type DatabaseHandle,
} from "@trilleo/db";
import { and, asc, eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { LocalDriver } from "@trilleo/storage/server";
import { encodePng } from "./png";
import { type ChunithmSources } from "./sources";
import {
  BACKLOG_GAP_MS,
  SDVX_PASS,
  SYNC_EVERY_MS,
  newRefs,
  passDue,
  syncCatalog,
  type SyncDeps,
} from "./sync";

const SOURCES: ChunithmSources = {
  segaUrl: "https://sega.test/music.json",
  otogeUrl: "https://otoge.test/data/",
  sdvxOrigin: "https://sdvx.test",
};
const LISTS = `${SOURCES.sdvxOrigin}/chunithm/_/json/`;

let handle: DatabaseHandle;
let clock: Date;
let files: Map<string, string | Uint8Array>;
let silent: Set<string>;
let requests: string[];

const SONGS = 600;

const segaRow = (id: number, over: Record<string, string> = {}) => ({
  id: String(id),
  catname: "ORIGINAL",
  title: `Song ${String(id)}`,
  reading: "ソング",
  artist: `Artist ${String(id)}`,
  lev_bas: "3",
  lev_adv: "6",
  lev_exp: "10",
  lev_mas: "13+",
  lev_ult: "",
  we_kanji: "",
  we_star: "",
  image: `${String(id)}.jpg`,
  ...over,
});

const otogeRow = (id: number, over: Record<string, string> = {}) => ({
  ...segaRow(id),
  bpm: "180",
  lev_mas_i: "13.7",
  lev_mas_designer: "Someone",
  // otoge-db links the older site's pages.
  lev_mas_chart_link: id === 1 ? "01/01001mst" : "",
  version: id === SONGS ? "Mate" : "X-VERSE-X",
  date_added: id === SONGS ? "20260702" : "20251211",
  ...over,
});

/** A row of sdvx.in's song lists: Expert undrawn ("_10"), Master drawn. */
const sdvxRow = (id: string, title: string, artist: string) => ({
  id,
  title,
  artist,
  genre: "ORIGINAL",
  levels: { bsc: "_3", adv: "_6", exp: "_10", mst: "13+", ult: "" },
  bpm: "180",
  mst: { tap: "900", hold: "100", slide: "200", air: "300", flick: "50" },
  designer: { exp: "", mst: "From sdvx", ult: "" },
});

function setSources(
  sega = Array.from({ length: SONGS }, (_, i) => segaRow(i + 1)),
  otoge = Array.from({ length: SONGS }, (_, i) => otogeRow(i + 1)),
) {
  files.set(SOURCES.segaUrl, JSON.stringify(sega));
  files.set(`${SOURCES.otogeUrl}music-ex.json`, JSON.stringify(otoge));
  files.set(
    `${SOURCES.otogeUrl}music-ex-deleted.json`,
    JSON.stringify([
      otogeRow(900, {
        title: "Gone",
        deleted_date: "20240620",
        version: "NEW",
      }),
    ]),
  );
}

const setFolder = (rows: ReturnType<typeof sdvxRow>[]) =>
  files.set(`${LISTS}songs01.json`, JSON.stringify(rows));

const fakeFetch: typeof fetch = (input) => {
  const url =
    typeof input === "string"
      ? input
      : input instanceof URL
        ? input.href
        : input.url;
  requests.push(url);
  // A request that never answers (it times out).
  if (silent.has(url))
    return Promise.reject(new Error("The operation timed out."));
  const body = files.get(url);
  // sdvx.in sends what it hasn't got to its front page.
  if (body === undefined && url.startsWith(SOURCES.sdvxOrigin))
    return Promise.resolve(
      new Response(null, {
        status: 302,
        headers: { Location: `${SOURCES.sdvxOrigin}/chunithm.php` },
      }),
    );
  return Promise.resolve(
    body === undefined
      ? new Response("missing", { status: 404 })
      : new Response(
          typeof body === "string" ? body : new Blob([new Uint8Array(body)]),
          { status: 200 },
        ),
  );
};

const deps = (over: SyncDeps = {}): SyncDeps => ({
  fetch: fakeFetch,
  sources: SOURCES,
  storage: null,
  now: () => clock,
  sleep: () => Promise.resolve(),
  ...over,
});

beforeEach(async () => {
  handle = await openDatabase("memory://");
  clock = new Date("2026-10-24T08:00:00.000Z");
  requests = [];
  files = new Map();
  silent = new Set();
  setSources();
  setFolder([
    sdvxRow("01001", "Song 1", "Artist 1"),
    sdvxRow("01002", "Song 2", "Artist 2"),
  ]);
  files.set(`${LISTS}songs_del.json`, "[]");
  files.set(`${LISTS}songs_we.json`, "[]");
});
afterEach(async () => {
  await handle.close();
});

const chart = async (songId: number, difficulty: "master" | "expert") => {
  const [row] = await handle.db
    .select()
    .from(chuniCharts)
    .where(
      and(
        eq(chuniCharts.songId, songId),
        eq(chuniCharts.difficulty, difficulty),
      ),
    );
  return row;
};

describe("syncCatalog", () => {
  it("builds the catalog from the three sources", async () => {
    const result = await syncCatalog(handle.db, deps());
    expect(result.ok).toBe(true);
    expect(result.errors).toEqual([]);
    expect(result.songs).toBe(SONGS + 1);
    // songs01, songs_del and songs_we; songs02 and the other lists aren't there.
    expect(result.sdvxLists).toBe(3);
    // The first pass reports nothing as new.
    expect(result.newSongs).toEqual([]);

    expect(await chart(1, "master")).toMatchObject({
      level: "13+",
      constant: 137,
      designer: "Someone",
      noteTypes: { tap: 900, hold: 100, slide: 200, air: 300, flick: 50 },
      sdvxRef: "01001/mst",
      linkedBy: "otoge-db",
    });
    expect(await chart(2, "master")).toMatchObject({
      sdvxRef: "01002/mst",
      linkedBy: "title",
      // otoge-db's designer comes first; sdvx.in's only fills a gap.
      designer: "Someone",
    });
    // Not drawn on sdvx.in yet.
    expect((await chart(2, "expert"))?.sdvxRef).toBeNull();
    const [gone] = await handle.db
      .select()
      .from(chuniSongs)
      .where(eq(chuniSongs.id, 900));
    expect(gone).toMatchObject({ inGame: false, removedOn: "2024-06-20" });

    const versions = await handle.db
      .select()
      .from(chuniVersions)
      .orderBy(asc(chuniVersions.sortOrder));
    expect(versions.map((v) => v.slug)).toEqual(["new", "x-verse-x", "mate"]);
    expect(versions[2]?.startedOn).toBe("2026-07-02");
    const constants = await handle.db
      .select()
      .from(chuniConstants)
      .where(eq(chuniConstants.version, "mate"));
    expect(constants).toHaveLength(SONGS);

    // Only polite requests: each list once, folders until one isn't there, never
    // a chart picture.
    expect(
      requests
        .filter((url) => url.startsWith(LISTS))
        .map((url) => url.slice(LISTS.length)),
    ).toEqual([
      "songs01.json",
      "songs02.json",
      "songs_del.json",
      "songs_we.json",
      "songs_wedel.json",
      "songs_wecourse.json",
      "songs_weuso.json",
    ]);
    expect(requests.some((url) => url.endsWith(".webp"))).toBe(false);
    expect(await handle.db.select().from(adminAlerts)).toEqual([]);
  });

  it("records sdvx.in's songs, keeping them when they drop off a list", async () => {
    await syncCatalog(handle.db, deps());
    setFolder([sdvxRow("01002", "Song 2", "Artist 2")]);
    clock = new Date("2026-10-25T08:00:00.000Z");
    await syncCatalog(handle.db, deps());
    const songs = await handle.db
      .select()
      .from(chuniSdvxSongs)
      .orderBy(asc(chuniSdvxSongs.key));
    expect(songs.map((song) => [song.key, song.title, song.listedAt])).toEqual([
      ["01001", "Song 1", new Date("2026-10-24T08:00:00.000Z")],
      ["01002", "Song 2", clock],
    ]);
    expect((await chart(1, "master"))?.sdvxRef).toBe("01001/mst");
  });

  it("keeps what it had from a list that doesn't answer", async () => {
    await syncCatalog(handle.db, deps());
    silent.add(`${LISTS}songs01.json`);
    const result = await syncCatalog(handle.db, deps());
    expect(result.ok).toBe(true);
    expect(result.errors[0]).toContain("songs01.json");
    expect((await chart(2, "master"))?.sdvxRef).toBe("01002/mst");
  });

  it("stops reading when sdvx.in stops answering", async () => {
    for (let i = 1; i <= 40; i++)
      silent.add(`${LISTS}songs${String(i).padStart(2, "0")}.json`);
    for (const file of [
      "songs_del.json",
      "songs_we.json",
      "songs_wedel.json",
      "songs_wecourse.json",
      "songs_weuso.json",
    ])
      silent.add(`${LISTS}${file}`);
    const result = await syncCatalog(handle.db, deps());
    expect(result.ok).toBe(true);
    expect(requests.filter((url) => url.startsWith(LISTS))).toHaveLength(
      SDVX_PASS.failuresToStop,
    );
    expect(result.errors.at(-1)).toContain(
      `didn't answer ${String(SDVX_PASS.failuresToStop)} times in a row`,
    );
  });

  it("reports new songs and new versions to the admin", async () => {
    await syncCatalog(handle.db, deps());
    clock = new Date("2027-01-10T08:00:00.000Z");
    setSources(
      [
        ...Array.from({ length: SONGS }, (_, i) => segaRow(i + 1)),
        segaRow(SONGS + 1),
      ],
      [
        ...Array.from({ length: SONGS }, (_, i) => otogeRow(i + 1)),
        otogeRow(SONGS + 1, { version: "MOON", date_added: "20270108" }),
      ],
    );
    const result = await syncCatalog(handle.db, deps());
    expect(result.newSongs).toEqual([SONGS + 1]);
    expect(result.newVersions).toEqual(["moon"]);
    const alerts = await handle.db.select().from(adminAlerts);
    expect(alerts).toHaveLength(1);
    expect(alerts[0]).toMatchObject({
      kind: "chunithm-update",
      path: "/admin/chunithm/",
    });
    expect(alerts[0]?.summary).toContain("1 new song");
    // The new version's constants are the current ones; Mate's stay as they were.
    const mate = await handle.db
      .select()
      .from(chuniConstants)
      .where(eq(chuniConstants.version, "mate"));
    const moon = await handle.db
      .select()
      .from(chuniConstants)
      .where(eq(chuniConstants.version, "moon"));
    expect(mate).toHaveLength(SONGS);
    expect(moon).toHaveLength(SONGS + 1);
  });

  it("keeps each version's own constants", async () => {
    await syncCatalog(handle.db, deps());
    // otoge-db froze X-VERSE-X's constants, where song 1's master was 13.5.
    files.set(
      `${SOURCES.otogeUrl}music-ex-xversex-final.json`,
      JSON.stringify(
        Array.from({ length: 120 }, (_, i) =>
          otogeRow(i + 1, { lev_mas_i: i === 0 ? "13.5" : "13.7" }),
        ),
      ),
    );
    clock = new Date("2026-10-26T08:00:00.000Z");
    await syncCatalog(handle.db, deps());
    const master = await chart(1, "master");
    const history = await handle.db
      .select({
        version: chuniConstants.version,
        constant: chuniConstants.constant,
      })
      .from(chuniConstants)
      .where(eq(chuniConstants.chartId, master?.id ?? 0))
      .orderBy(asc(chuniConstants.version));
    expect(history).toEqual([
      { version: "mate", constant: 137 },
      { version: "x-verse-x", constant: 135 },
    ]);
    const [version] = await handle.db
      .select()
      .from(chuniVersions)
      .where(eq(chuniVersions.slug, "x-verse-x"));
    expect(version?.finalConstantsAt).toEqual(clock);
  });

  it("looks for the version that just ended daily, older ones monthly", async () => {
    // An older version, one before X-VERSE-X, among the songs.
    setSources(undefined, [
      ...Array.from({ length: SONGS - 2 }, (_, i) => otogeRow(i + 1)),
      otogeRow(SONGS - 1, { version: "VERSE", date_added: "20241212" }),
      otogeRow(SONGS),
    ]);
    await syncCatalog(handle.db, deps());
    const finals = () =>
      requests
        .filter((url) => url.includes("-final.json"))
        .map((url) => url.split("/").at(-1));
    expect(finals()).toEqual([
      "music-ex-xversex-final.json",
      "music-ex-verse-final.json",
    ]);
    // A day later: the one that just ended again, and one not tried yet.
    requests = [];
    clock = new Date("2026-10-25T09:00:00.000Z");
    await syncCatalog(handle.db, deps());
    expect(finals()).toEqual([
      "music-ex-xversex-final.json",
      "music-ex-new-final.json",
    ]);
    // Another day: only the one that just ended.
    requests = [];
    clock = new Date("2026-10-26T10:00:00.000Z");
    await syncCatalog(handle.db, deps());
    expect(finals()).toEqual(["music-ex-xversex-final.json"]);
  });

  it("marks songs that leave SEGA's list as removed", async () => {
    await syncCatalog(handle.db, deps());
    setSources(Array.from({ length: SONGS - 1 }, (_, i) => segaRow(i + 1)));
    const result = await syncCatalog(handle.db, deps());
    expect(result.removedSongs).toEqual([SONGS]);
    const [song] = await handle.db
      .select()
      .from(chuniSongs)
      .where(eq(chuniSongs.id, SONGS));
    expect(song).toMatchObject({ inGame: false, removedOn: "2026-10-24" });
  });

  it("refuses a list that suddenly lost many songs", async () => {
    await syncCatalog(handle.db, deps());
    // 520 of 600 is under MIN_SHARE_KEPT: a broken list, not a smaller game.
    setSources(Array.from({ length: 520 }, (_, i) => segaRow(i + 1)));
    const result = await syncCatalog(handle.db, deps());
    expect(result.ok).toBe(false);
    expect(result.errors[0]).toContain("not applied");
    const inGame = await handle.db
      .select()
      .from(chuniSongs)
      .where(eq(chuniSongs.inGame, true));
    expect(inGame).toHaveLength(SONGS);
  });

  it("applies nothing when a song list fails, and alerts after a few failures", async () => {
    await syncCatalog(handle.db, deps());
    files.delete(`${SOURCES.otogeUrl}music-ex.json`);
    for (let i = 0; i < 3; i++) {
      const result = await syncCatalog(handle.db, deps());
      expect(result.ok).toBe(false);
      expect(result.errors[0]).toContain("HTTP 404");
    }
    expect(await handle.db.select().from(adminAlerts)).toEqual([]);
    await syncCatalog(handle.db, deps());
    const alerts = await handle.db.select().from(adminAlerts);
    expect(alerts).toHaveLength(1);
    expect(alerts[0]?.summary).toContain("failed 4 times in a row");
    const runs = await handle.db.select().from(chuniSyncs);
    expect(runs.filter((run) => run.ok)).toHaveLength(1);
  });

  it("follows the admin's word on a chart", async () => {
    await syncCatalog(handle.db, deps());
    await handle.db.insert(chuniSdvxPlacements).values([
      { ref: "01002/mst", songId: 3, difficulty: "master" },
      { ref: "01001/mst", songId: null, difficulty: null },
    ]);
    await syncCatalog(handle.db, deps());
    expect(await chart(3, "master")).toMatchObject({
      sdvxRef: "01002/mst",
      linkedBy: "admin",
    });
    expect((await chart(2, "master"))?.sdvxRef).toBeNull();
    expect((await chart(1, "master"))?.sdvxRef).toBeNull();
  });

  it("keeps a withdrawn chart withdrawn", async () => {
    await syncCatalog(handle.db, deps());
    await handle.db
      .update(chuniCharts)
      .set({ withdrawnAt: clock, withdrawnReason: "Asked" })
      .where(eq(chuniCharts.sdvxRef, "01001/mst"));
    await syncCatalog(handle.db, deps());
    expect(await chart(1, "master")).toMatchObject({
      withdrawnReason: "Asked",
      sdvxRef: "01001/mst",
    });
  });

  it("tells the admin about new sdvx.in charts it can't place, not the archive", async () => {
    // The archive has a song long gone: it's no news.
    setFolder([
      sdvxRow("01001", "Song 1", "Artist 1"),
      sdvxRow("01002", "Song 2", "Artist 2"),
      sdvxRow("01007", "Old song", "Someone"),
    ]);
    const first = await syncCatalog(handle.db, deps());
    expect(first.unmatched.map((row) => row.ref)).toEqual(["01007/mst"]);
    clock = new Date("2026-10-25T08:00:00.000Z");
    await syncCatalog(handle.db, deps());
    expect(await handle.db.select().from(adminAlerts)).toEqual([]);

    // A day later sdvx.in adds a chart we can't place: that's news, once.
    setFolder([
      sdvxRow("01001", "Song 1", "Artist 1"),
      sdvxRow("01002", "Song 2", "Artist 2"),
      sdvxRow("01007", "Old song", "Someone"),
      sdvxRow("01008", "Mystery", "Someone"),
    ]);
    clock = new Date("2026-10-26T08:00:00.000Z");
    await syncCatalog(handle.db, deps());
    clock = new Date("2026-10-26T14:00:00.000Z");
    await syncCatalog(handle.db, deps());
    const alerts = await handle.db.select().from(adminAlerts);
    expect(alerts.map((alert) => alert.summary)).toEqual([
      "CHUNITHM: 1 sdvx.in chart to place.",
    ]);
    expect(await newRefs(handle.db, ["01007/mst", "01008/mst"])).toEqual(
      new Set(["01008/mst"]),
    );
  });

  it("copies jackets into storage, and notes the ones it couldn't", async () => {
    const storage = new LocalDriver({
      root: null,
      baseUrl: "/api/storage/local",
    });
    const jacket = encodePng({
      width: 4,
      height: 4,
      data: new Uint8Array(64).fill(200),
    });
    files.set(`${SOURCES.sdvxOrigin}/chunithm/01/jacket/01001.png`, jacket);
    const result = await syncCatalog(handle.db, deps({ storage }));
    expect(result.jackets).toBe(1);
    const [one] = await handle.db
      .select()
      .from(chuniSongs)
      .where(eq(chuniSongs.id, 1));
    expect(one?.jacketKey).toMatch(/^chunithm\/jackets\/1-[0-9a-f]{8}\.webp$/);
    expect(await storage.head(one?.jacketKey ?? "")).toMatchObject({
      contentType: "image/webp",
    });
    // Song 2's jacket isn't on sdvx.in: tried, and left for later.
    const [two] = await handle.db
      .select()
      .from(chuniSongs)
      .where(eq(chuniSongs.id, 2));
    expect(two).toMatchObject({ jacketKey: null, jacketCheckedAt: clock });
  });

  it("does nothing with fetching switched off", async () => {
    const result = await syncCatalog(handle.db, deps({ sources: null }));
    expect(result.ok).toBe(false);
    expect(requests).toEqual([]);
    expect(await handle.db.select().from(chuniSongs)).toEqual([]);
  });
});

describe("when a pass is due", () => {
  const T = 1_800_000_000_000;
  it("chains passes while there's a backlog, every few hours otherwise", () => {
    const backlog = { lastStart: T, lastEnd: T + 60_000, backlog: true };
    expect(passDue(backlog, T + 60_000 + BACKLOG_GAP_MS - 1)).toBe(false);
    expect(passDue(backlog, T + 60_000 + BACKLOG_GAP_MS)).toBe(true);
    const settled = { lastStart: T, lastEnd: T + 60_000, backlog: false };
    expect(passDue(settled, T + BACKLOG_GAP_MS * 10)).toBe(false);
    expect(passDue(settled, T + SYNC_EVERY_MS)).toBe(true);
    // Never run before (after a restart with no rows): due at once.
    expect(passDue({ lastStart: 0, lastEnd: 0, backlog: true }, T)).toBe(true);
  });
});
