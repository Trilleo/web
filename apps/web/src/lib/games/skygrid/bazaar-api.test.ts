import { openDatabase, type DatabaseHandle, type User } from "@trilleo/db";
import { ISLAND_MAPS, newGame } from "@trilleo/game-skygrid/core";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { upsertGitHubUser } from "../../auth/accounts";
import { handleBazaarRead, handleBazaarTrade } from "./bazaar-api";
import { startSkygridSave } from "./store";

const ORIGIN = "https://www.trilleo.net";
const T0 = 1_800_000_000_000;

let handle: DatabaseHandle;
let alice: User;

beforeEach(async () => {
  handle = await openDatabase("memory://");
  alice = await upsertGitHubUser(handle.db, {
    id: 1,
    login: "alice",
    name: null,
  });
  const hub = ISLAND_MAPS.hub;
  const y = hub.tiles.findIndex((row) => row.includes("¤"));
  const x = hub.tiles[y]?.indexOf("¤") ?? -1;
  await startSkygridSave(handle.db, alice.id, {
    ...newGame(1, T0),
    pos: { island: "hub", x, y: y + 1 },
    inventory: { coal: 20 },
  });
});
afterEach(async () => {
  await handle.close();
});

const getDb = () => Promise.resolve(handle.db);

async function read(path: string, user: User | null = null) {
  const url = new URL(`/api/games/skygrid/bazaar${path}`, ORIGIN);
  const item = path === "" ? undefined : path.slice(1);
  const response = await handleBazaarRead({
    request: new Request(url),
    url,
    user,
    item,
    getDb,
    now: () => T0,
  });
  return {
    status: response.status,
    body: (await response.json()) as Record<string, unknown>,
  };
}

async function trade(
  body: unknown,
  user: User | null = alice,
  origin = ORIGIN,
) {
  const url = new URL("/api/games/skygrid/bazaar/trade", ORIGIN);
  const response = await handleBazaarTrade({
    request: new Request(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: origin },
      body: JSON.stringify(body),
    }),
    url,
    user,
    getDb,
    now: () => T0,
  });
  return {
    status: response.status,
    body: (await response.json()) as Record<string, unknown>,
  };
}

describe("the Bazaar API", () => {
  it("shows prices to anyone, and orders only to their owner", async () => {
    expect((await read("")).body.products).toMatchObject({
      coal: { buy: null },
    });
    expect((await read("/coal")).body).toMatchObject({
      item: "coal",
      bids: [],
      asks: [],
    });
    expect((await read("/iron_sword")).status).toBe(404);
    expect((await read("/orders")).status).toBe(401);
    expect((await read("/orders", alice)).body).toEqual({ orders: [] });
  });

  it("trades for signed-in players on this site", async () => {
    const op = {
      k: "order",
      side: "sell",
      item: "coal",
      price: 9,
      quantity: 5,
    };
    expect((await trade({ version: 1, op }, null)).status).toBe(401);
    expect(
      (await trade({ version: 1, op }, alice, "https://evil.example")).status,
    ).toBe(403);
    expect((await trade({ version: 1, op: { k: "steal" } })).status).toBe(400);

    const placed = await trade({ version: 1, op });
    expect(placed.status).toBe(200);
    expect(placed.body).toMatchObject({
      version: 2,
      state: { inventory: { coal: 15 } },
      orders: [{ item: "coal", side: "sell", price: 9, quantity: 5 }],
    });
    expect((await read("")).body.products).toMatchObject({ coal: { sell: 9 } });

    const stale = await trade({ version: 1, op });
    expect(stale.status).toBe(409);
    const refused = await trade({ version: 2, op: { k: "claim" } });
    expect(refused).toMatchObject({ status: 422, body: { version: 2 } });
  });
});
