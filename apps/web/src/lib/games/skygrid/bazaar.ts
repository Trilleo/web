/**
 * Skygrid's Bazaar: players trade resources through buy orders and sell offers.
 * Trades involve other players, so they run here, in one transaction per request:
 * the player's save is locked and changed (what an order holds leaves it), the
 * other side's orders are locked and filled, and each trade is recorded. The other
 * players collect what they earned later (claim), so their saves are never touched.
 */
import {
  skygridOrders,
  skygridSaves,
  skygridTrades,
  type Database,
  type SkygridOrder,
} from "@trilleo/db";
import {
  BAZAAR_ITEMS,
  GameRuleError,
  MAX_OPEN_ORDERS,
  afterTax,
  itemName,
  nearBazaar,
  parseSave,
  totalSkillXp,
  withCoins,
  withItems,
  type BazaarOp,
  type BazaarSide,
  type GameState,
} from "@trilleo/game-skygrid/core";
import { and, asc, desc, eq, gte, inArray, lte, ne, sql } from "drizzle-orm";
import type { AccountSave } from "./store";

type Tx = Parameters<Parameters<Database["transaction"]>[0]>[0];
type Db = Database | Tx;

/** An order as its owner sees it. */
export interface OrderView {
  id: number;
  item: string;
  side: BazaarSide;
  price: number;
  quantity: number;
  filled: number;
  claimed: number;
  status: SkygridOrder["status"];
  createdAt: string;
}

function toView(order: SkygridOrder): OrderView {
  return {
    id: order.id,
    item: order.item,
    side: order.side,
    price: order.price,
    quantity: order.quantity,
    filled: order.filled,
    claimed: order.claimed,
    status: order.status,
    createdAt: order.createdAt.toISOString(),
  };
}

/** Someone's orders that are still in the book or have something to collect. */
export async function listOrders(db: Db, userId: string): Promise<OrderView[]> {
  const rows = await db
    .select()
    .from(skygridOrders)
    .where(
      and(
        eq(skygridOrders.userId, userId),
        inArray(skygridOrders.status, ["open", "filled"]),
      ),
    )
    .orderBy(desc(skygridOrders.createdAt), desc(skygridOrders.id));
  return rows.map(toView);
}

async function openOrderCount(tx: Tx, userId: string): Promise<number> {
  const [row] = await tx
    .select({ n: sql<number>`count(*)::int` })
    .from(skygridOrders)
    .where(
      and(
        eq(skygridOrders.userId, userId),
        inArray(skygridOrders.status, ["open", "filled"]),
      ),
    );
  return row?.n ?? 0;
}

/** The other side's orders a new one can fill, best price first, oldest first; locked. */
async function makers(
  tx: Tx,
  userId: string,
  item: string,
  side: BazaarSide,
  limit: number | null,
): Promise<SkygridOrder[]> {
  const theirs = side === "buy" ? "sell" : "buy";
  const price =
    limit === null
      ? undefined
      : theirs === "sell"
        ? lte(skygridOrders.price, limit)
        : gte(skygridOrders.price, limit);
  return tx
    .select()
    .from(skygridOrders)
    .where(
      and(
        eq(skygridOrders.item, item),
        eq(skygridOrders.side, theirs),
        eq(skygridOrders.status, "open"),
        ne(skygridOrders.userId, userId),
        price,
      ),
    )
    .orderBy(
      theirs === "sell" ? asc(skygridOrders.price) : desc(skygridOrders.price),
      asc(skygridOrders.createdAt),
      asc(skygridOrders.id),
    )
    .limit(200)
    .for("update");
}

/** Fills `n` of someone's order and records the trade at their price. */
async function fill(tx: Tx, order: SkygridOrder, n: number, now: Date) {
  const filled = order.filled + n;
  await tx
    .update(skygridOrders)
    .set({ filled, status: filled >= order.quantity ? "filled" : "open" })
    .where(eq(skygridOrders.id, order.id));
  await tx
    .insert(skygridTrades)
    .values({ item: order.item, price: order.price, quantity: n, at: now });
}

interface Applied {
  state: GameState;
  message: string;
}

const plural = (n: number, item: string) =>
  `${n.toLocaleString("en")} ${itemName(item)}`;
const coins = (n: number) => `${n.toLocaleString("en")} coins`;

