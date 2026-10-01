import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ISLAND_MAPS, newGame, type GameState } from "../core";
import { bazaarTrader, type BazaarReader, type OrderView } from "./bazaar";
import { BazaarPanel, PriceChart } from "./BazaarPanel";
import { GameSession } from "./session";
import { Syncer } from "./sync";

const T0 = 1_800_000_000_000;

function urlOf(url: RequestInfo | URL): string {
  if (typeof url === "string") return url;
  return url instanceof URL ? url.href : url.url;
}

function atStall(extra: Partial<GameState> = {}): GameState {
  const hub = ISLAND_MAPS.hub;
  const y = hub.tiles.findIndex((row) => row.includes("¤"));
  const x = hub.tiles[y]?.indexOf("¤") ?? -1;
  return { ...newGame(1, T0), pos: { island: "hub", x, y: y + 1 }, ...extra };
}

describe("bazaarTrader", () => {
  it("sends played actions first, then trades on the new version and takes the island", async () => {
    const calls: { url: string; body: unknown }[] = [];
    const fetchImpl = vi.fn((url: RequestInfo | URL, init?: RequestInit) => {
      const body = JSON.parse(init?.body as string) as { version: number };
      calls.push({ url: urlOf(url), body });
      if (urlOf(url).endsWith("/sync")) {
        return Promise.resolve(Response.json({ version: body.version + 1 }));
      }
      return Promise.resolve(
        Response.json({
          state: { ...atStall(), coins: 99 },
          version: body.version + 1,
          orders: [],
          message: "Bought 3 Wheat for 9 coins.",
        }),
      );
    });
    let now = T0 + 1000;
    const holder: { syncer?: Syncer } = {};
    const session = new GameSession(atStall({ now: T0 + 500 }), {
      now: () => now,
      storage: null,
      onAction: (action) => holder.syncer?.record(action),
    });
    const syncer = new Syncer(session, 4, fetchImpl);
    holder.syncer = syncer;
    now += 200;
    session.act({ k: "move", d: "D" });

    const outcome = await bazaarTrader(session, syncer, fetchImpl).trade({
      k: "instant",
      side: "buy",
      item: "wheat",
      quantity: 3,
    });
    expect(outcome).toMatchObject({
      ok: true,
      message: "Bought 3 Wheat for 9 coins.",
    });
    expect(calls.map((call) => call.url)).toEqual([
      "/api/games/skygrid/sync",
      "/api/games/skygrid/bazaar/trade",
    ]);
    expect(calls[1]?.body).toMatchObject({ version: 5 });
    expect(session.getView().state.coins).toBe(99);
    expect(session.getView().log.at(-1)?.text).toBe(
      "Bought 3 Wheat for 9 coins.",
    );
  });

  it("reports a refusal and keeps playing", async () => {
    const fetchImpl = vi.fn(() =>
      Promise.resolve(
        Response.json(
          { error: "Not enough coins.", state: atStall(), version: 2 },
          { status: 422 },
        ),
      ),
    );
    const session = new GameSession(atStall(), {
      now: () => T0 + 10,
      storage: null,
    });
    const syncer = new Syncer(session, 2, fetchImpl);
    const outcome = await bazaarTrader(session, syncer, fetchImpl).trade({
      k: "claim",
    });
    expect(outcome).toEqual({ ok: false, message: "Not enough coins." });
    expect(session.act({ k: "move", d: "D" })).toBe(true);
  });
});

/** Answers after a moment, like a real server (and a slow CI machine). */
function later<T>(value: T): Promise<T> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(value);
    }, 30);
  });
}

function fakeReader(orders: OrderView[] = []): BazaarReader {
  return {
    summary: () => later({ wheat: { buy: 3, sell: 5, volume: 40 } }),
    product: (item) =>
      later({
        item,
        bids: [{ price: 3, quantity: 100, orders: 2 }],
        asks: [{ price: 5, quantity: 20, orders: 1 }],
        history: [
          { t: T0, price: 4, volume: 10 },
          { t: T0 + 3_600_000, price: 5, volume: 3 },
        ],
      }),
    orders: () => later(orders),
  };
}

describe("BazaarPanel", () => {
  afterEach(cleanup);

  it("shows prices to everyone, and asks guests to sign in to trade", async () => {
    render(
      <BazaarPanel
        state={atStall()}
        reader={fakeReader()}
        trader={null}
        signInHref="/in"
      />,
    );
    const row = (await screen.findByRole("button", { name: "Wheat" })).closest(
      "tr",
    );
    // The list shows at once; prices fill in when they arrive.
    await waitFor(() => {
      expect(row?.textContent).toBe("Wheat53");
    });
    expect(
      screen.getByRole("link", { name: "sign in" }).getAttribute("href"),
    ).toBe("/in");
    act(() => {
      screen.getByRole("button", { name: "Wheat" }).click();
    });
    expect(
      await screen.findByRole("img", { name: /Price over the last week/ }),
    ).toBeTruthy();
    expect(screen.queryByRole("heading", { name: "Buy now" })).toBeNull();
  });

  it("lets a signed-in player at the stall trade and claim", async () => {
    const trade = vi.fn(() =>
      Promise.resolve({ ok: true, message: "ok", orders: [] }),
    );
    const orders: OrderView[] = [
      {
        id: 7,
        item: "wheat",
        side: "sell",
        price: 5,
        quantity: 10,
        filled: 4,
        claimed: 0,
        status: "open",
        createdAt: new Date(T0).toISOString(),
      },
    ];
    render(
      <BazaarPanel
        state={atStall({ inventory: { wheat: 12 } })}
        reader={fakeReader(orders)}
        trader={{ trade }}
        signInHref="/in"
      />,
    );
    expect(await screen.findByText(/4 to claim/)).toBeTruthy();
    act(() => {
      screen.getByRole("button", { name: "Claim all" }).click();
    });
    expect(trade).toHaveBeenCalledWith({ k: "claim" });

    act(() => {
      screen.getByRole("button", { name: "Wheat" }).click();
    });
    await screen.findByRole("heading", { name: "Sell now" });
    // Selling now needs a buyer: wait for the book to arrive.
    await screen.findByText("×100");
    const sellNow = screen
      .getByRole("heading", { name: "Sell now" })
      .closest("form");
    act(() => {
      sellNow?.requestSubmit();
    });
    expect(trade).toHaveBeenLastCalledWith({
      k: "instant",
      side: "sell",
      item: "wheat",
      quantity: 12,
    });
  });

  it("only trades at the stall", async () => {
    render(
      <BazaarPanel
        state={newGame(1, T0)}
        reader={fakeReader()}
        trader={{ trade: vi.fn() }}
        signInHref="/in"
      />,
    );
    expect(await screen.findByText(/Trade at the Bazaar stall/)).toBeTruthy();
  });
});

describe("PriceChart", () => {
  afterEach(cleanup);

  it("says so when nothing traded", () => {
    render(<PriceChart history={[]} />);
    expect(screen.getByText("No trades in the last 7 days.")).toBeTruthy();
  });

  it("describes the line in words", () => {
    render(
      <PriceChart
        history={[
          { t: T0, price: 4, volume: 1 },
          { t: T0 + 1, price: 9, volume: 1 },
          { t: T0 + 2, price: 6, volume: 1 },
        ]}
      />,
    );
    expect(screen.getByRole("img").getAttribute("aria-label")).toBe(
      "Price over the last week: from 4 to 9 coins, 6 most recently.",
    );
  });
});
