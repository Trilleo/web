import {
  chuniCharts,
  chuniSdvxEntries,
  chuniSongs,
  openDatabase,
  type DatabaseHandle,
} from "@trilleo/db";
import { LocalDriver } from "@trilleo/storage/server";
import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  JACKET_RETRY_DAYS,
  JACKET_SIDE,
  copyJackets,
  shrinkTo,
  startJacketBatch,
  jacketBatchRunning,
  jacketsDue,
  listJacketsIdle,
  wantJackets,
} from "./jackets";
import { encodePng } from "./png";

const ORIGIN = "https://sdvx.test";
const DAY_MS = 24 * 3600 * 1000;

let handle: DatabaseHandle;
let storage: LocalDriver;
let served: Map<string, Uint8Array>;
let requested: string[];
const clock = new Date("2026-10-24T08:00:00.000Z");

const fakeFetch: typeof fetch = (input) => {
  const url =
    typeof input === "string"
      ? input
      : input instanceof URL
        ? input.href
        : input.url;
  requested.push(url.slice(ORIGIN.length));
  const body = served.get(url);
  return Promise.resolve(
    body
      ? new Response(new Blob([new Uint8Array(body)]), { status: 200 })
      : new Response("missing", { status: 404 }),
  );
};

const copy = (now = clock) =>
  copyJackets(handle.db, storage, {
    fetch: fakeFetch,
    sdvxOrigin: ORIGIN,
    now,
    sleep: () => Promise.resolve(),
  });

const jacketOf = async (id: number) =>
  (
    await handle.db
      .select({ key: chuniSongs.jacketKey })
      .from(chuniSongs)
      .where(eq(chuniSongs.id, id))
  )[0]?.key ?? null;

beforeEach(async () => {
  handle = await openDatabase("memory://");
  storage = new LocalDriver({ root: null, baseUrl: "/api/storage/local" });
  served = new Map();
  requested = [];
  await handle.db.insert(chuniSongs).values([
    { id: 1, title: "One", addedOn: "2026-07-02" },
    { id: 2, title: "Two", addedOn: "2026-10-08" },
    { id: 3, title: "No page" },
  ]);
  await handle.db.insert(chuniCharts).values([
    // Song 1: its Ultima page sorts first by ID, but its own page is tried first.
    { songId: 1, difficulty: "ultima", level: "15", sdvxPath: "ult/00001ult" },
    { songId: 1, difficulty: "master", level: "14", sdvxPath: "01/00001mst" },
    { songId: 2, difficulty: "master", level: "13", sdvxPath: "02/00002mst" },
    { songId: 3, difficulty: "master", level: "12" },
  ]);
  await handle.db.insert(chuniSdvxEntries).values({
    script: "ult/00001ult",
    entryId: "00001",
    kind: "ultima",
    details: {
      title: "One",
      artist: "",
      bpm: null,
      jacket: "/chunithm/01/jacket/00001-alt.png",
      charts: [],
    },
  });
});
afterEach(async () => {
  await handle.close();
});

const png = () =>
  encodePng({ width: 4, height: 4, data: new Uint8Array(64).fill(120) });

