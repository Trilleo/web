import { COLUMN, TILE_HEIGHT } from "@trilleo/chunithm";
import { makeChart, makeOldLayer } from "@trilleo/chunithm/testing";
import {
  chuniBuilds,
  chuniCharts,
  chuniLayers,
  chuniSongs,
  openDatabase,
  type DatabaseHandle,
} from "@trilleo/db";
import { LocalDriver, StorageError, readBytes } from "@trilleo/storage/server";
import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { restoreChart, withdrawChart } from "./admin";
import {
  BUILD_LIMITS,
  BUILD_VERSION,
  buildOverview,
  checkBuild,
  requestBuild,
  resetBuilds,
  resetVisitorLimits,
  runBuilds,
  type BuildDeps,
} from "./build";
import { LAYER_KEEP_DAYS, keptLayers, purgeOldLayers } from "./layers";
import { decodePng, encodePng } from "./png";
import { decodeWebp, encodeWebp, isWebp } from "./webp";

/** A layer as sdvx.in serves them, but lossless, so tests can check pixels. */
const webp = (image: Parameters<typeof encodeWebp>[0]) =>
  encodeWebp(image, { lossless: true });

const ORIGIN = "https://sdvx.test";
const HOUR_MS = 3600 * 1000;

let handle: DatabaseHandle;
let storage: LocalDriver;
let clock: Date;
interface Served {
  body: Uint8Array | string;
  etag?: string;
  status?: number;
}
let files: Map<string, Served>;
let requests: { url: string; method: string; redirect: string }[];
let chartId: number;

// Three columns (the middle one taller), 400px high, labels at a few measures.
const HEIGHT = 400;
const TOPS = [100, 60, 150];
const LABELS = [10, 250, 300, 600, 790];
const chart = makeChart(HEIGHT, TOPS, LABELS);

const fakeFetch: typeof fetch = (input, init) => {
  const url =
    typeof input === "string"
      ? input
      : input instanceof URL
        ? input.href
        : input.url;
  requests.push({
    url,
    method: init?.method ?? "GET",
    redirect: init?.redirect ?? "follow",
  });
  const file = files.get(url);
  if (!file) return Promise.resolve(new Response("missing", { status: 404 }));
  const body =
    init?.method === "HEAD"
      ? null
      : typeof file.body === "string"
        ? file.body
        : new Blob([new Uint8Array(file.body)]);
  const length =
    typeof file.body === "string"
      ? new TextEncoder().encode(file.body).length
      : file.body.length;
  return Promise.resolve(
    new Response(body, {
      status: file.status ?? 200,
      headers: {
        "content-length": String(length),
        ...(file.etag ? { etag: file.etag } : {}),
      },
    }),
  );
};

const deps = (over: Partial<BuildDeps> = {}): BuildDeps => ({
  db: handle.db,
  storage,
  fetch: fakeFetch,
  sdvxOrigin: ORIGIN,
  now: () => clock,
  ...over,
});

const layer = (body: Uint8Array, etag = '"1"') => ({ body, etag });

beforeEach(async () => {
  handle = await openDatabase("memory://");
  resetVisitorLimits();
  storage = new LocalDriver({ root: null, baseUrl: "/api/storage/local" });
  clock = new Date("2026-10-24T08:00:00.000Z");
  requests = [];
  files = new Map<string, Served>([
    [`${ORIGIN}/chunithm/01/bg/01001bg.webp`, layer(await webp(chart.bg))],
    [
      `${ORIGIN}/chunithm/01/obj/data01001mst.webp`,
      layer(await webp(chart.obj)),
    ],
    [
      `${ORIGIN}/chunithm/01/obj/mrr01001mst.webp`,
      layer(await webp(chart.obj)),
    ],
    [`${ORIGIN}/chunithm/01/bg/01001bar.webp`, layer(await webp(chart.bar))],
  ]);
  await handle.db.insert(chuniSongs).values({ id: 1, title: "One" });
  const [row] = await handle.db
    .insert(chuniCharts)
    .values({
      songId: 1,
      difficulty: "master",
      level: "14",
      sdvxRef: "01001/mst",
    })
    .returning({ id: chuniCharts.id });
  chartId = row?.id ?? 0;
});
afterEach(async () => {
  await handle.close();
});

