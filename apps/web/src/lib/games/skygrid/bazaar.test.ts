import {
  openDatabase,
  skygridSaves,
  type DatabaseHandle,
  type User,
} from "@trilleo/db";
import {
  ISLAND_MAPS,
  MAX_OPEN_ORDERS,
  NEIGHBOURS,
  newGame,
  tileKind,
  type BazaarOp,
  type GameState,
} from "@trilleo/game-skygrid/core";
import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { upsertGitHubUser } from "../../auth/accounts";
import {
  bazaarProduct,
  bazaarSummary,
  listOrders,
  tradeOnBazaar,
  type TradeResult,
} from "./bazaar";
import { loadSkygridSave, startSkygridSave } from "./store";

const T0 = new Date(1_800_000_000_000);

/** A ground tile beside the Bazaar's stall. */
function atBazaar() {
  const hub = ISLAND_MAPS.hub;
  const y = hub.tiles.findIndex((row) => row.includes("¤"));
  const x = hub.tiles[y]?.indexOf("¤") ?? -1;
  for (const [dx, dy] of NEIGHBOURS) {
    if (tileKind(hub.tiles[y + dy]?.[x + dx] ?? " ") === "ground") {
      return { island: "hub" as const, x: x + dx, y: y + dy };
    }
  }
  throw new Error("The Bazaar can't be reached");
}

let handle: DatabaseHandle;
let seller: User;
let buyer: User;
const versions = new Map<string, number>();

async function player(id: number, login: string, extra: Partial<GameState>) {
  const user = await upsertGitHubUser(handle.db, { id, login, name: null });
  await startSkygridSave(handle.db, user.id, {
    ...newGame(id, T0.getTime()),
    pos: atBazaar(),
    ...extra,
  });
  versions.set(user.id, 1);
  return user;
}

beforeEach(async () => {
  handle = await openDatabase("memory://");
  versions.clear();
  seller = await player(1, "seller", { inventory: { wheat: 500 }, coins: 0 });
  buyer = await player(2, "buyer", { coins: 1000 });
});
afterEach(async () => {
  await handle.close();
});

/** Trades as `user` on their latest version. */
async function trade(user: User, op: BazaarOp, at = T0): Promise<TradeResult> {
  const result = await tradeOnBazaar(
    handle.db,
    user.id,
    { version: versions.get(user.id) ?? 1, op },
    at,
  );
  if (result.ok || result.error !== "no-save") {
    versions.set(
      user.id,
      result.ok ? result.save.version : result.save.version,
    );
  }
  return result;
}

async function island(user: User) {
  const save = await loadSkygridSave(handle.db, user.id);
  if (!save) throw new Error("no save");
  return save.state;
}

