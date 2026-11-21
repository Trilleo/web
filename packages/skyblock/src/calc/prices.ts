/**
 * Bazaar prices as the calculator uses them. Each shard has two: `ask`, the lowest
 * sell offer (what buying instantly costs, and where a sell offer competes), and
 * `bid`, the top buy order (what a buy order pays, and what selling instantly gets).
 * The site fetches them from Hypixel's public Bazaar endpoint (no key) every few
 * minutes and hands them to the browser.
 */
import type { CalcSettings } from "./settings";

export interface ShardPrice {
  /** Lowest sell offer (coins); null: nobody's selling. */
  ask: number | null;
  /** Top buy order (coins); null: nobody's buying. */
  bid: number | null;
  /** Bought and sold in the last week (Hypixel's moving week). */
  boughtWeek: number;
  soldWeek: number;
}

/** Prices by Hypixel ID. */
export type PriceTable = Record<string, ShardPrice>;

/**
 * What one shard costs to buy with these settings: an own price first, then the
 * Bazaar's (instant buy: the ask; otherwise the bid, as a buy order). Null: no price.
 */
export function buyPrice(
  id: string,
  settings: Pick<CalcSettings, "prices" | "instantBuy">,
  table: PriceTable | null,
): number | null {
  const own = settings.prices[id];
  if (own !== undefined) return own;
  const price = table?.[id];
  if (!price) return null;
  return settings.instantBuy ? price.ask : price.bid;
}

/** What selling gets per shard: instantly (the bid) or with a sell offer (the ask). */
export function sellPrice(
  price: ShardPrice | undefined,
  instant: boolean,
): number | null {
  if (!price) return null;
  return instant ? price.bid : price.ask;
}

/** After the Bazaar's tax (percent) on a sale. */
export function afterTax(coins: number, taxPercent: number): number {
  return coins * (1 - taxPercent / 100);
}

/** Checks a price table from the network (the browser's copy of /api/skyblock/prices.json). */
export function isPriceTable(value: unknown): value is PriceTable {
  if (typeof value !== "object" || value === null || Array.isArray(value))
    return false;
  const priceOk = (n: unknown) =>
    n === null || (typeof n === "number" && Number.isFinite(n) && n >= 0);
  return Object.values(value).every((row: unknown) => {
    if (typeof row !== "object" || row === null) return false;
    const price = row as Record<string, unknown>;
    return (
      priceOk(price.ask) &&
      priceOk(price.bid) &&
      typeof price.boughtWeek === "number" &&
      typeof price.soldWeek === "number"
    );
  });
}
