import {
  openDatabase,
  sbBazaar,
  sbPriceHistory,
  type DatabaseHandle,
} from "@trilleo/db";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { forgetPrices, hourOf } from "../../skyblock/bazaar";
import { dispatch } from "../dispatch";
import { RateLimiter } from "../rate-limit";
import { ROUTES } from "./index";

let handle: DatabaseHandle;

beforeEach(async () => {
  handle = await openDatabase("memory://");
  forgetPrices();
});
afterEach(async () => {
  await handle.close();
});

async function get(path: string) {
  const url = new URL(path, "https://api.trilleo.net");
  const response = await dispatch(new Request(url), url, {
    getDb: () => Promise.resolve(handle.db),
    limiter: new RateLimiter(),
    routes: ROUTES,
    clientIp: "203.0.113.1",
    apiOrigin: "https://api.trilleo.net",
    siteOrigin: "https://www.trilleo.net",
    now: () => new Date(),
    purge: false,
  });
  return {
    status: response.status,
    body: (await response.json()) as Record<string, unknown>,
  };
}

describe("SkyBlock routes", () => {
  it("lists the shards (the copy committed with the site)", async () => {
    const { status, body } = await get("/v1/skyblock/shards");
    expect(status).toBe(200);
    const items = body.items as { id: string; url: string }[];
    expect(items.length).toBeGreaterThan(300);
    expect(items.find((item) => item.id === "SHARD_TIAMAT")?.url).toBe(
      "https://www.trilleo.net/tools/skyblock/shards/tiamat/",
    );
  });

  it("answers 503 until the site has prices, then the latest and the history", async () => {
    expect((await get("/v1/skyblock/prices")).status).toBe(503);
    const now = new Date();
    await handle.db.insert(sbBazaar).values({
      id: 1,
      fetchedAt: now,
      hypixelAt: now,
      shards: 1,
      prices: {
        SHARD_TIAMAT: { ask: 100, bid: 90, boughtWeek: 5, soldWeek: 6 },
      },
    });
    await handle.db.insert(sbPriceHistory).values({
      shardId: "SHARD_TIAMAT",
      hour: hourOf(now),
      asks: [100, 110, 120],
      bids: [90, null],
      boughtWeek: 5,
      soldWeek: 6,
    });
    forgetPrices();
    const prices = await get("/v1/skyblock/prices");
    expect(prices.status).toBe(200);
    expect(prices.body.items).toEqual([
      { id: "SHARD_TIAMAT", ask: 100, bid: 90, boughtWeek: 5, soldWeek: 6 },
    ]);
    const history = await get("/v1/skyblock/shards/tiamat/prices?range=24h");
    expect(history.body).toMatchObject({
      id: "SHARD_TIAMAT",
      range: "24h",
      points: [{ hour: hourOf(now).toISOString(), ask: 110, bid: 90 }],
    });
    expect((await get("/v1/skyblock/shards/nope/prices")).status).toBe(404);
    expect(
      (await get("/v1/skyblock/shards/tiamat/prices?range=1y")).status,
    ).toBe(400);
  });
});
