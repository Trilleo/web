import { COLUMN, TILE_HEIGHT } from "@trilleo/chunithm";
import { makeChart } from "@trilleo/chunithm/testing";
import {
  chuniBuilds,
  chuniCharts,
  chuniSongs,
  openDatabase,
  type DatabaseHandle,
} from "@trilleo/db";
import { LocalDriver, readBytes } from "@trilleo/storage/server";
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
import { decodePng, encodePng } from "./png";

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

const script = [
  `function PNG00001M(){document.write("<img src=/chunithm/01/bg/00001bg.png height=792><p class=data><img src=/chunithm/01/obj/data00001mst.png height=792></p><p class=data><img src=/chunithm/01/bg/00001bar.png height=792></p>");}`,
  `function MRR00001M(){document.write("<img src=/chunithm/01/bg/00001bg.png height=792><p class=data><img src=/chunithm/01/obj/mirror00001mst.png height=792></p><p class=data><img src=/chunithm/01/bg/00001bar.png height=792></p>");}`,
].join("\n");

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
    [`${ORIGIN}/chunithm/01/js/00001data.js`, { body: script }],
    [`${ORIGIN}/chunithm/01/bg/00001bg.png`, layer(encodePng(chart.bg))],
    [`${ORIGIN}/chunithm/01/obj/data00001mst.png`, layer(encodePng(chart.obj))],
    [
      `${ORIGIN}/chunithm/01/obj/mirror00001mst.png`,
      layer(encodePng(chart.obj)),
    ],
    [`${ORIGIN}/chunithm/01/bg/00001bar.png`, layer(encodePng(chart.bar))],
  ]);
  await handle.db.insert(chuniSongs).values({ id: 1, title: "One" });
  const [row] = await handle.db
    .insert(chuniCharts)
    .values({
      songId: 1,
      difficulty: "master",
      level: "14",
      sdvxPath: "01/00001mst",
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
    const layers = requests.filter((r) => r.url.endsWith(".png"));
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
      path: "01/00001mst",
      obj: "/chunithm/01/obj/data00001mst.png",
    });
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

  it("builds the mirror from sdvx.in's mirrored notes", async () => {
    await requestBuild(deps(), chartId, "mirror");
    await runBuilds(deps());
    const [row] = await handle.db.select().from(chuniBuilds);
    expect(row).toMatchObject({ variant: "mirror", status: "ready" });
    expect(row?.source?.obj).toBe("/chunithm/01/obj/mirror00001mst.png");
  });

  it("fails cleanly when a layer is missing, and says which", async () => {
    // sdvx.in sends missing files to an HTML page.
    files.set(`${ORIGIN}/chunithm/01/obj/data00001mst.png`, {
      body: "<!DOCTYPE html>",
      status: 302,
    });
    await requestBuild(deps(), chartId, "normal");
    expect(await runBuilds(deps())).toBe(0);
    const state = await requestBuild(deps(), chartId, "normal");
    expect(state).toEqual({
      status: "failed",
      error: "sdvx.in has no notes layer for this chart (HTTP 302).",
      retryAt: new Date(clock.getTime() + HOUR_MS),
    });
    // Nothing half-built was kept.
    const [row] = await handle.db.select().from(chuniBuilds);
    expect(row?.manifest).toBeNull();
  });

  it("refuses a layer that isn't a PNG, or one of another size", async () => {
    files.set(`${ORIGIN}/chunithm/01/bg/00001bar.png`, {
      body: "not a picture",
    });
    await requestBuild(deps(), chartId, "normal");
    await runBuilds(deps());
    let [row] = await handle.db.select().from(chuniBuilds);
    expect(row?.error).toBe(
      "sdvx.in's measure numbers layer for this chart isn't a picture.",
    );

    files.set(
      `${ORIGIN}/chunithm/01/bg/00001bar.png`,
      layer(encodePng(makeChart(HEIGHT - 10, TOPS, LABELS).bar)),
    );
    clock = new Date(clock.getTime() + 2 * HOUR_MS);
    await requestBuild(deps(), chartId, "normal");
    await runBuilds(deps());
    [row] = await handle.db.select().from(chuniBuilds);
    expect(row?.error).toBe(
      "The measure numbers layer is 650×390, the lanes 650×400.",
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
        broken.obj.data.set([255, 0, 0, 255], (y * 650 + x) * 4);
    files.set(
      `${ORIGIN}/chunithm/01/obj/data00001mst.png`,
      layer(encodePng(broken.obj)),
    );
    await requestBuild(deps(), chartId, "normal");
    await runBuilds(deps());
    const [row] = await handle.db.select().from(chuniBuilds);
    expect(row?.error).toBe("Columns 1 and 2 don't line up.");
  });

  it("isn't available for charts without a page, or withdrawn ones", async () => {
    expect(await requestBuild(deps(), 999, "normal")).toEqual({
      status: "unavailable",
      reason: "no-chart",
    });
    await handle.db.update(chuniCharts).set({ sdvxPath: null });
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
      `${ORIGIN}/chunithm/01/obj/data00001mst.png`,
      layer(encodePng(chart.obj), '"2"'),
    );
    expect(await checkBuild(deps(), first?.id ?? 0)).toBe("changed");
    // Still served while the rebuild waits.
    expect((await requestBuild(deps(), chartId, "normal")).status).toBe(
      "ready",
    );
    await runBuilds(deps());
    const [second] = await handle.db.select().from(chuniBuilds);
    expect(second?.source?.tags.obj).toBe(
      '"2"|' + String(encodePng(chart.obj).length),
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
      .set({ sdvxPath: "01/00002mst" })
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
            sdvxPath: `02/${String(10000 + i)}mst`,
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

describe("the PNG decoder", () => {
  it("reads back what the test encoder writes", () => {
    const image = decodePng(encodePng(chart.obj));
    expect(image.width).toBe(chart.obj.width);
    expect(Buffer.from(image.data).equals(Buffer.from(chart.obj.data))).toBe(
      true,
    );
  });

  it("refuses what it can't read", () => {
    expect(() => decodePng(new Uint8Array([1, 2, 3]))).toThrow("Not a PNG.");
  });
});