describe("orders and instant trades", () => {
  it("a sell offer waits; an instant buy takes it; the seller claims the coins", async () => {
    const offer = await trade(seller, {
      k: "order",
      side: "sell",
      item: "wheat",
      price: 4,
      quantity: 100,
    });
    expect(offer).toMatchObject({
      ok: true,
      message: expect.stringContaining("Sell offer placed") as string,
    });
    expect((await island(seller)).inventory.wheat).toBe(400);

    const bought = await trade(buyer, {
      k: "instant",
      side: "buy",
      item: "wheat",
      quantity: 30,
    });
    expect(bought).toMatchObject({
      ok: true,
      message: "Bought 30 Wheat for 120 coins.",
    });
    expect(await island(buyer)).toMatchObject({
      coins: 880,
      inventory: { wheat: 30 },
    });
    // Bought, not gathered: collections stay as they were.
    expect((await island(buyer)).collections.wheat).toBeUndefined();

    const [order] = await listOrders(handle.db, seller.id);
    expect(order).toMatchObject({ filled: 30, claimed: 0, status: "open" });
    const claimed = await trade(seller, { k: "claim" });
    // 120 coins less the 1% tax.
    expect(claimed).toMatchObject({
      ok: true,
      message: "Claimed 1 order (118 coins).",
    });
    expect((await island(seller)).coins).toBe(118);
  });

  it("a buy order fills from cheaper offers at their price, and returns the difference", async () => {
    await trade(seller, {
      k: "order",
      side: "sell",
      item: "wheat",
      price: 3,
      quantity: 50,
    });
    const result = await trade(buyer, {
      k: "order",
      side: "buy",
      item: "wheat",
      price: 5,
      quantity: 80,
    });
    expect(result.ok).toBe(true);
    // 50 bought at 3; 30 more wait at 5 (150 coins held).
    expect(await island(buyer)).toMatchObject({
      coins: 1000 - 150 - 150,
      inventory: { wheat: 50 },
    });
    const orders = await listOrders(handle.db, buyer.id);
    expect(orders).toMatchObject([
      { side: "buy", price: 5, quantity: 30, filled: 0 },
    ]);
  });

  it("a sell offer fills waiting buy orders at their price, taxed", async () => {
    await trade(buyer, {
      k: "order",
      side: "buy",
      item: "wheat",
      price: 6,
      quantity: 100,
    });
    const result = await trade(seller, {
      k: "order",
      side: "sell",
      item: "wheat",
      price: 5,
      quantity: 40,
    });
    expect(result).toMatchObject({
      ok: true,
      message: "Sold 40 Wheat straight away for 237 coins.",
    });
    expect(await listOrders(handle.db, seller.id)).toEqual([]);
    await trade(buyer, { k: "claim" });
    expect((await island(buyer)).inventory.wheat).toBe(40);
  });

  it("an instant sell gives back what nobody would buy", async () => {
    await trade(buyer, {
      k: "order",
      side: "buy",
      item: "wheat",
      price: 2,
      quantity: 10,
    });
    const result = await trade(seller, {
      k: "instant",
      side: "sell",
      item: "wheat",
      quantity: 25,
    });
    expect(result).toMatchObject({
      ok: true,
      message: "Sold 10 Wheat for 19 coins.",
    });
    expect((await island(seller)).inventory.wheat).toBe(490);
  });

  it("an instant buy stops when the coins run out", async () => {
    await trade(seller, {
      k: "order",
      side: "sell",
      item: "wheat",
      price: 300,
      quantity: 10,
    });
    const result = await trade(buyer, {
      k: "instant",
      side: "buy",
      item: "wheat",
      quantity: 10,
    });
    expect(result).toMatchObject({
      ok: true,
      message: "Bought 3 Wheat for 900 coins.",
    });
  });
});

describe("cancelling", () => {
  it("hands back what the order held, and what it earned", async () => {
    await trade(buyer, {
      k: "order",
      side: "buy",
      item: "wheat",
      price: 5,
      quantity: 100,
    });
    await trade(seller, {
      k: "instant",
      side: "sell",
      item: "wheat",
      quantity: 40,
    });
    const [order] = await listOrders(handle.db, buyer.id);
    const result = await trade(buyer, { k: "cancel", order: order?.id ?? 0 });
    expect(result.ok).toBe(true);
    // 60 unfilled × 5 back, and the 40 wheat bought.
    expect(await island(buyer)).toMatchObject({
      coins: 800,
      inventory: { wheat: 40 },
    });
    expect(await listOrders(handle.db, buyer.id)).toEqual([]);
  });

  it("only cancels your own open orders", async () => {
    await trade(seller, {
      k: "order",
      side: "sell",
      item: "wheat",
      price: 5,
      quantity: 1,
    });
    const [order] = await listOrders(handle.db, seller.id);
    const result = await trade(buyer, { k: "cancel", order: order?.id ?? 0 });
    expect(result).toMatchObject({ ok: false, error: "rejected" });
  });
});

