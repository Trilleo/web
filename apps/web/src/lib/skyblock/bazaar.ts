/**
 * SkyBlock shard prices from Hypixel's public Bazaar endpoint (no API key): fetched by
 * the server every REFRESH_MS, never by browsers (the site makes no outside requests).
 * Each fetch replaces the latest prices (sb_bazaar, one row) and appends to the hour's
 * history (sb_price_history: every sample, so charts take medians), which is purged
 * after PRICE_HISTORY_DAYS. Pages and the calculator read `currentPrices`, kept in
 * memory for CACHE_MS.
 *
 * Settings (optional): SKYBLOCK_BAZAAR=off never fetches; SKYBLOCK_BAZAAR_URL points
 * elsewhere (e2e's fake). FAILURES_TO_ALERT failures in a row alert the admin
 * ("skyblock-prices"), at most every ALERT_GAP_MS.
 */
import type { PriceTable, ShardPrice } from "@trilleo/skyblock/calc";
import { sbBazaar, sbPriceHistory, type Database } from "@trilleo/db";
import { and, asc, eq, gte, inArray, lt, sql } from "drizzle-orm";
import { alertAdmin } from "../mail/alerts";
import { SourceError, fetchJson } from "./source";

export const BAZAAR_URL = "https://api.hypixel.net/v2/skyblock/bazaar";
const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

/** How often prices are fetched. */
export const REFRESH_MS = 5 * MINUTE_MS;
/** History kept, in days. */
export const PRICE_HISTORY_DAYS = 90;
/** How long `currentPrices` trusts its copy before asking the database. */
export const CACHE_MS = 30 * 1000;
/** Fewer shards than this in a response is taken as broken. */
export const MIN_SHARD_PRODUCTS = 100;
export const FAILURES_TO_ALERT = 12;
const ALERT_GAP_MS = 6 * HOUR_MS;

