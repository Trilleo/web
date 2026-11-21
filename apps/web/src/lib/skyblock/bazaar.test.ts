import {
  adminAlerts,
  openDatabase,
  sbPriceHistory,
  type DatabaseHandle,
} from "@trilleo/db";
import { readSources, ShardCatalog } from "@trilleo/skyblock";
import { sourceFiles } from "@trilleo/skyblock/testing";
import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  FAILURES_TO_ALERT,
  currentPrices,
  forgetPrices,
  hourOf,
  median,
  priceHistory,
  pricesAt,
  readBazaar,
  refreshPrices,
} from "./bazaar";
import type { ShardData } from "./data";
import { fusionProfits, movers } from "./profits";

let handle: DatabaseHandle;
let clock: Date;

/** A Bazaar response: the given shards plus fillers (the reader wants 100+). */
function bazaarBody(
  prices: Record<
    string,
    { ask: number | null; bid: number | null; week?: number }
  >,
) {
  const products: Record<string, unknown> = {
    ENCHANTED_DIAMOND: {
      product_id: "ENCHANTED_DIAMOND",
      buy_summary: [],
      sell_summary: [],
    },
  };
  for (let i = 0; i < 110; i++)
    products[`SHARD_FILLER_${String(i)}`] = {
      buy_summary: [{ amount: 1, pricePerUnit: 10, orders: 1 }],
      sell_summary: [{ amount: 1, pricePerUnit: 9, orders: 1 }],
      quick_status: { buyMovingWeek: 5, sellMovingWeek: 5 },
    };
  for (const [id, price] of Object.entries(prices))
    products[id] = {
      buy_summary:
        price.ask === null
          ? []
          : [
              { amount: 3, pricePerUnit: price.ask, orders: 1 },
              { amount: 9, pricePerUnit: price.ask + 1, orders: 2 },
            ],
      sell_summary:
        price.bid === null
          ? []
          : [{ amount: 3, pricePerUnit: price.bid, orders: 1 }],
      quick_status: {
        buyMovingWeek: price.week ?? 1000,
        sellMovingWeek: price.week ?? 1000,
      },
    };
  return { success: true, lastUpdated: clock.getTime() - 1000, products };
}

const respond =
  (body: unknown, status = 200): typeof fetch =>
  () =>
    Promise.resolve(new Response(JSON.stringify(body), { status }));

const deps = (fetcher: typeof fetch) => ({
  fetch: fetcher,
  url: "https://bazaar.test/v2/skyblock/bazaar",
  now: () => clock,
  sleep: () => Promise.resolve(),
});

const PRICES = {
  SHARD_PHANPYRE: { ask: 120, bid: 100 },
  SHARD_SEA_ARCHER: { ask: 60, bid: 50 },
  SHARD_CROCODILE: { ask: 1000, bid: 900 },
  SHARD_GROVE: { ask: 450, bid: 400 },
  SHARD_TIAMAT: { ask: null, bid: 5000, week: 50 },
};

beforeEach(async () => {
  handle = await openDatabase("memory://");
  clock = new Date("2026-11-20T10:07:00.000Z");
  forgetPrices();
});
afterEach(async () => {
  await handle.close();
});

describe("readBazaar", () => {
  it("takes the shards' asks, bids and weekly volumes", () => {
    const { prices, hypixelAt } = readBazaar(bazaarBody(PRICES));
    expect(prices.SHARD_PHANPYRE).toEqual({
      ask: 120,
      bid: 100,
      boughtWeek: 1000,
      soldWeek: 1000,
    });
    expect(prices.SHARD_TIAMAT?.ask).toBeNull();
    expect(prices.ENCHANTED_DIAMOND).toBeUndefined();
    expect(hypixelAt.getTime()).toBe(clock.getTime() - 1000);
  });

  it("refuses broken or tiny answers", () => {
    expect(() => readBazaar({ success: false })).toThrow(/products/);
    expect(() =>
      readBazaar({ success: true, products: { SHARD_A: {} } }),
    ).toThrow(/only 1 shards/);
  });
});

