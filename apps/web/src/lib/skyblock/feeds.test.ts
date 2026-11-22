import { readFileSync } from "node:fs";
import {
  adminAlerts,
  openDatabase,
  sbElectionVotes,
  sbElections,
  type DatabaseHandle,
} from "@trilleo/db";
import { asc } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  FAILURES_TO_ALERT,
  FEEDS,
  feedStatus,
  forgetFeeds,
  hypixelBase,
  liveFeeds,
  refreshFeeds,
} from "./feeds";

let handle: DatabaseHandle;
let clock: Date;

/** Hypixel's answers as saved in @trilleo/skyblock's tests. */
function fixture(name: string): unknown {
  return JSON.parse(
    readFileSync(
      new URL(
        `../../../../../packages/skyblock/src/events/fixtures/${name}.json`,
        import.meta.url,
      ),
      "utf8",
    ),
  );
}

const BODIES: Record<string, unknown> = {
  [FEEDS.election.path]: fixture("election"),
  [FEEDS.firesales.path]: fixture("firesales"),
  [FEEDS.bingo.path]: fixture("bingo"),
  [FEEDS.news.path]: fixture("news"),
};

/** Answers each feed's path from BODIES (or overrides); counts requests. */
function hypixel(overrides: Record<string, unknown> = {}) {
  const asked: string[] = [];
  const fetcher: typeof fetch = (input) => {
    const path = new URL(
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.href
          : input.url,
    ).pathname;
    asked.push(path);
    const body = path in overrides ? overrides[path] : BODIES[path];
    return Promise.resolve(
      body === undefined
        ? new Response("nope", { status: 404 })
        : new Response(JSON.stringify(body), { status: 200 }),
    );
  };
  return { asked, fetcher };
}

const deps = (fetcher: typeof fetch) => ({
  fetch: fetcher,
  base: "https://hypixel.test",
  now: () => clock,
  sleep: () => Promise.resolve(),
});

beforeEach(async () => {
  handle = await openDatabase("memory://");
  // While the fixture's fire sale runs (21–25 November 2026).
  clock = new Date("2026-11-22T13:07:00.000Z");
  forgetFeeds();
});
afterEach(async () => {
  await handle.close();
});

describe("the SkyBlock feeds", () => {
  it("reads the settings", () => {
    expect(hypixelBase({})).toBe("https://api.hypixel.net");
    expect(hypixelBase({ SKYBLOCK_HYPIXEL_URL: "http://127.0.0.1:9/" })).toBe(
      "http://127.0.0.1:9",
    );
    expect(hypixelBase({ SKYBLOCK_FEEDS: "off" })).toBeNull();
  });

  it("fetches every feed and keeps what they said", async () => {
    const { fetcher } = hypixel();
    const results = await refreshFeeds(handle.db, deps(fetcher));
    expect(results.map((r) => [r.feed, r.ok])).toEqual([
      ["election", true],
      ["firesales", true],
      ["bingo", true],
      ["news", true],
    ]);
    const live = await liveFeeds(handle.db, clock.getTime());
    expect(live.election?.mayor.name).toBe("Aatrox");
    expect(live.fireSales.map((s) => s.name)).toEqual([
      "Glossy Mineral Slimey",
    ]);
    expect(live.bingo?.name).toBe("November 2026");
    expect(live.news[0]?.title).toBe("SkyBlock v0.27.3");
    expect(live.fetchedAt.news).toEqual(clock);
    // Once a sale has ended it's no longer shown.
    expect(
      (await liveFeeds(handle.db, Date.parse("2026-11-26T00:00:00Z")))
        .fireSales,
    ).toEqual([]);
  });

  it("fetches each feed only when it's due", async () => {
    const { fetcher, asked } = hypixel();
    await refreshFeeds(handle.db, deps(fetcher));
    asked.length = 0;
    clock = new Date(clock.getTime() + 6 * 60_000);
    await refreshFeeds(handle.db, deps(fetcher));
    expect(asked).toEqual([FEEDS.election.path, FEEDS.firesales.path]);
    asked.length = 0;
    await refreshFeeds(handle.db, { ...deps(fetcher), force: true });
    expect(asked).toHaveLength(4);
  });

  it("writes the election's history and the running election's votes by the hour", async () => {
    const { fetcher } = hypixel();
    await refreshFeeds(handle.db, deps(fetcher));
    clock = new Date(clock.getTime() + 60 * 60_000);
    await refreshFeeds(handle.db, { ...deps(fetcher), force: true });
    const elections = await handle.db
      .select()
      .from(sbElections)
      .orderBy(asc(sbElections.year));
    expect(
      elections.map((e) => [e.year, e.mayorKey, e.ministerKey, e.closed]),
    ).toEqual([
      [526, "slayer", "economist", true],
      [527, null, null, false],
    ]);
    const votes = await handle.db.select().from(sbElectionVotes);
    expect(votes).toHaveLength(2);
    expect(votes[0]?.votes.economist).toBeGreaterThan(0);
  });

  it("keeps the last good answer when a feed fails, and alerts after a run of failures", async () => {
    await refreshFeeds(handle.db, deps(hypixel().fetcher));
    const broken = hypixel({ [FEEDS.news.path]: { success: false } });
    for (let i = 0; i < FAILURES_TO_ALERT; i++) {
      clock = new Date(clock.getTime() + 31 * 60_000);
      await refreshFeeds(handle.db, deps(broken.fetcher));
    }
    forgetFeeds();
    expect((await liveFeeds(handle.db, clock.getTime())).news).toHaveLength(9);
    const news = (await feedStatus(handle.db)).find((s) => s.feed === "news");
    expect(news?.failures).toBe(FAILURES_TO_ALERT);
    expect(news?.lastError).toMatch(/news/);
    const alerts = await handle.db.select().from(adminAlerts);
    expect(alerts.map((a) => a.kind)).toEqual(["skyblock-feeds"]);
  });

  it("fetches nothing when switched off", async () => {
    const { fetcher, asked } = hypixel();
    expect(
      await refreshFeeds(handle.db, { ...deps(fetcher), base: null }),
    ).toEqual([]);
    expect(asked).toEqual([]);
    const live = await liveFeeds(handle.db, clock.getTime());
    expect(live.election).toBeNull();
    expect(live.fireSales).toEqual([]);
  });
});