/** Whether a tile is served to anyone (the local driver's public URL). */
async function served(url: string): Promise<boolean> {
  const path = url.slice("/api/storage/local/".length);
  const response = await storage.handle(new Request(`http://site${url}`), path);
  return response.status === 200;
}

describe("building a chart's picture", () => {
  it("asks the human check only before queueing a new build", async () => {
    let asked = 0;
    const refuse = () => {
      asked += 1;
      return Promise.resolve(false);
    };
    expect(await requestBuild(deps(), chartId, "normal", "", refuse)).toEqual({
      status: "unavailable",
      reason: "human-check",
    });
    expect(asked).toBe(1);
    const allow = () => {
      asked += 1;
      return Promise.resolve(true);
    };
    expect(await requestBuild(deps(), chartId, "normal", "", allow)).toEqual({
      status: "queued",
    });
    // Waiting or ready pictures need no check.
    await requestBuild(deps(), chartId, "normal", "", refuse);
    expect(await runBuilds(deps())).toBe(1);
    const ready = await requestBuild(deps(), chartId, "normal", "", refuse);
    expect(ready.status).toBe("ready");
    expect(asked).toBe(2);
  });

  it("is asked for, built, and then ready with its tiles and measures", async () => {
    expect(await requestBuild(deps(), chartId, "normal")).toEqual({
      status: "queued",
    });
    expect(await requestBuild(deps(), chartId, "normal")).toEqual({
      status: "queued",
    });
    expect(await runBuilds(deps())).toBe(1);

    const state = await requestBuild(deps(), chartId, "normal");
    if (state.status !== "ready") throw new Error(`not ready: ${state.status}`);
    const { manifest } = state;
    expect(manifest).toMatchObject({
      v: 1,
      width: COLUMN.pitch,
      height: chart.total,
      gutter: COLUMN.gutter,
      lane: COLUMN.lane,
      measures: LABELS,
      columns: 3,
    });
    expect(manifest.tiles.reduce((sum, tile) => sum + tile.height, 0)).toBe(
      chart.total,
    );
    expect(manifest.tiles.every((tile) => tile.height <= TILE_HEIGHT)).toBe(
      true,
    );
    expect(await served(manifest.tiles[0]?.url ?? "")).toBe(true);

    // Every layer was fetched once, without following redirects.
    const layers = requests.filter((r) => r.url.endsWith(".webp"));
    expect(layers.map((r) => r.redirect)).toEqual([
      "manual",
      "manual",
      "manual",
    ]);

    const [row] = await handle.db.select().from(chuniBuilds);
    expect(row).toMatchObject({
      status: "ready",
      version: BUILD_VERSION,
      attempts: 0,
      error: null,
      hidden: false,
    });
    expect(row?.source).toMatchObject({
      ref: "01001/mst",
      obj: "/chunithm/01/obj/data01001mst.webp",
    });
  });

  it("builds a chart whose lanes and numbers are sdvx.in's older, half-size drawing", async () => {
    // As Oshama Scramble!'s and 乗り切れ受験ウォーズ's Masters still are.
    files.set(
      `${ORIGIN}/chunithm/01/bg/01001bg.webp`,
      layer(await webp(makeOldLayer(chart.bg))),
    );
    files.set(
      `${ORIGIN}/chunithm/01/bg/01001bar.webp`,
      layer(await webp(makeOldLayer(chart.bar))),
    );
    await requestBuild(deps(), chartId, "normal");
    await runBuilds(deps());
    const state = await requestBuild(deps(), chartId, "normal");
    if (state.status !== "ready") throw new Error(`not ready: ${state.status}`);
    expect(state.manifest).toMatchObject({ height: chart.total, columns: 3 });
    expect(state.manifest.measures).toHaveLength(LABELS.length);
    state.manifest.measures.forEach((p, i) => {
      expect(Math.abs(p - (LABELS[i] ?? 0))).toBeLessThanOrEqual(1);
    });
  });

  it("puts notes on plain lanes when sdvx.in's lanes and numbers are another chart's", async () => {
    // As Lapis's Ultima: the song's lanes are its other difficulties', another size.
    const other = makeChart(HEIGHT + 30, [...TOPS, 80], LABELS);
    files.set(
      `${ORIGIN}/chunithm/01/bg/01001bg.webp`,
      layer(await webp(other.bg)),
    );
    files.set(
      `${ORIGIN}/chunithm/01/bg/01001bar.webp`,
      layer(await webp(other.bar)),
    );
    await requestBuild(deps(), chartId, "normal");
    await runBuilds(deps());
    const state = await requestBuild(deps(), chartId, "normal");
    if (state.status !== "ready") throw new Error(`not ready: ${state.status}`);
    expect(state.manifest).toMatchObject({
      height: chart.total,
      columns: 3,
      measures: [],
      plainLanes: true,
    });
    // The measure numbers' tag is kept too, to notice sdvx.in drawing proper ones.
    const [row] = await handle.db.select().from(chuniBuilds);
    expect(row?.source?.tags.bar).not.toBe("");
  });

  it("makes the tiles right: the strip, bottom first, on black", async () => {
    await requestBuild(deps(), chartId, "normal");
    await runBuilds(deps());
    const [row] = await handle.db.select().from(chuniBuilds);
    const key = row?.manifest?.tiles[0]?.key ?? "";
    const bytes = await readBytes(await storage.read(key));
    // WebP: RIFF....WEBP.
    expect(new TextDecoder().decode(bytes.subarray(8, 12))).toBe("WEBP");
    expect(row?.manifest?.tiles[0]?.height).toBe(chart.total);
  });

  it("copies the song's jacket when one of its charts is opened", async () => {
    files.set(`${ORIGIN}/chunithm/01/jacket/01001.png`, {
      body: encodePng({
        width: 4,
        height: 4,
        data: new Uint8Array(64).fill(90),
      }),
    });
    await requestBuild(deps(), chartId, "normal");
    await expect
      .poll(async () => {
        const [song] = await handle.db
          .select({ jacketKey: chuniSongs.jacketKey })
          .from(chuniSongs)
          .where(eq(chuniSongs.id, 1));
        return song?.jacketKey ?? null;
      })
      .toMatch(/^chunithm\/jackets\/1-[0-9a-f]{8}\.webp$/);
  });

  it("builds the mirror from sdvx.in's mirrored notes", async () => {
    await requestBuild(deps(), chartId, "mirror");
    await runBuilds(deps());
    const [row] = await handle.db.select().from(chuniBuilds);
    expect(row).toMatchObject({ variant: "mirror", status: "ready" });
    expect(row?.source?.obj).toBe("/chunithm/01/obj/mrr01001mst.webp");
  });

  it("fails cleanly when a layer is missing, and says which", async () => {
    // sdvx.in sends missing files to an HTML page.
    files.set(`${ORIGIN}/chunithm/01/obj/data01001mst.webp`, {
      body: "<!DOCTYPE html>",
      status: 302,
    });
    await requestBuild(deps(), chartId, "normal");
    expect(await runBuilds(deps())).toBe(0);
    const state = await requestBuild(deps(), chartId, "normal");
    expect(state).toEqual({
      status: "failed",
      error:
        "sdvx.in has no notes layer for this chart (HTTP 302). The lanes layer is kept, so the next try downloads only the rest.",
      retryAt: new Date(clock.getTime() + HOUR_MS),
    });
    // Nothing half-built was kept.
    const [row] = await handle.db.select().from(chuniBuilds);
    expect(row?.manifest).toBeNull();
  });

  it("picks up a layer whose download broke off, and says so when it never ends", async () => {
    let cuts = 0;
    let always = false;
    const cutting: typeof fetch = (input, init) => {
      const url =
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.href
            : input.url;
      if (url.endsWith("01001bar.webp") && (always || cuts === 0)) {
        cuts++;
        let sent = false;
        return Promise.resolve(
          new Response(
            new ReadableStream({
              pull(controller) {
                if (sent) controller.error(new TypeError("terminated"));
                else {
                  sent = true;
                  controller.enqueue(new Uint8Array([137, 80, 78, 71]));
                }
              },
            }),
            { status: 200, headers: { etag: '"1"' } },
          ),
        );
      }
      return fakeFetch(input, init);
    };
    await requestBuild(deps(), chartId, "normal");
    expect(await runBuilds(deps({ fetch: cutting }))).toBe(1);
    expect(cuts).toBe(1);

    always = true;
    await resetBuilds(handle.db, storage, chartId);
    await requestBuild(deps(), chartId, "normal");
    expect(await runBuilds(deps({ fetch: cutting }))).toBe(0);
    const state = await requestBuild(deps(), chartId, "normal");
    expect(state).toMatchObject({ status: "failed" });
    expect(state.status === "failed" ? state.error : "").toMatch(
      /^The measure numbers layer couldn't be downloaded: the download broke off at 0 KB \(terminated\)\. It's tried again later\. The lanes and notes layers are kept, so the next try downloads only the rest\.$/,
    );
  });

  it("says so when storage refuses the picture", async () => {
    const refusing = new LocalDriver({
      root: null,
      baseUrl: "/api/storage/local",
    });
    refusing.put = () => Promise.reject(new StorageError("Access Denied", 403));
    await requestBuild(deps(), chartId, "normal");
    expect(await runBuilds(deps({ storage: refusing }))).toBe(0);
    const state = await requestBuild(deps(), chartId, "normal");
    expect(state).toMatchObject({
      status: "failed",
      error: "The picture couldn't be saved to storage (Access Denied).",
    });
  });

  it("refuses a layer that isn't a WebP, or one of another size", async () => {
    files.set(`${ORIGIN}/chunithm/01/bg/01001bar.webp`, {
      body: "not a picture",
    });
    await requestBuild(deps(), chartId, "normal");
    await runBuilds(deps());
    let [row] = await handle.db.select().from(chuniBuilds);
    expect(row?.error).toBe(
      "sdvx.in's measure numbers layer for this chart isn't a picture. The lanes and notes layers are kept, so the next try downloads only the rest.",
    );

    files.set(
      `${ORIGIN}/chunithm/01/bg/01001bar.webp`,
      layer(await webp(makeChart(HEIGHT - 10, TOPS, LABELS).bar)),
    );
    clock = new Date(clock.getTime() + 2 * HOUR_MS);
    await requestBuild(deps(), chartId, "normal");
    await runBuilds(deps());
    [row] = await handle.db.select().from(chuniBuilds);
    expect(row?.error).toBe(
      "The measure numbers layer is 650×390, the lanes 650×400. All three layers are kept, so the next try downloads them only if sdvx.in has changed them.",
    );
    expect(row?.attempts).toBe(2);
    // The second failure waits longer.
    expect(row?.nextAttemptAt).toEqual(
      new Date(clock.getTime() + (BUILD_LIMITS.retryDelaysMs[1] ?? 0)),
    );
  });

  it("refuses columns that don't line up", async () => {
    const broken = makeChart(HEIGHT, TOPS, LABELS);
    for (let y = HEIGHT - COLUMN.overlap; y < HEIGHT; y++)
      for (let x = 250; x < 400; x++)
        broken.bg.data.set([255, 0, 0, 255], (y * 650 + x) * 4);
    files.set(
      `${ORIGIN}/chunithm/01/bg/01001bg.webp`,
      layer(await webp(broken.bg)),
    );
    await requestBuild(deps(), chartId, "normal");
    await runBuilds(deps());
    const [row] = await handle.db.select().from(chuniBuilds);
    expect(row?.error).toBe(
      "Columns 1 and 2 don't line up. The lanes and notes layers are kept, so the next try downloads only the rest.",
    );
  });

  it("isn't available for charts without a page, or withdrawn ones", async () => {
    expect(await requestBuild(deps(), 999, "normal")).toEqual({
      status: "unavailable",
      reason: "no-chart",
    });
    await handle.db.update(chuniCharts).set({ sdvxRef: null });
    expect(await requestBuild(deps(), chartId, "normal")).toEqual({
      status: "unavailable",
      reason: "no-page",
    });
  });

  it("hides a withdrawn chart's tiles and shows them again on restore", async () => {
    await requestBuild(deps(), chartId, "normal");
    await runBuilds(deps());
    const ready = await requestBuild(deps(), chartId, "normal");
    const url =
      ready.status === "ready" ? (ready.manifest.tiles[0]?.url ?? "") : "";
    expect(
      await withdrawChart(handle.db, storage, 1, "master", "Asked"),
    ).toEqual({
      ok: true,
    });
    expect(await served(url)).toBe(false);
    expect(await requestBuild(deps(), chartId, "normal")).toEqual({
      status: "unavailable",
      reason: "withdrawn",
    });
    await restoreChart(handle.db, storage, chartId);
    expect(await served(url)).toBe(true);
  });

  it("rebuilds when sdvx.in redraws a layer, keeping the old tiles meanwhile", async () => {
    await requestBuild(deps(), chartId, "normal");
    await runBuilds(deps());
    const [first] = await handle.db.select().from(chuniBuilds);
    expect(await checkBuild(deps(), first?.id ?? 0)).toBe("same");

    files.set(
      `${ORIGIN}/chunithm/01/obj/data01001mst.webp`,
      layer(await webp(chart.obj), '"2"'),
    );
    expect(await checkBuild(deps(), first?.id ?? 0)).toBe("changed");
    // Still served while the rebuild waits.
    expect((await requestBuild(deps(), chartId, "normal")).status).toBe(
      "ready",
    );
    await runBuilds(deps());
    const [second] = await handle.db.select().from(chuniBuilds);
    expect(second?.source?.tags.obj).toBe(
      '"2"|' + String((await webp(chart.obj)).length),
    );
    // The old tiles are gone.
    const oldKey = first?.manifest?.tiles[0]?.key ?? "";
    expect(await storage.head(oldKey)).toBeNull();
    expect(second?.manifest?.tiles[0]?.key).not.toBe(oldKey);
  });

  it("rebuilds a chart linked to another page", async () => {
    await requestBuild(deps(), chartId, "normal");
    await runBuilds(deps());
    await handle.db
      .update(chuniCharts)
      .set({ sdvxRef: "01002/mst" })
      .where(eq(chuniCharts.id, chartId));
    await requestBuild(deps(), chartId, "normal");
    const [row] = await handle.db.select().from(chuniBuilds);
    expect(row?.status).toBe("queued");
  });

  it("keeps to the visitor limit, the queue limit and the hourly limit", async () => {
    const count = BUILD_LIMITS.perVisitorHourly + 1;
    await handle.db.insert(chuniSongs).values(
      Array.from({ length: count }, (_, i) => ({
        id: 100 + i,
        title: `S${String(i)}`,
      })),
    );
    const ids = (
      await handle.db
        .insert(chuniCharts)
        .values(
          Array.from({ length: count }, (_, i) => ({
            songId: 100 + i,
            difficulty: "master" as const,
            level: "13",
            sdvxRef: `${String(10000 + i)}/mst`,
          })),
        )
        .returning({ id: chuniCharts.id })
    ).map((row) => row.id);
    const states = [];
    for (const id of ids)
      states.push(await requestBuild(deps(), id, "normal", "198.51.100.7"));
    expect(states.filter((state) => state.status === "queued")).toHaveLength(
      BUILD_LIMITS.perVisitorHourly,
    );
    expect(states.at(-1)).toEqual({
      status: "unavailable",
      reason: "too-many",
    });
    // Someone else still can, until the queue is full.
    expect(
      await requestBuild(deps(), chartId, "normal", "203.0.113.9"),
    ).toEqual({
      status: "queued",
    });

    // The hour's builds are used up: nothing starts.
    await handle.db
      .update(chuniBuilds)
      .set({ startedAt: clock })
      .where(eq(chuniBuilds.chartId, ids[0] ?? 0));
    const limit = { ...BUILD_LIMITS };
    BUILD_LIMITS.perHour = 1;
    try {
      expect(await runBuilds(deps())).toBe(0);
    } finally {
      BUILD_LIMITS.perHour = limit.perHour;
    }
  });

  it("puts a build cut off by a restart back in the queue", async () => {
    await requestBuild(deps(), chartId, "normal");
    await handle.db.update(chuniBuilds).set({
      status: "building",
      startedAt: new Date(clock.getTime() - BUILD_LIMITS.staleMs - 1000),
    });
    expect(await runBuilds(deps())).toBe(1);
    expect((await buildOverview(handle.db, clock)).ready).toBe(1);
  });

  it("throws a build away for the admin, and its tiles", async () => {
    await requestBuild(deps(), chartId, "normal");
    await runBuilds(deps());
    const [row] = await handle.db.select().from(chuniBuilds);
    await resetBuilds(handle.db, storage, chartId);
    expect(await handle.db.select().from(chuniBuilds)).toEqual([]);
    expect(await storage.head(row?.manifest?.tiles[0]?.key ?? "")).toBeNull();
  });
});

