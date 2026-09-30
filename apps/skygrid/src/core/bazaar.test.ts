import { describe, expect, it } from "vitest";
import {
  BAZAAR_ITEMS,
  afterTax,
  isBazaarItem,
  parseBazaarOp,
  withCoins,
  withItems,
} from "./bazaar";
import { newGame } from "./engine";
import { GameRuleError } from "./types";

describe("what trades", () => {
  it("is resources and their enchanted forms, not tools or minions", () => {
    expect(isBazaarItem("wheat")).toBe(true);
    expect(isBazaarItem("enchanted_string")).toBe(true);
    expect(isBazaarItem("iron_sword")).toBe(false);
    expect(isBazaarItem("wheat_minion_1")).toBe(false);
    expect(new Set(BAZAAR_ITEMS).size).toBe(BAZAAR_ITEMS.length);
  });
});

describe("parseBazaarOp", () => {
  it("reads each kind of request", () => {
    for (const op of [
      { k: "order", side: "buy", item: "wheat", price: 3, quantity: 64 },
      { k: "order", side: "sell", item: "coal", price: 5, quantity: 1 },
      { k: "instant", side: "buy", item: "coal", quantity: 10 },
      { k: "cancel", order: 12 },
      { k: "claim" },
    ]) {
      expect(parseBazaarOp(op)).toEqual(op);
    }
  });

  it("refuses bad prices, amounts and items", () => {
    const base = {
      k: "order",
      side: "buy",
      item: "wheat",
      price: 3,
      quantity: 1,
    };
    expect(parseBazaarOp({ ...base, price: 0 })).toBeNull();
    expect(parseBazaarOp({ ...base, price: 1.5 })).toBeNull();
    expect(parseBazaarOp({ ...base, quantity: 20_000 })).toBeNull();
    expect(parseBazaarOp({ ...base, item: "iron_sword" })).toBeNull();
    expect(parseBazaarOp({ ...base, side: "hold" })).toBeNull();
    expect(parseBazaarOp({ k: "cancel", order: -1 })).toBeNull();
    expect(parseBazaarOp("claim")).toBeNull();
  });
});

describe("state changes", () => {
  const game = { ...newGame(1, 0), coins: 50, inventory: { wheat: 5 } };

  it("move items and coins, never below zero", () => {
    expect(withItems(game, "wheat", -5).inventory).toEqual({});
    expect(withItems(game, "coal", 2).inventory).toEqual({ wheat: 5, coal: 2 });
    expect(() => withItems(game, "wheat", -6)).toThrow(GameRuleError);
    expect(withCoins(game, -50).coins).toBe(0);
    expect(() => withCoins(game, -51)).toThrow(/coins/);
  });

  it("tax sales by 1%, rounding down", () => {
    expect(afterTax(1000)).toBe(990);
    expect(afterTax(99)).toBe(98);
  });
});
