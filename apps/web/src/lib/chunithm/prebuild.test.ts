import { makeChart } from "@trilleo/chunithm/testing";
import {
  chuniBuilds,
  chuniCharts,
  chuniSongs,
  openDatabase,
  type DatabaseHandle,
} from "@trilleo/db";
import { LocalDriver } from "@trilleo/storage/server";
import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  BUILD_LIMITS,
  requestBuild,
  resetLastAsked,
  resetVisitorLimits,
  type BuildDeps,
} from "./build";
import { encodePng } from "./png";
import {
  PREBUILD,
  failedPrebuilds,
  nextPrebuild,
  pausePrebuild,
  prebuildEnabled,
  prebuildOnce,
  prebuildPause,
  prebuildProgress,
  resumePrebuild,
  retryFailedPrebuilds,
} from "./prebuild";

const ORIGIN = "https://sdvx.test";
const MINUTE_MS = 60 * 1000;
const chart = makeChart(400, [100, 60, 150], [10, 250, 300, 600, 790]);

// Only song 2's Master (02/00002mst) is drawn on the fake sdvx.in.
const served = new Map<string, Uint8Array | string>([
  [
    `${ORIGIN}/chunithm/02/js/00002data.js`,
    `function PNG00002M(){document.write("<img src=/chunithm/02/bg/00002bg.png height=792><p class=data><img src=/chunithm/02/obj/data00002mst.png height=792></p><p class=data><img src=/chunithm/02/bg/00002bar.png height=792></p>");}`,
  ],
  [`${ORIGIN}/chunithm/02/bg/00002bg.png`, encodePng(chart.bg)],
  [`${ORIGIN}/chunithm/02/obj/data00002mst.png`, encodePng(chart.obj)],
  [`${ORIGIN}/chunithm/02/bg/00002bar.png`, encodePng(chart.bar)],
]);
const fakeFetch: typeof fetch = (input) => {
  const url =
    typeof input === "string"
      ? input
      : input instanceof URL
        ? input.href
        : input.url;
  const body = served.get(url);
  return Promise.resolve(
    body === undefined
      ? new Response("missing", { status: 404 })
      : new Response(
          typeof body === "string" ? body : new Blob([new Uint8Array(body)]),
          { status: 200, headers: { etag: '"1"' } },
        ),
  );
};

let handle: DatabaseHandle;
let deps: BuildDeps;
const clock = new Date("2026-10-25T08:00:00.000Z");
const ids: Record<string, number> = {};

beforeEach(async () => {
  handle = await openDatabase("memory://");
  resetLastAsked();
  resetVisitorLimits();
  deps = {
    db: handle.db,
    storage: new LocalDriver({ root: null, baseUrl: "/api/storage/local" }),
    fetch: fakeFetch,
    sdvxOrigin: ORIGIN,
    now: () => clock,
  };
  await handle.db.insert(chuniSongs).values([
    { id: 1, title: "Older", addedOn: "2025-01-10" },
    { id: 2, title: "Newer", addedOn: "2026-07-02" },
    { id: 3, title: "Removed", addedOn: "2026-08-01", inGame: false },
  ]);
  const rows = await handle.db
    .insert(chuniCharts)
    .values([
      { songId: 1, difficulty: "master", level: "13", sdvxPath: "01/00001mst" },
      {
        songId: 2,
        difficulty: "ultima",
        level: "15",
        sdvxPath: "ult/00002ult",
      },
      { songId: 2, difficulty: "master", level: "14", sdvxPath: "02/00002mst" },
      { songId: 2, difficulty: "expert", level: "12", sdvxPath: "02/00002exp" },
      { songId: 3, difficulty: "master", level: "13", sdvxPath: "03/00003mst" },
      // No page yet, and withdrawn: never picked.
      { songId: 1, difficulty: "ultima", level: "15" },
    ])
    .returning({
      id: chuniCharts.id,
      songId: chuniCharts.songId,
      difficulty: chuniCharts.difficulty,
    });
  for (const row of rows)
    ids[`${String(row.songId)}${row.difficulty}`] = row.id;
});
afterEach(async () => {
  await handle.close();
});