describe("keeping layers between attempts", () => {
  const bg = `${ORIGIN}/chunithm/01/bg/01001bg.webp`;
  const notes = `${ORIGIN}/chunithm/01/obj/data01001mst.webp`;
  const mirror = `${ORIGIN}/chunithm/01/obj/mrr01001mst.webp`;
  const bar = `${ORIGIN}/chunithm/01/bg/01001bar.webp`;
  const layerRequests = () =>
    requests
      .filter((request) => request.url.endsWith(".webp"))
      .map(
        (request) => `${request.method} ${request.url.slice(ORIGIN.length)}`,
      );
  const kept = async () =>
    (await handle.db.select().from(chuniLayers)).map((row) => row.url).sort();

  /** Fails once with the measure numbers missing, then puts them back. */
  async function failOnBar(variant: "normal" | "mirror" = "normal") {
    const served = files.get(bar);
    files.delete(bar);
    await requestBuild(deps(), chartId, variant);
    expect(await runBuilds(deps())).toBe(0);
    if (served) files.set(bar, served);
    clock = new Date(clock.getTime() + 2 * HOUR_MS);
    requests = [];
  }

  it("downloads only what's missing, and lets go once the chart builds", async () => {
    await failOnBar();
    expect(await kept()).toEqual([bg, notes].sort());
    expect(await keptLayers(handle.db)).toMatchObject({ count: 2 });
    const keys = (await handle.db.select().from(chuniLayers)).map(
      (row) => row.key,
    );

    await requestBuild(deps(), chartId, "normal");
    expect(await runBuilds(deps())).toBe(1);
    expect(layerRequests()).toEqual([
      "HEAD /chunithm/01/bg/01001bg.webp",
      "HEAD /chunithm/01/obj/data01001mst.webp",
      "GET /chunithm/01/bg/01001bar.webp",
    ]);
    expect(await kept()).toEqual([]);
    for (const key of keys) expect(await storage.head(key)).toBeNull();
  });

  it("downloads a layer again when sdvx.in has changed it", async () => {
    await failOnBar();
    files.set(bg, layer(await webp(chart.bg), '"2"'));
    await requestBuild(deps(), chartId, "normal");
    expect(await runBuilds(deps())).toBe(1);
    expect(layerRequests()).toEqual([
      "HEAD /chunithm/01/bg/01001bg.webp",
      "GET /chunithm/01/bg/01001bg.webp",
      "HEAD /chunithm/01/obj/data01001mst.webp",
      "GET /chunithm/01/bg/01001bar.webp",
    ]);
  });

  it("downloads as usual when sdvx.in doesn't answer the check", async () => {
    await failOnBar();
    const silentHead: typeof fetch = (input, init) =>
      init?.method === "HEAD"
        ? Promise.reject(new TypeError("fetch failed"))
        : fakeFetch(input, init);
    await requestBuild(deps(), chartId, "normal");
    expect(await runBuilds(deps({ fetch: silentHead }))).toBe(1);
    expect(layerRequests().filter((line) => line.startsWith("GET"))).toEqual([
      "GET /chunithm/01/bg/01001bg.webp",
      "GET /chunithm/01/obj/data01001mst.webp",
      "GET /chunithm/01/bg/01001bar.webp",
    ]);
  });

  it("throws away a kept copy that has gone bad", async () => {
    await failOnBar();
    const [row] = await handle.db
      .select()
      .from(chuniLayers)
      .where(eq(chuniLayers.url, bg));
    await storage.put(row?.key ?? "", new Uint8Array([1, 2, 3]), {
      contentType: "application/octet-stream",
      contentDisposition: "attachment",
      cacheControl: "private, no-store",
    });
    await requestBuild(deps(), chartId, "normal");
    expect(await runBuilds(deps())).toBe(1);
    expect(layerRequests()).toContain("GET /chunithm/01/bg/01001bg.webp");
  });

  it("keeps the shared layers while the other variant still needs them", async () => {
    await failOnBar("normal");
    files.delete(bar);
    await requestBuild(deps(), chartId, "mirror");
    expect(await runBuilds(deps())).toBe(0);
    files.set(bar, layer(await webp(chart.bar)));
    expect(await kept()).toEqual([bg, mirror, notes].sort());

    // The normal build goes first and leaves lanes for the mirror (bar too, once read).
    clock = new Date(clock.getTime() + 2 * HOUR_MS);
    await requestBuild(deps(), chartId, "normal");
    expect(await runBuilds(deps())).toBe(1);
    expect(await kept()).toEqual([bg, mirror, bar].sort());
    requests = [];
    await requestBuild(deps(), chartId, "mirror");
    expect(await runBuilds(deps())).toBe(1);
    expect(layerRequests().every((line) => line.startsWith("HEAD"))).toBe(true);
    expect(await kept()).toEqual([]);
  });

  it("removes what's left after LAYER_KEEP_DAYS", async () => {
    await failOnBar();
    const day = 24 * HOUR_MS;
    expect(
      await purgeOldLayers(
        deps(),
        new Date(clock.getTime() + (LAYER_KEEP_DAYS - 1) * day),
      ),
    ).toBe(0);
    const keys = (await handle.db.select().from(chuniLayers)).map(
      (row) => row.key,
    );
    expect(
      await purgeOldLayers(
        deps(),
        new Date(clock.getTime() + (LAYER_KEEP_DAYS + 1) * day),
      ),
    ).toBe(2);
    expect(await keptLayers(handle.db)).toEqual({ count: 0, bytes: 0 });
    for (const key of keys) expect(await storage.head(key)).toBeNull();
  });
});

describe("the WebP decoder", () => {
  it("reads sdvx.in's layers back exactly when they're lossless", async () => {
    const image = await decodeWebp(await webp(chart.obj));
    expect([image.width, image.height]).toEqual([
      chart.obj.width,
      chart.obj.height,
    ]);
    expect(Buffer.from(image.data).equals(Buffer.from(chart.obj.data))).toBe(
      true,
    );
  });

  it("refuses what isn't a WebP", async () => {
    expect(isWebp(encodePng(chart.obj))).toBe(false);
    await expect(decodeWebp(encodePng(chart.obj))).rejects.toThrow(
      "Not a WebP file.",
    );
  });
});

describe("the PNG decoder (jackets)", () => {
  it("reads back what the test encoder writes", async () => {
    const image = await decodePng(encodePng(chart.obj));
    expect(image.width).toBe(chart.obj.width);
    expect(Buffer.from(image.data).equals(Buffer.from(chart.obj.data))).toBe(
      true,
    );
  });

  it("refuses what it can't read", async () => {
    await expect(decodePng(new Uint8Array([1, 2, 3]))).rejects.toThrow(
      "Not a PNG.",
    );
  });
});