describe("rules", () => {
  it("won't fill your own orders", async () => {
    await trade(seller, {
      k: "order",
      side: "sell",
      item: "wheat",
      price: 1,
      quantity: 10,
    });
    const result = await trade(seller, {
      k: "instant",
      side: "buy",
      item: "wheat",
      quantity: 1,
    });
    expect(result).toMatchObject({ ok: false, error: "rejected" });
  });

  it("needs what you offer, and changes nothing when refused", async () => {
    const result = await trade(buyer, {
      k: "order",
      side: "sell",
      item: "wheat",
      price: 5,
      quantity: 1,
    });
    expect(result).toMatchObject({
      ok: false,
      error: "rejected",
      message: "You don't have 1 Wheat.",
    });
    expect(await listOrders(handle.db, buyer.id)).toEqual([]);
    const tooMuch = await trade(buyer, {
      k: "order",
      side: "buy",
      item: "wheat",
      price: 100,
      quantity: 11,
    });
    expect(tooMuch).toMatchObject({ ok: false, message: "Not enough coins." });
    expect((await island(buyer)).coins).toBe(1000);
  });

  it("happens at the Bazaar, on the latest island", async () => {
    const away = await player(3, "away", { coins: 50 });
    const save = await loadSkygridSave(handle.db, away.id);
    if (!save) throw new Error("no save");
    // Walked home: the rules only see the saved position.
    await handle.db
      .update(skygridSaves)
      .set({
        state: {
          ...save.state,
          pos: { island: "home", ...ISLAND_MAPS.home.spawn },
        },
      })
      .where(eq(skygridSaves.userId, away.id));
    expect(await trade(away, { k: "claim" })).toMatchObject({
      ok: false,
      message: expect.stringContaining("Bazaar") as string,
    });
    const stale = await tradeOnBazaar(handle.db, buyer.id, {
      version: 0,
      op: { k: "claim" },
    });
    expect(stale).toMatchObject({ ok: false, error: "conflict" });
  });

  it("caps how many orders you keep", async () => {
    for (let i = 0; i < MAX_OPEN_ORDERS; i++) {
      await trade(seller, {
        k: "order",
        side: "sell",
        item: "wheat",
        price: 50 + i,
        quantity: 1,
      });
    }
    const result = await trade(seller, {
      k: "order",
      side: "sell",
      item: "wheat",
      price: 99,
      quantity: 1,
    });
    expect(result).toMatchObject({ ok: false, error: "rejected" });
  });
});

describe("prices", () => {
  it("summarize the best prices and a day's volume", async () => {
    await trade(seller, {
      k: "order",
      side: "sell",
      item: "wheat",
      price: 4,
      quantity: 100,
    });
    await trade(seller, {
      k: "order",
      side: "sell",
      item: "wheat",
      price: 6,
      quantity: 100,
    });
    await trade(buyer, {
      k: "order",
      side: "buy",
      item: "wheat",
      price: 2,
      quantity: 10,
    });
    await trade(buyer, {
      k: "instant",
      side: "buy",
      item: "wheat",
      quantity: 5,
    });
    const summary = await bazaarSummary(handle.db, T0);
    expect(summary.wheat).toEqual({ buy: 2, sell: 4, volume: 5 });
    expect(summary.coal).toEqual({ buy: null, sell: null, volume: 0 });
  });

  it("show the book and hourly history", async () => {
    await trade(seller, {
      k: "order",
      side: "sell",
      item: "wheat",
      price: 4,
      quantity: 100,
    });
    await trade(
      buyer,
      { k: "instant", side: "buy", item: "wheat", quantity: 10 },
      T0,
    );
    const later = new Date(T0.getTime() + 2 * 3_600_000);
    await trade(
      buyer,
      { k: "instant", side: "buy", item: "wheat", quantity: 20 },
      later,
    );
    const detail = await bazaarProduct(handle.db, "wheat", later);
    expect(detail.asks).toEqual([{ price: 4, quantity: 70, orders: 1 }]);
    expect(detail.bids).toEqual([]);
    expect(detail.history.map((point) => [point.price, point.volume])).toEqual([
      [4, 10],
      [4, 20],
    ]);
  });
});
