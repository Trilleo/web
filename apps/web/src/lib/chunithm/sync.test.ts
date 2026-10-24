import {
  adminAlerts,
  chuniCharts,
  chuniConstants,
  chuniSdvxEntries,
  chuniSdvxOverrides,
  chuniSongs,
  chuniSyncs,
  chuniVersions,
  openDatabase,
  type DatabaseHandle,
} from "@trilleo/db";
import { and, asc, eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { SDVX_LIST_PAGES, type ChunithmSources } from "./sources";
import { newPagePaths, syncCatalog, type SyncDeps } from "./sync";

const SOURCES: ChunithmSources = {
  segaUrl: "https://sega.test/music.json",
  otogeUrl: "https://otoge.test/data/",
  sdvxOrigin: "https://sdvx.test",
};

let handle: DatabaseHandle;
let clock: Date;
let files: Map<string, string>;
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
  lev_mas_chart_link: id === 1 ? "01/00001mst" : "",
  version: id === SONGS ? "Mate" : "X-VERSE-X",
  date_added: id === SONGS ? "20260702" : "20251211",
  ...over,
});

const script = (id: string, title: string, artist: string) =>
  [
    `\uFEFFvar TITLE${id}="<div class=f1>${title}</div>";`,
    `var ARTIST${id}="<div class=b2>\u3000/ ${artist}</div>";`,
    `var BPM${id}="<table><tr><td class=b2>BPM<td width=2><td class=f1>180</table>";`,
    `var CR${id}M="<table><tr><td class=ef>NOTES DESIGNER / From sdvx</table>";`,
    `var LV${id}M="<table><tr><td><a href=/chunithm/01/${id}mst.htm><img src=/chunithm/chfiles/chlv/mst13+.png width=18 height=16></a></table>";`,
    `var CH${id}M="<table><tr><td class=b2>CHAIN<td width=2><td class=mst1>1500</table>";`,
  ].join("\n");

const listPage = (scripts: [string, string][]) =>
  [
    "<script>CHUNITHMVERSEPLUSXLG();</script>",
    ...scripts.map(
      ([file, title]) =>
        `<script src="/chunithm/01/js/${file}.js"></script><script>SORT();</script><!--${title}-->`,
    ),
  ].join("\n");

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

const fakeFetch: typeof fetch = (input) => {
  const url =
    typeof input === "string"
      ? input
      : input instanceof URL
        ? input.href
        : input.url;
  requests.push(url);
  const body = files.get(url);
  return Promise.resolve(
    body === undefined
      ? new Response("missing", { status: 404 })
      : new Response(body, { status: 200 }),
  );
};

const deps = (over: SyncDeps = {}): SyncDeps => ({
  fetch: fakeFetch,
  sources: SOURCES,
  now: () => clock,
  sleep: () => Promise.resolve(),
  ...over,
});