describe("refreshPrices", () => {
  it("keeps the latest prices and every sample of the hour", async () => {
    expect(
      (await refreshPrices(handle.db, deps(respond(bazaarBody(PRICES))))).ok,
    ).toBe(true);
    clock = new Date("2026-11-20T10:12:00.000Z");
    await refreshPrices(
      handle.db,
      deps(
        respond(bazaarBody({ ...PRICES, SHARD_GROVE: { ask: 470, bid: 410 } })),
      ),
    );
    const current = await currentPrices(handle.db);
    expect(current?.prices.SHARD_GROVE?.ask).toBe(470);
    expect(current?.fetchedAt).toEqual(clock);
    const [row] = await handle.db
      .select()
      .from(sbPriceHistory)
      .where(eq(sbPriceHistory.shardId, "SHARD_GROVE"));
    expect(row?.asks).toEqual([450, 470]);
    expect(row?.hour).toEqual(hourOf(clock));
    const history = await priceHistory(handle.db, "SHARD_GROVE", "24h", clock);
    expect(history).toEqual([{ hour: hourOf(clock), ask: 460, bid: 405 }]);
    expect((await pricesAt(handle.db, clock)).get("SHARD_GROVE")?.ask).toBe(
      460,
    );
  });

  it("does nothing switched off, and alerts after failures in a row", async () => {
    expect((await refreshPrices(handle.db, { url: null })).ok).toBe(false);
    await refreshPrices(handle.db, deps(respond(bazaarBody(PRICES))));
    for (let i = 0; i < FAILURES_TO_ALERT; i++)
      await refreshPrices(handle.db, deps(respond({}, 503)));
    const alerts = await handle.db.select().from(adminAlerts);
    expect(alerts).toHaveLength(1);
    expect(alerts[0]?.kind).toBe("skyblock-prices");
    // The last good prices stay.
    expect(
      (await currentPrices(handle.db, Date.now() + 60_000))?.prices.SHARD_GROVE
        ?.ask,
    ).toBe(450);
  });

  it("works out medians", () => {
    expect(median([3, null, 1, 2])).toBe(2);
    expect(median([4, 1, 3, 2])).toBe(2.5);
    expect(median([null])).toBeNull();
  });
});

describe("profits and movers", () => {
  const dataset = readSources(sourceFiles(), { minShards: 1 });
  const data: ShardData = {
    catalog: new ShardCatalog(dataset),
    datasetId: null,
    commit: "c",
    readAt: null,
    icons: new Map(),
  };

  it("lists shards worth fusing to sell, with the batch they come in", async () => {
    await refreshPrices(handle.db, deps(respond(bazaarBody(PRICES))));
    const prices = await currentPrices(handle.db);
    if (!prices) throw new Error("no prices");
    const rows = fusionProfits(data, prices, {
      instantBuy: false,
      instantSell: false,
      tax: 1.25,
    });
    // Grove: fused from 5 Phanpyre (100) + 2 Bogged (50), 2 at a time: 300 a shard;
    // sold with an offer at 450, less 1.25%.
    expect(rows.map((row) => row.id)).toEqual(["SHARD_GROVE"]);
    expect(rows[0]).toMatchObject({
      cost: 300,
      sells: 450 * 0.9875,
      batch: { produced: 2, fusions: 1 },
    });
    expect(rows[0]?.profit).toBeCloseTo(450 * 0.9875 - 300);
    // Selling instantly at 400 still pays; buying instantly too (120, 60): 360 a shard.
    expect(
      fusionProfits(data, prices, {
        instantBuy: true,
        instantSell: true,
        tax: 1,
      })[0]?.profit,
    ).toBeCloseTo(400 * 0.99 - 360);
  });

  it("finds movers against a day ago", async () => {
    clock = new Date("2026-11-19T10:07:00.000Z");
    await refreshPrices(handle.db, deps(respond(bazaarBody(PRICES))));
    clock = new Date("2026-11-20T10:07:00.000Z");
    await refreshPrices(
      handle.db,
      deps(
        respond(
          bazaarBody({
            ...PRICES,
            SHARD_GROVE: { ask: 900, bid: 800 },
            SHARD_CROCODILE: { ask: 500, bid: 400 },
          }),
        ),
      ),
    );
    forgetPrices();
    const prices = await currentPrices(handle.db, Date.now() + 60_000);
    if (!prices) throw new Error("no prices");
    const { up, down } = await movers(
      handle.db,
      data,
      prices,
      24 * 60 * 60 * 1000,
    );
    expect(up.map((m) => [m.id, m.change])).toEqual([["SHARD_GROVE", 1]]);
    expect(down.map((m) => [m.id, m.change])).toEqual([
      ["SHARD_CROCODILE", -0.5],
    ]);
  });
});