/**
 * Buying: takes sell offers up to `limit` coins each (none: any price), as many as
 * `quantity` and, for an instant buy, as many as your coins cover.
 */
async function buy(
  tx: Tx,
  userId: string,
  start: GameState,
  item: string,
  quantity: number,
  limit: number | null,
  now: Date,
): Promise<{ state: GameState; bought: number; spent: number }> {
  let state = start;
  let bought = 0;
  let spent = 0;
  for (const offer of await makers(tx, userId, item, "buy", limit)) {
    const affordable =
      limit === null ? Math.floor(state.coins / offer.price) : Infinity;
    const n = Math.min(
      quantity - bought,
      offer.quantity - offer.filled,
      affordable,
    );
    if (n <= 0) break;
    state = withCoins(state, -offer.price * n);
    await fill(tx, offer, n, now);
    bought += n;
    spent += offer.price * n;
  }
  return { state: withItems(state, item, bought), bought, spent };
}

/** Selling: fills buy orders paying at least `limit` (none: any price). */
async function sell(
  tx: Tx,
  userId: string,
  start: GameState,
  item: string,
  quantity: number,
  limit: number | null,
  now: Date,
): Promise<{ state: GameState; sold: number; earned: number }> {
  let state = start;
  let sold = 0;
  let earned = 0;
  for (const order of await makers(tx, userId, item, "sell", limit)) {
    const n = Math.min(quantity - sold, order.quantity - order.filled);
    if (n <= 0) break;
    await fill(tx, order, n, now);
    sold += n;
    earned += afterTax(order.price * n);
  }
  state = withCoins(state, earned);
  return { state, sold, earned };
}

async function apply(
  tx: Tx,
  userId: string,
  start: GameState,
  op: BazaarOp,
  now: Date,
): Promise<Applied> {
  let state = start;
  switch (op.k) {
    case "instant": {
      if (op.side === "buy") {
        const done = await buy(
          tx,
          userId,
          state,
          op.item,
          op.quantity,
          null,
          now,
        );
        if (done.bought === 0) {
          throw new GameRuleError(
            state.coins > 0
              ? `Nobody is selling ${itemName(op.item)} right now.`
              : "Not enough coins.",
          );
        }
        return {
          state: done.state,
          message: `Bought ${plural(done.bought, op.item)} for ${coins(done.spent)}.`,
        };
      }
      state = withItems(state, op.item, -op.quantity);
      const done = await sell(
        tx,
        userId,
        state,
        op.item,
        op.quantity,
        null,
        now,
      );
      if (done.sold === 0) {
        throw new GameRuleError(
          `Nobody is buying ${itemName(op.item)} right now.`,
        );
      }
      return {
        // What nobody bought comes back.
        state: withItems(done.state, op.item, op.quantity - done.sold),
        message: `Sold ${plural(done.sold, op.item)} for ${coins(done.earned)}.`,
      };
    }

    case "order": {
      if ((await openOrderCount(tx, userId)) >= MAX_OPEN_ORDERS) {
        throw new GameRuleError(
          `You can have ${String(MAX_OPEN_ORDERS)} orders at once. Claim or cancel some first.`,
        );
      }
      let left = op.quantity;
      let note: string;
      if (op.side === "buy") {
        // Cheaper offers fill it now, at their prices; the rest waits, holding its coins.
        if (state.coins < op.price * op.quantity) {
          throw new GameRuleError("Not enough coins.");
        }
        const done = await buy(
          tx,
          userId,
          state,
          op.item,
          op.quantity,
          op.price,
          now,
        );
        state = withCoins(done.state, -op.price * (op.quantity - done.bought));
        left -= done.bought;
        note =
          done.bought > 0
            ? `Bought ${plural(done.bought, op.item)} straight away. `
            : "";
      } else {
        state = withItems(state, op.item, -op.quantity);
        const done = await sell(
          tx,
          userId,
          state,
          op.item,
          op.quantity,
          op.price,
          now,
        );
        state = done.state;
        left -= done.sold;
        note =
          done.sold > 0
            ? `Sold ${plural(done.sold, op.item)} straight away for ${coins(done.earned)}. `
            : "";
      }
      if (left > 0) {
        await tx.insert(skygridOrders).values({
          userId,
          item: op.item,
          side: op.side,
          price: op.price,
          quantity: left,
          createdAt: now,
        });
        const kind = op.side === "buy" ? "Buy order" : "Sell offer";
        note += `${kind} placed: ${plural(left, op.item)} at ${coins(op.price)} each.`;
      }
      return { state, message: note.trim() };
    }

    case "cancel": {
      const [order] = await tx
        .select()
        .from(skygridOrders)
        .where(
          and(eq(skygridOrders.id, op.order), eq(skygridOrders.userId, userId)),
        )
        .for("update");
      if (!order || (order.status !== "open" && order.status !== "filled")) {
        throw new GameRuleError("That order isn't open.");
      }
      state = collect(state, order);
      const unfilled = order.quantity - order.filled;
      state =
        order.side === "buy"
          ? withCoins(state, order.price * unfilled)
          : withItems(state, order.item, unfilled);
      await tx
        .update(skygridOrders)
        .set({ claimed: order.filled, status: "cancelled" })
        .where(eq(skygridOrders.id, order.id));
      return {
        state,
        message: "Order cancelled; what it held is back with you.",
      };
    }

    case "claim": {
      const orders = await tx
        .select()
        .from(skygridOrders)
        .where(
          and(
            eq(skygridOrders.userId, userId),
            inArray(skygridOrders.status, ["open", "filled"]),
          ),
        )
        .for("update");
      const ready = orders.filter((order) => order.filled > order.claimed);
      if (ready.length === 0)
        throw new GameRuleError("There's nothing to claim yet.");
      const before = state.coins;
      for (const order of ready) {
        state = collect(state, order);
        await tx
          .update(skygridOrders)
          .set({
            claimed: order.filled,
            status: order.status === "filled" ? "done" : "open",
          })
          .where(eq(skygridOrders.id, order.id));
      }
      const earned = state.coins - before;
      return {
        state,
        message: `Claimed ${String(ready.length)} ${ready.length === 1 ? "order" : "orders"}${earned > 0 ? ` (${coins(earned)})` : ""}.`,
      };
    }
  }
}