beforeEach(async () => {
  handle = await openDatabase("memory://");
  clock = new Date("2026-10-24T08:00:00.000Z");
  requests = [];
  files = new Map();
  setSources();
  for (const page of SDVX_LIST_PAGES)
    files.set(`${SOURCES.sdvxOrigin}${page}`, "<html></html>");
  files.set(
    `${SOURCES.sdvxOrigin}/chunithm/sort/original.htm`,
    listPage([
      ["00001sort", "Song 1"],
      ["00002sort", "Song 2"],
    ]),
  );
  files.set(
    `${SOURCES.sdvxOrigin}/chunithm/01/js/00001sort.js`,
    script("00001", "Song 1", "Artist 1"),
  );
  files.set(
    `${SOURCES.sdvxOrigin}/chunithm/01/js/00002sort.js`,
    script("00002", "Song 2", "Artist 2"),
  );
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
    expect(result.scriptsRead).toBe(2);
    expect(result.scriptsLeft).toBe(0);
    // The first pass reports nothing as new.
    expect(result.newSongs).toEqual([]);

    expect(await chart(1, "master")).toMatchObject({
      level: "13+",
      constant: 137,
      designer: "Someone",
      chain: 1500,
      sdvxPath: "01/00001mst",
      linkedBy: "otoge-db",
    });
    expect(await chart(2, "master")).toMatchObject({
      sdvxPath: "01/00002mst",
      linkedBy: "title",
    });
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

    // Only polite requests: each script once, never a chart picture.
    expect(requests.filter((url) => url.endsWith("sort.js"))).toHaveLength(2);
    expect(await handle.db.select().from(adminAlerts)).toEqual([]);
  });

  it("reads a few scripts per pass, new ones first, newest folders first", async () => {
    const first = await syncCatalog(handle.db, deps({ scriptsPerPass: 1 }));
    expect(first.scriptsRead).toBe(1);
    expect(first.scriptsLeft).toBe(1);
    expect(requests.filter((url) => url.endsWith("sort.js"))).toEqual([
      `${SOURCES.sdvxOrigin}/chunithm/01/js/00002sort.js`,
    ]);
    expect((await chart(2, "master"))?.sdvxPath).toBe("01/00002mst");
    const second = await syncCatalog(handle.db, deps({ scriptsPerPass: 1 }));
    expect(second.scriptsLeft).toBe(0);
    expect((await chart(1, "master"))?.chain).toBe(1500);
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

  it("follows the admin's word on a page", async () => {
    await syncCatalog(handle.db, deps());
    await handle.db.insert(chuniSdvxOverrides).values([
      { path: "01/00002mst", songId: 3, difficulty: "master" },
      { path: "01/00001mst", songId: null, difficulty: null },
    ]);
    await syncCatalog(handle.db, deps());
    expect(await chart(3, "master")).toMatchObject({
      sdvxPath: "01/00002mst",
      linkedBy: "admin",
    });
    expect((await chart(2, "master"))?.sdvxPath).toBeNull();
    expect((await chart(1, "master"))?.sdvxPath).toBeNull();
  });

  it("keeps a withdrawn chart withdrawn", async () => {
    await syncCatalog(handle.db, deps());
    await handle.db
      .update(chuniCharts)
      .set({ withdrawnAt: clock, withdrawnReason: "Asked" })
      .where(eq(chuniCharts.sdvxPath, "01/00001mst"));
    await syncCatalog(handle.db, deps());
    expect(await chart(1, "master")).toMatchObject({
      withdrawnReason: "Asked",
      sdvxPath: "01/00001mst",
    });
  });

  it("records sdvx.in's entries with their versions", async () => {
    await syncCatalog(handle.db, deps());
    const entries = await handle.db
      .select()
      .from(chuniSdvxEntries)
      .orderBy(asc(chuniSdvxEntries.script));
    expect(entries.map((e) => [e.script, e.version, e.listTitle])).toEqual([
      ["01/00001sort", "x-verse-x", "Song 1"],
      ["01/00002sort", "x-verse-x", "Song 2"],
    ]);
  });

  it("tells the admin about new sdvx.in pages it can't place, not the archive", async () => {
    const page = (entries: [string, string][]) =>
      files.set(
        `${SOURCES.sdvxOrigin}/chunithm/sort/original.htm`,
        listPage(entries),
      );
    // The archive has a page for a song long gone: it's no news.
    page([
      ["00001sort", "Song 1"],
      ["00002sort", "Song 2"],
      ["00007sort", "Old song"],
    ]);
    files.set(
      `${SOURCES.sdvxOrigin}/chunithm/01/js/00007sort.js`,
      script("00007", "Old song", "Someone"),
    );
    const first = await syncCatalog(handle.db, deps());
    expect(first.unmatched.map((row) => row.path)).toEqual(["01/00007mst"]);
    clock = new Date("2026-10-25T08:00:00.000Z");
    await syncCatalog(handle.db, deps());
    expect(await handle.db.select().from(adminAlerts)).toEqual([]);

    // A day later sdvx.in adds a page we can't place: that's news, once.
    page([
      ["00001sort", "Song 1"],
      ["00002sort", "Song 2"],
      ["00007sort", "Old song"],
      ["00008sort", "Mystery"],
    ]);
    files.set(
      `${SOURCES.sdvxOrigin}/chunithm/01/js/00008sort.js`,
      script("00008", "Mystery", "Someone"),
    );
    clock = new Date("2026-10-26T08:00:00.000Z");
    await syncCatalog(handle.db, deps());
    clock = new Date("2026-10-26T14:00:00.000Z");
    await syncCatalog(handle.db, deps());
    const alerts = await handle.db.select().from(adminAlerts);
    expect(alerts.map((alert) => alert.summary)).toEqual([
      "CHUNITHM: 1 sdvx.in page to place.",
    ]);
    expect(
      await newPagePaths(handle.db, ["01/00007mst", "01/00008mst"]),
    ).toEqual(new Set(["01/00008mst"]));
  });

  it("does nothing with fetching switched off", async () => {
    const result = await syncCatalog(handle.db, deps({ sources: null }));
    expect(result.ok).toBe(false);
    expect(requests).toEqual([]);
    expect(await handle.db.select().from(chuniSongs)).toEqual([]);
  });
});