describe("copying jackets", () => {
  it("tries a song's own page first, then its others, newest songs first", async () => {
    // The usual place has nothing for song 1; its Ultima page's script names another.
    served.set(`${ORIGIN}/chunithm/01/jacket/00001-alt.png`, png());
    served.set(`${ORIGIN}/chunithm/02/jacket/00002.png`, png());
    expect(await jacketsDue(handle.db, clock)).toBe(2);
    expect(await copy()).toBe(2);
    expect(requested).toEqual([
      "/chunithm/02/jacket/00002.png",
      "/chunithm/01/jacket/00001.png",
      "/chunithm/01/jacket/00001-alt.png",
    ]);
    expect(await jacketOf(1)).toMatch(/^chunithm\/jackets\/1-/);
    expect(await storage.head((await jacketOf(2)) ?? "")).toMatchObject({
      contentType: "image/webp",
    });
    // Song 3 has no sdvx.in page, so nothing is due.
    expect(await jacketsDue(handle.db, clock)).toBe(0);
  });

  it("tries again a day after one couldn't be copied", async () => {
    expect(await copy()).toBe(0);
    expect(await jacketsDue(handle.db, clock)).toBe(0);
    served.set(`${ORIGIN}/chunithm/02/jacket/00002.png`, png());
    const later = new Date(clock.getTime() + JACKET_RETRY_DAYS * DAY_MS + 1000);
    expect(await jacketsDue(handle.db, later)).toBe(2);
    expect(await copy(later)).toBe(1);
    expect(await jacketOf(2)).not.toBeNull();
  });

  it("copies only the songs asked for", async () => {
    served.set(`${ORIGIN}/chunithm/02/jacket/00002.png`, png());
    served.set(`${ORIGIN}/chunithm/01/jacket/00001.png`, png());
    expect(
      await copyJackets(handle.db, storage, {
        fetch: fakeFetch,
        sdvxOrigin: ORIGIN,
        now: clock,
        songIds: [1],
        sleep: () => Promise.resolve(),
      }),
    ).toBe(1);
    expect(await jacketOf(2)).toBeNull();
  });

  it("copies the jackets a list asks for, in the background", async () => {
    served.set(`${ORIGIN}/chunithm/02/jacket/00002.png`, png());
    served.set(`${ORIGIN}/chunithm/01/jacket/00001.png`, png());
    const deps = {
      db: handle.db,
      storage,
      sdvxOrigin: ORIGIN,
      fetch: fakeFetch,
    };
    expect(wantJackets(deps, [2, 3])).toBe(2);
    // Asked again while waiting: not taken twice.
    expect(wantJackets(deps, [2])).toBe(0);
    await listJacketsIdle();
    expect(await jacketOf(2)).not.toBeNull();
    // Song 1 wasn't asked for, and song 3 has no page.
    expect(await jacketOf(1)).toBeNull();
    expect(await jacketOf(3)).toBeNull();
  });

  it("keeps a big jacket at 300px", async () => {
    // Newer jackets on sdvx.in are up to 1000px (and 2.5 MB).
    served.set(
      `${ORIGIN}/chunithm/02/jacket/00002.png`,
      encodePng({
        width: 1000,
        height: 1000,
        data: new Uint8Array(1000 * 1000 * 4).fill(200),
      }),
    );
    expect(await copy()).toBe(1);
    const key = (await jacketOf(2)) ?? "";
    expect(await storage.head(key)).toMatchObject({
      contentType: "image/webp",
    });
  });

  it("retries the ones that failed lately when the admin asks", async () => {
    expect(await copy()).toBe(0);
    served.set(`${ORIGIN}/chunithm/02/jacket/00002.png`, png());
    // A pass the same day skips it; the admin's batch doesn't.
    expect(await copy()).toBe(0);
    expect(
      startJacketBatch({
        db: handle.db,
        storage,
        sdvxOrigin: ORIGIN,
        fetch: fakeFetch,
      }),
    ).toBe(true);
    while (jacketBatchRunning()) await new Promise((r) => setTimeout(r, 20));
    expect(await jacketOf(2)).not.toBeNull();
  });
});

describe("shrinking a jacket", () => {
  it("averages blocks down to the side, and never enlarges", () => {
    const half = new Uint8Array(4 * 2 * 4);
    // Left column black, right column white, all opaque.
    for (let i = 0; i < 8; i++) {
      const white = i % 2 === 1 ? 255 : 0;
      half.set([white, white, white, 255], i * 4);
    }
    const image = { width: 2, height: 4, data: half };
    expect(shrinkTo(image, 4)).toBe(image);
    const small = shrinkTo(
      { width: 600, height: 600, data: new Uint8Array(600 * 600 * 4).fill(90) },
      JACKET_SIDE,
    );
    expect([small.width, small.height]).toEqual([300, 300]);
    expect([...small.data.subarray(0, 4)]).toEqual([90, 90, 90, 90]);
    const grey = shrinkTo(
      { width: 2, height: 2, data: half.subarray(0, 16) },
      1,
    );
    expect([...grey.data]).toEqual([128, 128, 128, 255]);
  });
});