/** What an order has earned and not handed over yet: items for a buy, coins for a sell. */
function collect(state: GameState, order: SkygridOrder): GameState {
  const n = order.filled - order.claimed;
  if (n <= 0) return state;
  return order.side === "buy"
    ? withItems(state, order.item, n)
    : withCoins(state, afterTax(order.price * n));
}

export type TradeResult =
  | { ok: true; save: AccountSave; orders: OrderView[]; message: string }
  | { ok: false; error: "no-save" }
  | { ok: false; error: "conflict"; save: AccountSave }
  | { ok: false; error: "rejected"; message: string; save: AccountSave };

/** Thrown inside the transaction to undo it (order fills included), then answered. */
class Refused extends Error {
  constructor(
    message: string,
    readonly save: AccountSave,
  ) {
    super(message);
  }
}

/** One Bazaar request by a player, on the island version they last saw. */
export async function tradeOnBazaar(
  db: Database,
  userId: string,
  input: { version: number; op: BazaarOp },
  now = new Date(),
): Promise<TradeResult> {
  try {
    return await trade(db, userId, input, now);
  } catch (error) {
    if (!(error instanceof Refused)) throw error;
    return {
      ok: false,
      error: "rejected",
      message: error.message,
      save: error.save,
    };
  }
}

function trade(
  db: Database,
  userId: string,
  input: { version: number; op: BazaarOp },
  now: Date,
): Promise<TradeResult> {
  return db.transaction(async (tx): Promise<TradeResult> => {
    const [row] = await tx
      .select({ state: skygridSaves.state, version: skygridSaves.version })
      .from(skygridSaves)
      .where(eq(skygridSaves.userId, userId))
      .for("update");
    if (!row) return { ok: false, error: "no-save" };
    const saved = parseSave(row.state);
    if (!saved) throw new Error("Unreadable Skygrid save");
    const current = { state: saved, version: row.version };
    if (row.version !== input.version) {
      return { ok: false, error: "conflict", save: current };
    }
    if (!nearBazaar(saved)) {
      throw new Refused("Trade at the Bazaar (¤) in the Hub.", current);
    }

    let applied: Applied;
    try {
      applied = await apply(tx, userId, saved, input.op, now);
    } catch (error) {
      if (error instanceof GameRuleError)
        throw new Refused(error.message, current);
      throw error;
    }

    const version = row.version + 1;
    await tx
      .update(skygridSaves)
      .set({
        state: applied.state,
        version,
        skillXp: totalSkillXp(applied.state),
        coins: applied.state.coins,
        updatedAt: now,
      })
      .where(eq(skygridSaves.userId, userId));
    return {
      ok: true,
      save: { state: applied.state, version },
      orders: await listOrders(tx, userId),
      message: applied.message,
    };
  });
}

