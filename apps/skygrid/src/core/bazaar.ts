/**
 * The Bazaar's rules, shared by the server (which runs the trades: they involve
 * other players, so the browser can't replay them) and the browser (which shows them).
 */
import { RESOURCE_IDS, enchantedId, itemName } from "./content/items";
import { MAX_BATCH } from "./engine";
import { GameRuleError, type GameState, type ItemId } from "./types";

/** Sellers get this much less (coins leave the economy). */
export const BAZAAR_TAX = 0.01;
/** Most orders one player can have waiting. */
export const MAX_OPEN_ORDERS = 20;
/** The highest price per item, in coins. */
export const MAX_PRICE = 1_000_000_000;

export type BazaarSide = "buy" | "sell";

/** What trades on the Bazaar: every resource, plain and enchanted. */
export const BAZAAR_ITEMS: readonly ItemId[] = RESOURCE_IDS.flatMap((id) => [
  id,
  enchantedId(id),
]);

const TRADABLE = new Set(BAZAAR_ITEMS);

export function isBazaarItem(item: string): boolean {
  return TRADABLE.has(item);
}

/** One request to the Bazaar. */
export type BazaarOp =
  /** Wait for a match at this price: a buy order or a sell offer. */
  | {
      k: "order";
      side: BazaarSide;
      item: ItemId;
      price: number;
      quantity: number;
    }
  /** Take what's on offer now, best price first. */
  | { k: "instant"; side: BazaarSide; item: ItemId; quantity: number }
  | { k: "cancel"; order: number }
  /** Collect everything your orders have earned. */
  | { k: "claim" };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isAmount(value: unknown, max: number): value is number {
  return (
    Number.isSafeInteger(value) &&
    (value as number) >= 1 &&
    (value as number) <= max
  );
}

export function parseBazaarOp(value: unknown): BazaarOp | null {
  if (!isRecord(value)) return null;
  const { k, side, item, price, quantity, order } = value;
  const validSide = side === "buy" || side === "sell";
  const validItem = typeof item === "string" && isBazaarItem(item);
  switch (k) {
    case "order":
      return validSide &&
        validItem &&
        isAmount(price, MAX_PRICE) &&
        isAmount(quantity, MAX_BATCH)
        ? { k, side, item, price, quantity }
        : null;
    case "instant":
      return validSide && validItem && isAmount(quantity, MAX_BATCH)
        ? { k, side, item, quantity }
        : null;
    case "cancel":
      return isAmount(order, Number.MAX_SAFE_INTEGER) ? { k, order } : null;
    case "claim":
      return { k };
    default:
      return null;
  }
}

/** What a seller receives for `coins` worth of sales. */
export function afterTax(coins: number): number {
  return Math.floor(coins * (1 - BAZAAR_TAX));
}

/** The state with `delta` more (or fewer) of an item; refuses to go below zero. */
export function withItems(
  state: GameState,
  item: ItemId,
  delta: number,
): GameState {
  const have = state.inventory[item] ?? 0;
  const next = have + delta;
  if (next < 0)
    throw new GameRuleError(
      `You don't have ${String(-delta)} ${itemName(item)}.`,
    );
  const inventory = Object.fromEntries(
    Object.entries(state.inventory).filter(([key]) => key !== item),
  );
  if (next > 0) inventory[item] = next;
  return { ...state, inventory };
}

/** The state with `delta` more (or fewer) coins; refuses to go below zero. */
export function withCoins(state: GameState, delta: number): GameState {
  if (state.coins + delta < 0) throw new GameRuleError("Not enough coins.");
  return { ...state, coins: state.coins + delta };
}