export function bazaarUrl(
  env: Record<string, string | undefined> = process.env,
): string | null {
  if (env.SKYBLOCK_BAZAAR === "off") return null;
  // An empty setting (as .env.example leaves it) means the default.
  const url = env.SKYBLOCK_BAZAAR_URL?.trim();
  if (url) return url;
  return BAZAAR_URL;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const topPrice = (summary: unknown): number | null => {
  if (!Array.isArray(summary)) return null;
  const first: unknown = summary[0];
  if (!isRecord(first)) return null;
  const price = first.pricePerUnit;
  return typeof price === "number" && Number.isFinite(price) && price > 0
    ? price
    : null;
};

const count = (value: unknown): number =>
  typeof value === "number" && Number.isFinite(value) && value >= 0
    ? Math.round(value)
    : 0;

/**
 * The shards' prices from Hypixel's response: `buy_summary` lists sell offers (its
 * first, the lowest, is what buying instantly costs: the ask), `sell_summary` buy
 * orders (its first, the highest, is the bid).
 */
export function readBazaar(body: unknown): {
  hypixelAt: Date;
  prices: PriceTable;
} {
  if (!isRecord(body) || body.success !== true || !isRecord(body.products))
    throw new Error("The Bazaar didn't answer with products.");
  const updated = body.lastUpdated;
  const prices: PriceTable = {};
  for (const [id, product] of Object.entries(body.products)) {
    if (!id.startsWith("SHARD_") || !isRecord(product)) continue;
    const quick = isRecord(product.quick_status) ? product.quick_status : {};
    prices[id] = {
      ask: topPrice(product.buy_summary),
      bid: topPrice(product.sell_summary),
      boughtWeek: count(quick.buyMovingWeek),
      soldWeek: count(quick.sellMovingWeek),
    };
  }
  if (Object.keys(prices).length < MIN_SHARD_PRODUCTS)
    throw new Error(
      `The Bazaar listed only ${String(Object.keys(prices).length)} shards.`,
    );
  return {
    hypixelAt: new Date(typeof updated === "number" ? updated : Date.now()),
    prices,
  };
}

/** The start of `date`'s UTC hour. */
export function hourOf(date: Date): Date {
  return new Date(Math.floor(date.getTime() / HOUR_MS) * HOUR_MS);
}

export interface RefreshDeps {
  fetch?: typeof fetch;
  /** null: fetching is off. Read from the environment if left out. */
  url?: string | null;
  now?: () => Date;
  sleep?: (ms: number) => Promise<void>;
}

let lastPurge = 0;

/** One fetch: the latest prices and the hour's samples. */
export async function refreshPrices(
  db: Database,
  deps: RefreshDeps = {},
): Promise<{ ok: boolean; shards: number; error?: string }> {
  const url = deps.url === undefined ? bazaarUrl() : deps.url;
  const now = deps.now ?? (() => new Date());
  if (!url)
    return {
      ok: false,
      shards: 0,
      error: "Fetching is switched off (SKYBLOCK_BAZAAR=off).",
    };
  let read: { hypixelAt: Date; prices: PriceTable };
  try {
    read = readBazaar(
      await fetchJson(
        deps.fetch ?? fetch,
        url,
        deps.sleep ? { sleep: deps.sleep } : {},
      ),
    );
  } catch (error) {
    const message =
      error instanceof SourceError || error instanceof Error
        ? error.message
        : String(error);
    await recordFailure(db, message.slice(0, 500), now());
    return { ok: false, shards: 0, error: message };
  }
  const fetchedAt = now();
  const shards = Object.keys(read.prices).length;
  await db.transaction(async (tx) => {
    await tx
      .insert(sbBazaar)
      .values({
        id: 1,
        fetchedAt,
        hypixelAt: read.hypixelAt,
        prices: read.prices,
        shards,
        failures: 0,
      })
      .onConflictDoUpdate({
        target: sbBazaar.id,
        set: {
          fetchedAt,
          hypixelAt: read.hypixelAt,
          prices: read.prices,
          shards,
          failures: 0,
        },
      });
    const hour = hourOf(fetchedAt);
    const rows = Object.entries(read.prices).map(([shardId, price]) => ({
      shardId,
      hour,
      asks: [price.ask],
      bids: [price.bid],
      boughtWeek: price.boughtWeek,
      soldWeek: price.soldWeek,
    }));
    for (let i = 0; i < rows.length; i += 200)
      await tx
        .insert(sbPriceHistory)
        .values(rows.slice(i, i + 200))
        .onConflictDoUpdate({
          target: [sbPriceHistory.shardId, sbPriceHistory.hour],
          set: {
            asks: sql`${sbPriceHistory.asks} || excluded.asks`,
            bids: sql`${sbPriceHistory.bids} || excluded.bids`,
            boughtWeek: sql`excluded.bought_week`,
            soldWeek: sql`excluded.sold_week`,
          },
        });
  });
  if (fetchedAt.getTime() - lastPurge >= HOUR_MS) {
    lastPurge = fetchedAt.getTime();
    await db
      .delete(sbPriceHistory)
      .where(
        lt(
          sbPriceHistory.hour,
          new Date(fetchedAt.getTime() - PRICE_HISTORY_DAYS * DAY_MS),
        ),
      );
  }
  forgetPrices();
  return { ok: true, shards };
}

/** In memory too: before the first good fetch there's no row to count in. */
let failuresWithoutRow = 0;
let lastAlertAt = 0;

async function recordFailure(
  db: Database,
  message: string,
  now: Date,
): Promise<void> {
  console.warn("SkyBlock Bazaar prices:", message);
  const [row] = await db
    .update(sbBazaar)
    .set({
      failures: sql`${sbBazaar.failures} + 1`,
      lastError: message,
      lastErrorAt: now,
    })
    .where(eq(sbBazaar.id, 1))
    .returning({ failures: sbBazaar.failures });
  const failures = row ? row.failures : ++failuresWithoutRow;
  if (
    failures >= FAILURES_TO_ALERT &&
    now.getTime() - lastAlertAt >= ALERT_GAP_MS
  ) {
    lastAlertAt = now.getTime();
    await alertAdmin(
      db,
      {
        kind: "skyblock-prices",
        summary: `SkyBlock: the Bazaar prices haven't loaded ${String(failures)} times in a row: ${message}`,
        path: "/admin/skyblock/",
      },
      now,
    );
  }
}

export interface CurrentPrices {
  fetchedAt: Date;
  hypixelAt: Date;
  prices: PriceTable;
}

let cached: { value: CurrentPrices | null; at: number } | null = null;

export function forgetPrices(): void {
  cached = null;
}

/** The latest prices (null before the first fetch), from memory when fresh. */
export async function currentPrices(
  db: Database,
  now = Date.now(),
): Promise<CurrentPrices | null> {
  if (cached && now - cached.at < CACHE_MS) return cached.value;
  const [row] = await db
    .select({
      fetchedAt: sbBazaar.fetchedAt,
      hypixelAt: sbBazaar.hypixelAt,
      prices: sbBazaar.prices,
    })
    .from(sbBazaar)
    .where(eq(sbBazaar.id, 1));
  // Written above from readBazaar's checked output.
  const value = row ? { ...row, prices: row.prices as PriceTable } : null;
  cached = { value, at: now };
  return value;
}

/** The last failure, for the admin page. */
export async function bazaarStatus(db: Database): Promise<{
  fetchedAt: Date | null;
  shards: number;
  failures: number;
  lastError: string | null;
  lastErrorAt: Date | null;
}> {
  const [row] = await db.select().from(sbBazaar).where(eq(sbBazaar.id, 1));
  return row
    ? {
        fetchedAt: row.fetchedAt,
        shards: row.shards,
        failures: row.failures,
        lastError: row.lastError,
        lastErrorAt: row.lastErrorAt,
      }
    : {
        fetchedAt: null,
        shards: 0,
        failures: failuresWithoutRow,
        lastError: null,
        lastErrorAt: null,
      };
}

/** The middle value (the mean of the two middle ones for an even count); null for none. */
export function median(values: readonly (number | null)[]): number | null {
  const sorted = values
    .filter((v): v is number => v !== null)
    .sort((a, b) => a - b);
  if (sorted.length === 0) return null;
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? (sorted[mid] ?? null)
    : ((sorted[mid - 1] ?? 0) + (sorted[mid] ?? 0)) / 2;
}

export const PRICE_RANGES = {
  "24h": { label: "24 hours", ms: DAY_MS },
  "7d": { label: "7 days", ms: 7 * DAY_MS },
  "30d": { label: "30 days", ms: 30 * DAY_MS },
  "90d": { label: "90 days", ms: 90 * DAY_MS },
} as const;
export type PriceRange = keyof typeof PRICE_RANGES;

export function isPriceRange(value: unknown): value is PriceRange {
  return typeof value === "string" && Object.hasOwn(PRICE_RANGES, value);
}

export interface PricePoint {
  hour: Date;
  ask: number | null;
  bid: number | null;
}

/** A shard's hourly medians over a range, oldest first. */
export async function priceHistory(
  db: Database,
  shardId: string,
  range: PriceRange,
  now = new Date(),
): Promise<PricePoint[]> {
  const rows = await db
    .select({
      hour: sbPriceHistory.hour,
      asks: sbPriceHistory.asks,
      bids: sbPriceHistory.bids,
    })
    .from(sbPriceHistory)
    .where(
      and(
        eq(sbPriceHistory.shardId, shardId),
        gte(
          sbPriceHistory.hour,
          new Date(now.getTime() - PRICE_RANGES[range].ms),
        ),
      ),
    )
    .orderBy(asc(sbPriceHistory.hour));
  return rows.map((row) => ({
    hour: row.hour,
    ask: median(row.asks),
    bid: median(row.bids),
  }));
}

/**
 * Every shard's hourly median at one past hour (the closest hour on record at or
 * before it, within two hours), for movers.
 */
export async function pricesAt(
  db: Database,
  when: Date,
): Promise<Map<string, PricePoint>> {
  const hours = [0, 1, 2].map(
    (n) => new Date(hourOf(when).getTime() - n * HOUR_MS),
  );
  const rows = await db
    .select({
      shardId: sbPriceHistory.shardId,
      hour: sbPriceHistory.hour,
      asks: sbPriceHistory.asks,
      bids: sbPriceHistory.bids,
    })
    .from(sbPriceHistory)
    .where(inArray(sbPriceHistory.hour, hours));
  const out = new Map<string, PricePoint>();
  for (const row of rows.sort((a, b) => b.hour.getTime() - a.hour.getTime()))
    if (!out.has(row.shardId))
      out.set(row.shardId, {
        hour: row.hour,
        ask: median(row.asks),
        bid: median(row.bids),
      });
  return out;
}

/** A price to compare with: the ask, or the bid when nobody's selling. */
export function referencePrice(
  price: Pick<ShardPrice, "ask" | "bid"> | PricePoint,
): number | null {
  return price.ask ?? price.bid;
}

let running: Promise<unknown> | null = null;
let lastStart = 0;
let ticking = false;

/** A fetch if one is due (never with SKYBLOCK_BAZAAR=off). */
export function bazaarInBackground(
  getDb: () => Promise<Database>,
  now = Date.now(),
): void {
  if (running || !bazaarUrl() || now - lastStart < REFRESH_MS) return;
  lastStart = now;
  running = getDb()
    .then((db) => refreshPrices(db))
    .catch((error: unknown) => {
      console.warn("SkyBlock Bazaar prices failed:", error);
    })
    .finally(() => {
      running = null;
    });
}

/** Fetches every REFRESH_MS from the first server-rendered request (like the other timers). */
export function startSkyblockBazaar(getDb: () => Promise<Database>): void {
  if (ticking || !bazaarUrl()) return;
  ticking = true;
  const tick = () => {
    bazaarInBackground(getDb);
  };
  setTimeout(tick, 5000).unref();
  setInterval(tick, MINUTE_MS).unref();
}
