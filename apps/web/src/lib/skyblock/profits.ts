/**
 * Fusion profits: for each shard, its cheapest coin route (buying inputs and fusing,
 * deeper fusions included: the calculator's coin mode) against what it sells for after
 * the Bazaar's tax. Shards whose cheapest route is buying them outright are left out
 * (that's trading, not fusing). Worked out once per set of prices and options, in
 * memory. Movers compare today's prices with the hourly medians a day and a week ago.
 */
import {
  DEFAULT_SETTINGS,
  afterTax,
  buildGraph,
  deckOf,
  effectiveOutput,
  multipliers,
  planFrom,
  sellPrice,
  solve,
  type CalcSettings,
  type Deck,
} from "@trilleo/skyblock/calc";
import type { Database } from "@trilleo/db";
import type { CurrentPrices } from "./bazaar";
import { pricesAt, referencePrice } from "./bazaar";
import { iconOf, type ShardData } from "./data";

export interface ProfitOptions {
  /** Buy inputs instantly (the ask) rather than with buy orders (the bid). */
  instantBuy: boolean;
  /** Sell instantly (the bid) rather than with a sell offer (the ask). */
  instantSell: boolean;
  /** Bazaar tax, percent. */
  tax: number;
}

export const DEFAULT_PROFIT_OPTIONS: ProfitOptions = {
  instantBuy: false,
  instantSell: false,
  tax: 1.25,
};

export interface ProfitRow {
  id: string;
  slug: string;
  name: string;
  icon: string | null;
  rarity: string;
  /** Coins a shard by its cheapest route, and what one sells for after tax. */
  cost: number;
  sells: number;
  profit: number;
  /** Profit as a share of the cost. */
  margin: number;
  /** One run of the last fusion: shards it gives, fusions it takes in all, profit. */
  batch: { produced: number; fusions: number; profit: number };
  /** Bought and sold in the last week. */
  volume: number;
}

const memo = new Map<string, ProfitRow[]>();

const deckMemo = new WeakMap<ShardData, Deck>();
function deckFor(data: ShardData): Deck {
  let deck = deckMemo.get(data);
  if (!deck) {
    deck = deckOf(
      data.catalog.dataset,
      "",
      data.commit,
      (id) => data.icons.get(id) ?? null,
    );
    deckMemo.set(data, deck);
  }
  return deck;
}

/** Every shard that's worth fusing to sell, most profitable first. */
export function fusionProfits(
  data: ShardData,
  prices: CurrentPrices,
  options: ProfitOptions,
): ProfitRow[] {
  const key = JSON.stringify([
    data.datasetId,
    data.commit,
    prices.fetchedAt.getTime(),
    options,
  ]);
  const cached = memo.get(key);
  if (cached) return cached;
  const settings: CalcSettings = {
    ...DEFAULT_SETTINGS,
    mode: "coins",
    instantBuy: options.instantBuy,
    tax: options.tax,
  };
  const graph = buildGraph(deckFor(data), settings, prices.prices);
  const solved = solve(graph, settings);
  const crocodile = multipliers(settings).crocodile;
  const rows: ProfitRow[] = [];
  graph.shards.forEach((shard, index) => {
    const recipe = solved.choice[index];
    const cost = solved.cost[index] ?? Infinity;
    const price = prices.prices[shard.id];
    const sale = sellPrice(price, options.instantSell);
    if (!recipe || !Number.isFinite(cost) || sale === null || !price) return;
    const sells = afterTax(sale, options.tax);
    const profit = sells - cost;
    if (!(profit > 0)) return;
    const output = effectiveOutput(recipe, crocodile);
    const plan = planFrom(graph, index, output, solved, [], settings);
    const record = data.catalog.get(shard.key);
    rows.push({
      id: shard.id,
      slug: shard.slug,
      name: shard.name,
      icon: record ? iconOf(data, record) : null,
      rarity: shard.rarity,
      cost,
      sells,
      profit,
      margin: profit / cost,
      batch: {
        produced: plan.produced,
        fusions: plan.crafts,
        profit: sells * plan.produced - plan.cost,
      },
      volume: price.boughtWeek + price.soldWeek,
    });
  });
  rows.sort((a, b) => b.profit - a.profit);
  // A handful of option sets per price fetch; older ones go.
  if (memo.size > 24) memo.clear();
  memo.set(key, rows);
  return rows;
}

export interface Mover {
  id: string;
  slug: string;
  name: string;
  icon: string | null;
  then: number;
  now: number;
  /** Change, as a fraction (0.25: up a quarter). */
  change: number;
  volume: number;
}

/** Below this weekly volume a price is too thin to call a move. */
export const MOVER_MIN_VOLUME = 200;
export const MOVERS_SHOWN = 8;

/** The biggest risers and fallers since `ago` milliseconds back. */
export async function movers(
  db: Database,
  data: ShardData,
  prices: CurrentPrices,
  ago: number,
): Promise<{ up: Mover[]; down: Mover[]; since: Date | null }> {
  const then = await pricesAt(db, new Date(prices.fetchedAt.getTime() - ago));
  const list: Mover[] = [];
  let since: Date | null = null;
  for (const record of data.catalog.shards) {
    const current = prices.prices[record.id];
    const past = then.get(record.id);
    if (!current || !past) continue;
    const now = referencePrice(current);
    const before = referencePrice(past);
    const volume = current.boughtWeek + current.soldWeek;
    if (
      now === null ||
      before === null ||
      before <= 0 ||
      volume < MOVER_MIN_VOLUME
    )
      continue;
    if (since === null || past.hour < since) since = past.hour;
    list.push({
      id: record.id,
      slug: record.slug,
      name: record.name,
      icon: iconOf(data, record),
      then: before,
      now,
      change: now / before - 1,
      volume,
    });
  }
  const up = list
    .filter((m) => m.change > 0)
    .sort((a, b) => b.change - a.change)
    .slice(0, MOVERS_SHOWN);
  const down = list
    .filter((m) => m.change < 0)
    .sort((a, b) => a.change - b.change)
    .slice(0, MOVERS_SHOWN);
  return { up, down, since };
}