// What anyone can see: prices, the book, and history.

export interface ProductSummary {
  /** The best price someone will pay (sell to them instantly). */
  buy: number | null;
  /** The best price someone will sell at (buy from them instantly). */
  sell: number | null;
  /** Items traded in the last day. */
  volume: number;
}

export async function bazaarSummary(
  db: Database,
  now = new Date(),
): Promise<Record<string, ProductSummary>> {
  const [book, traded] = await Promise.all([
    db
      .select({
        item: skygridOrders.item,
        side: skygridOrders.side,
        best: sql<number>`case when ${skygridOrders.side} = 'buy' then max(${skygridOrders.price}) else min(${skygridOrders.price}) end`,
      })
      .from(skygridOrders)
      .where(eq(skygridOrders.status, "open"))
      .groupBy(skygridOrders.item, skygridOrders.side),
    db
      .select({
        item: skygridTrades.item,
        volume: sql<number>`sum(${skygridTrades.quantity})::int`,
      })
      .from(skygridTrades)
      .where(gte(skygridTrades.at, new Date(now.getTime() - 86_400_000)))
      .groupBy(skygridTrades.item),
  ]);
  const summary: Record<string, ProductSummary> = {};
  for (const item of BAZAAR_ITEMS)
    summary[item] = { buy: null, sell: null, volume: 0 };
  for (const row of book) {
    const entry = summary[row.item];
    if (entry) entry[row.side === "buy" ? "buy" : "sell"] = row.best;
  }
  for (const row of traded) {
    const entry = summary[row.item];
    if (entry) entry.volume = row.volume;
  }
  return summary;
}

export interface BookLevel {
  price: number;
  quantity: number;
  orders: number;
}

export interface ProductDetail {
  item: string;
  /** Buy orders, best (highest) first. */
  bids: BookLevel[];
  /** Sell offers, best (lowest) first. */
  asks: BookLevel[];
  /** Hourly, oldest first: the average price paid and how many traded. */
  history: { t: number; price: number; volume: number }[];
}

export const BOOK_DEPTH = 8;
export const HISTORY_DAYS = 7;

async function levels(
  db: Database,
  item: string,
  side: BazaarSide,
): Promise<BookLevel[]> {
  const rows = await db
    .select({
      price: skygridOrders.price,
      quantity: sql<number>`sum(${skygridOrders.quantity} - ${skygridOrders.filled})::int`,
      orders: sql<number>`count(*)::int`,
    })
    .from(skygridOrders)
    .where(
      and(
        eq(skygridOrders.item, item),
        eq(skygridOrders.side, side),
        eq(skygridOrders.status, "open"),
      ),
    )
    .groupBy(skygridOrders.price)
    .orderBy(
      side === "buy" ? desc(skygridOrders.price) : asc(skygridOrders.price),
    )
    .limit(BOOK_DEPTH);
  return rows.map((row) => ({
    price: row.price,
    quantity: row.quantity,
    orders: row.orders,
  }));
}

export async function bazaarProduct(
  db: Database,
  item: string,
  now = new Date(),
): Promise<ProductDetail> {
  const hour = sql`date_trunc('hour', ${skygridTrades.at})`;
  const [bids, asks, history] = await Promise.all([
    levels(db, item, "buy"),
    levels(db, item, "sell"),
    db
      .select({
        t: sql<number>`(extract(epoch from ${hour}) * 1000)::float8`,
        value: sql<number>`sum(${skygridTrades.price} * ${skygridTrades.quantity})::float8`,
        volume: sql<number>`sum(${skygridTrades.quantity})::int`,
      })
      .from(skygridTrades)
      .where(
        and(
          eq(skygridTrades.item, item),
          gte(
            skygridTrades.at,
            new Date(now.getTime() - HISTORY_DAYS * 86_400_000),
          ),
        ),
      )
      .groupBy(hour)
      .orderBy(hour),
  ]);
  return {
    item,
    bids,
    asks,
    history: history.map((row) => ({
      t: row.t,
      price: Math.round((row.value / row.volume) * 100) / 100,
      volume: row.volume,
    })),
  };
}