describe("building ahead", () => {
  it("picks in-game Master and Ultima charts, newest songs first", async () => {
    expect(await nextPrebuild(handle.db)).toBe(ids["2master"]);
    await handle.db.insert(chuniBuilds).values({
      chartId: ids["2master"] ?? 0,
      variant: "normal",
      status: "ready",
    });
    expect(await nextPrebuild(handle.db)).toBe(ids["2ultima"]);
    // A mirror build doesn't count; a failed normal one does (it isn't picked again).
    await handle.db
      .insert(chuniBuilds)
      .values([
        { chartId: ids["2ultima"] ?? 0, variant: "mirror", status: "ready" },
      ]);
    expect(await nextPrebuild(handle.db)).toBe(ids["2ultima"]);
    await handle.db.insert(chuniBuilds).values({
      chartId: ids["2ultima"] ?? 0,
      variant: "normal",
      status: "failed",
    });
    expect(await nextPrebuild(handle.db)).toBe(ids["1master"]);
    await handle.db
      .update(chuniCharts)
      .set({ withdrawnAt: clock })
      .where(eq(chuniCharts.id, ids["1master"] ?? 0));
    // Song 3 left the game; song 1's Ultima has no page; Expert is never built ahead.
    expect(await nextPrebuild(handle.db)).toBeNull();
  });

  it("builds one per tick, and says when it fails", async () => {
    expect(await prebuildOnce(deps, clock)).toBe("built");
    const [built] = await handle.db
      .select()
      .from(chuniBuilds)
      .where(eq(chuniBuilds.chartId, ids["2master"] ?? 0));
    expect(built).toMatchObject({ status: "ready", variant: "normal" });
    expect(built?.manifest?.tiles.length).toBeGreaterThan(0);
    // The Ultima isn't drawn on the fake sdvx.in: it fails, and isn't picked again.
    expect(await prebuildOnce(deps, clock)).toBe("failed");
    expect(await nextPrebuild(handle.db)).toBe(ids["1master"]);
    expect(await prebuildProgress(handle.db)).toEqual({ ready: 1, total: 3 });
  });

  it("waits while anyone is opening charts", async () => {
    // A visitor opens a chart: their build is queued, and they asked just now.
    await requestBuild(deps, ids["1master"] ?? 0, "normal", "203.0.113.9");
    expect(await prebuildOnce(deps, clock)).toBe("visitors");
    await handle.db.delete(chuniBuilds);
    const soon = new Date(clock.getTime() + PREBUILD.quietMs - MINUTE_MS);
    expect(await prebuildOnce(deps, soon)).toBe("visitors");
    const later = new Date(clock.getTime() + PREBUILD.quietMs + 1);
    expect(await prebuildOnce(deps, later)).toBe("built");
  });

  it("says when nothing is left", async () => {
    await handle.db
      .update(chuniSongs)
      .set({ inGame: false })
      .where(eq(chuniSongs.inGame, true));
    expect(await prebuildOnce(deps, clock)).toBe("done");
    expect(await prebuildProgress(handle.db)).toEqual({ ready: 0, total: 0 });
  });

  it("stays paused until resumed, or for as long as the admin chose", async () => {
    await pausePrebuild(handle.db, clock, null);
    const muchLater = new Date(clock.getTime() + 30 * 24 * 60 * MINUTE_MS);
    expect(await prebuildPause(handle.db, muchLater)).toEqual({
      pausedAt: clock,
      until: null,
    });
    expect(await prebuildOnce(deps, muchLater)).toBe("paused");
    await resumePrebuild(handle.db);
    expect(await prebuildPause(handle.db, clock)).toBeNull();

    // A new pause replaces the old one; a timed one runs out by itself.
    await pausePrebuild(handle.db, clock, 1);
    const inAnHour = new Date(clock.getTime() + 60 * MINUTE_MS);
    expect(await prebuildOnce(deps, new Date(inAnHour.getTime() - 1))).toBe(
      "paused",
    );
    expect(await prebuildPause(handle.db, inAnHour)).toBeNull();
    expect(await prebuildOnce(deps, inAnHour)).toBe("built");
  });

  it("builds the next one at once when forced, within the hour's limit", async () => {
    await pausePrebuild(handle.db, clock, null);
    await requestBuild(deps, ids["1master"] ?? 0, "normal", "203.0.113.9");
    // A visitor's waiting build still goes first.
    expect(await prebuildOnce(deps, clock, { force: true })).toBe("visitors");
    await handle.db.delete(chuniBuilds);
    // Paused, and someone asked a moment ago: forcing skips both.
    expect(await prebuildOnce(deps, clock, { force: true })).toBe("built");
    expect(await prebuildOnce(deps, clock)).toBe("paused");
    // A full hour stops it even then.
    const extra = Array.from(
      { length: BUILD_LIMITS.perHour },
      (_, i) => 100 + i,
    );
    await handle.db
      .insert(chuniSongs)
      .values(
        extra.map((id) => ({ id, title: `Old ${String(id)}`, inGame: false })),
      );
    const charts = await handle.db
      .insert(chuniCharts)
      .values(
        extra.map((songId) => ({
          songId,
          difficulty: "master" as const,
          level: "13",
        })),
      )
      .returning({ id: chuniCharts.id });
    await handle.db.insert(chuniBuilds).values(
      charts.map((row) => ({
        chartId: row.id,
        variant: "normal",
        status: "ready" as const,
        startedAt: clock,
      })),
    );
    expect(await prebuildOnce(deps, clock, { force: true })).toBe("hour-full");
  });

  it("puts failed charts without a picture back in line", async () => {
    await handle.db.insert(chuniBuilds).values([
      // Failed with nothing to show: retried.
      {
        chartId: ids["2ultima"] ?? 0,
        variant: "normal",
        status: "failed",
        error: "x",
      },
      // A failed rebuild keeps its tiles (status ready, error set): left alone.
      {
        chartId: ids["2master"] ?? 0,
        variant: "normal",
        status: "ready",
        error: "x",
        manifest: {
          width: 200,
          height: 792,
          gutter: 50,
          lane: 150,
          tiles: [],
          measures: [],
          columns: 1,
        },
      },
      // Not one it builds ahead (Expert), and a mirror: left alone.
      {
        chartId: ids["2expert"] ?? 0,
        variant: "normal",
        status: "failed",
        error: "x",
      },
      {
        chartId: ids["1master"] ?? 0,
        variant: "mirror",
        status: "failed",
        error: "x",
      },
    ]);
    expect(await nextPrebuild(handle.db)).toBe(ids["1master"]);
    expect(await failedPrebuilds(handle.db)).toBe(1);
    expect(await retryFailedPrebuilds(handle.db)).toBe(1);
    expect(await failedPrebuilds(handle.db)).toBe(0);
    expect(await nextPrebuild(handle.db)).toBe(ids["2ultima"]);
    expect(await handle.db.select().from(chuniBuilds)).toHaveLength(3);
  });

  it("is off with either switch", () => {
    expect(prebuildEnabled({})).toBe(true);
    expect(prebuildEnabled({ CHUNITHM_PREBUILD: "off" })).toBe(false);
    expect(prebuildEnabled({ CHUNITHM_SYNC: "off" })).toBe(false);
  });
});
