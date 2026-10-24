import {
  chuniCharts,
  chuniSdvxOverrides,
  chuniSongs,
  openDatabase,
  type DatabaseHandle,
} from "@trilleo/db";
import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  catalogOverview,
  chartsWithoutPage,
  findChart,
  forgetPage,
  placePage,
  restoreChart,
  withdrawChart,
  withdrawnCharts,
} from "./admin";

let handle: DatabaseHandle;

beforeEach(async () => {
  handle = await openDatabase("memory://");
  await handle.db.insert(chuniSongs).values([
    { id: 1, title: "One" },
    { id: 2, title: "Two", inGame: false },
  ]);
  await handle.db.insert(chuniCharts).values([
    {
      songId: 1,
      difficulty: "master",
      level: "14",
      sdvxPath: "01/00001mst",
      linkedBy: "otoge-db",
    },
    { songId: 2, difficulty: "master", level: "13" },
    { songId: 2, difficulty: "expert", level: "10" },
  ]);
});
afterEach(async () => {
  await handle.close();
});

describe("placing sdvx.in pages", () => {
  it("moves a page to the chart the admin names, and keeps the word", async () => {
    expect(
      await placePage(handle.db, "01/00001mst", {
        songId: 2,
        difficulty: "master",
      }),
    ).toEqual({ ok: true });
    expect((await findChart(handle.db, 1, "master"))?.sdvxPath).toBeNull();
    expect(await findChart(handle.db, 2, "master")).toMatchObject({
      sdvxPath: "01/00001mst",
      linkedBy: "admin",
    });
    expect(await handle.db.select().from(chuniSdvxOverrides)).toMatchObject([
      { path: "01/00001mst", songId: 2, difficulty: "master" },
    ]);

    await forgetPage(handle.db, "01/00001mst");
    expect(await handle.db.select().from(chuniSdvxOverrides)).toEqual([]);
    expect((await findChart(handle.db, 2, "master"))?.sdvxPath).toBeNull();
  });

  it("ignores a page", async () => {
    expect(await placePage(handle.db, "01/00001mst", null)).toEqual({
      ok: true,
    });
    expect((await findChart(handle.db, 1, "master"))?.sdvxPath).toBeNull();
    expect(await handle.db.select().from(chuniSdvxOverrides)).toMatchObject([
      { path: "01/00001mst", songId: null, difficulty: null },
    ]);
  });

  it("refuses pages and charts that don't fit", async () => {
    expect(
      await placePage(handle.db, "../x", { songId: 2, difficulty: "master" }),
    ).toMatchObject({ ok: false });
    // An expert page can't be a master chart.
    expect(
      await placePage(handle.db, "01/00001exp", {
        songId: 2,
        difficulty: "master",
      }),
    ).toEqual({ ok: false, error: "That page is for another difficulty." });
    expect(
      await placePage(handle.db, "01/00001mst", {
        songId: 9,
        difficulty: "master",
      }),
    ).toEqual({ ok: false, error: "There's no such chart in the catalog." });
  });
});

describe("charts without a page", () => {
  it("lists in-game charts from Expert up with no page", async () => {
    await handle.db.insert(chuniCharts).values([
      { songId: 1, difficulty: "expert", level: "11" },
      { songId: 1, difficulty: "basic", level: "3" },
    ]);
    // Song 2 is out of the game; song 1's master has a page; basic isn't drawn.
    expect(
      (await chartsWithoutPage(handle.db)).map((c) => [c.songId, c.difficulty]),
    ).toEqual([[1, "expert"]]);
  });
});

describe("withdrawing charts", () => {
  it("withdraws with a reason and restores", async () => {
    expect(await withdrawChart(handle.db, 1, "master", "  ")).toMatchObject({
      ok: false,
    });
    expect(
      await withdrawChart(handle.db, 1, "master", "Asked by sdvx.in"),
    ).toEqual({ ok: true });
    const [chart] = await withdrawnCharts(handle.db);
    expect(chart).toMatchObject({
      songId: 1,
      withdrawnReason: "Asked by sdvx.in",
    });
    await restoreChart(handle.db, chart?.id ?? 0);
    expect(await withdrawnCharts(handle.db)).toEqual([]);
  });
});

describe("the overview", () => {
  it("counts the catalog", async () => {
    await handle.db
      .update(chuniCharts)
      .set({ withdrawnAt: new Date() })
      .where(eq(chuniCharts.songId, 2));
    expect(await catalogOverview(handle.db)).toMatchObject({
      songs: 2,
      inGame: 1,
      charts: 3,
      linked: 1,
      withdrawn: 2,
      scriptsLeft: 0,
      versions: [],
      currentVersion: null,
      lastGood: null,
    });
  });
});
