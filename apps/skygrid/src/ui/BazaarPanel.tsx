import { useEffect, useId, useState } from "react";
import {
  BAZAAR_ITEMS,
  BAZAAR_TAX,
  ITEMS,
  itemName,
  nearBazaar,
  type BazaarOp,
  type GameState,
} from "../core";
import type {
  BazaarReader,
  BazaarTrader,
  BookLevel,
  OrderView,
  ProductDetail,
  ProductSummary,
} from "./bazaar";

const REFRESH_MS = 15_000;

const smallButton =
  "press inline-flex min-h-8 items-center border border-ink px-2.5 font-mono text-xs uppercase tracking-wide hover:bg-ink hover:text-paper focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:pointer-events-none disabled:opacity-40";
const field =
  "w-full min-w-0 border border-ink bg-paper px-2 py-1.5 font-mono text-sm text-ink focus:outline-2 focus:outline-offset-2 focus:outline-accent";

function coins(n: number | null): string {
  return n === null ? "—" : n.toLocaleString("en");
}

function Heading({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="mt-5 mb-2 type-label text-muted first:mt-0">{children}</h3>
  );
}

export interface BazaarPanelProps {
  state: GameState;
  reader: BazaarReader;
  /** Null when signed out: prices only. */
  trader: BazaarTrader | null;
  signInHref: string;
}

export function BazaarPanel({
  state,
  reader,
  trader,
  signInHref,
}: BazaarPanelProps) {
  const [selected, setSelected] = useState<string | null>(null);
  const [summary, setSummary] = useState<Record<string, ProductSummary> | null>(
    null,
  );
  const [orders, setOrders] = useState<OrderView[] | null>(null);
  const [query, setQuery] = useState("");
  const [failed, setFailed] = useState(false);
  const searchId = useId();

  useEffect(() => {
    let live = true;
    const load = () => {
      void reader.summary().then((products) => {
        if (!live) return;
        setFailed(products === null);
        if (products) setSummary(products);
      });
      if (trader) {
        void reader.orders().then((mine) => {
          if (live && mine) setOrders(mine);
        });
      }
    };
    load();
    const timer = setInterval(load, REFRESH_MS);
    return () => {
      live = false;
      clearInterval(timer);
    };
  }, [reader, trader]);

  const here = nearBazaar(state);
  const intro = !trader ? (
    <p className="mb-4 text-sm text-muted">
      Players trade here. Prices are open to all;{" "}
      <a href={signInHref} className="text-ink underline">
        sign in
      </a>{" "}
      to buy and sell.
    </p>
  ) : here ? null : (
    <p className="mb-4 text-sm text-muted">
      Trade at the Bazaar stall (<span className="font-mono">¤</span>) in the
      Hub. You can look at prices from anywhere.
    </p>
  );

  if (selected) {
    return (
      <ProductView
        item={selected}
        state={state}
        reader={reader}
        trader={here ? trader : null}
        intro={intro}
        onBack={() => {
          setSelected(null);
        }}
        onOrders={setOrders}
      />
    );
  }

  const words = query.trim().toLowerCase();
  const products = BAZAAR_ITEMS.filter((item) =>
    itemName(item).toLowerCase().includes(words),
  ).sort((a, b) => {
    // Things with a market first, then things you have, then by name.
    const score = (item: string) =>
      (summary?.[item]?.buy !== null && summary?.[item]?.buy !== undefined
        ? 2
        : 0) +
      (summary?.[item]?.sell !== null && summary?.[item]?.sell !== undefined
        ? 2
        : 0) +
      ((state.inventory[item] ?? 0) > 0 ? 1 : 0);
    return score(b) - score(a) || itemName(a).localeCompare(itemName(b));
  });

  return (
    <div>
      {intro}
      {trader && orders && orders.length > 0 && (
        <Orders
          orders={orders}
          trader={here ? trader : null}
          onOrders={setOrders}
        />
      )}
      <Heading>Products</Heading>
      <label htmlFor={searchId} className="sr-only">
        Search products
      </label>
      <input
        id={searchId}
        type="search"
        placeholder="Search"
        className={`${field} mb-2`}
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
        }}
      />
      {failed && !summary && (
        <p className="text-sm text-muted">Can’t reach the Bazaar right now.</p>
      )}
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left type-label text-muted">
            <th className="py-1.5 font-normal">Item</th>
            <th className="py-1.5 text-right font-normal">Buy at</th>
            <th className="py-1.5 text-right font-normal">Sell at</th>
          </tr>
        </thead>
        <tbody>
          {products.map((item) => (
            <tr key={item} className="border-t border-hair">
              <td className="py-1.5">
                <button
                  type="button"
                  className="text-left underline decoration-hair underline-offset-2 hover:decoration-ink"
                  onClick={() => {
                    setSelected(item);
                  }}
                >
                  {itemName(item)}
                </button>
              </td>
              <td className="py-1.5 text-right font-mono">
                {coins(summary?.[item]?.sell ?? null)}
              </td>
              <td className="py-1.5 text-right font-mono">
                {coins(summary?.[item]?.buy ?? null)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Orders({
  orders,
  trader,
  onOrders,
}: {
  orders: OrderView[];
  trader: BazaarTrader | null;
  onOrders: (orders: OrderView[]) => void;
}) {
  const [busy, setBusy] = useState(false);
  const run = async (op: BazaarOp) => {
    if (!trader) return;
    setBusy(true);
    const outcome = await trader.trade(op);
    if (outcome.orders) onOrders(outcome.orders);
    setBusy(false);
  };
  const ready = orders.some((order) => order.filled > order.claimed);
  return (
    <section>
      <div className="mb-2 flex items-center justify-between">
        <Heading>Your orders</Heading>
        {trader && (
          <button
            type="button"
            className={smallButton}
            disabled={busy || !ready}
            onClick={() => void run({ k: "claim" })}
          >
            Claim all
          </button>
        )}
      </div>
      <ul className="flex flex-col">
        {orders.map((order) => (
          <li
            key={order.id}
            className="flex items-start justify-between gap-2 border-b border-hair py-2"
          >
            <span className="min-w-0">
              <span className="block">
                {order.side === "buy" ? "Buying" : "Selling"}{" "}
                {itemName(order.item)}
              </span>
              <span className="block font-mono text-xs text-muted">
                {order.filled}/{order.quantity} at {coins(order.price)}
                {order.filled > order.claimed &&
                  ` · ${String(order.filled - order.claimed)} to claim`}
              </span>
            </span>
            {trader && (
              <button
                type="button"
                className={smallButton}
                disabled={busy}
                onClick={() => void run({ k: "cancel", order: order.id })}
                aria-label={`Cancel the order for ${itemName(order.item)}`}
              >
                Cancel
              </button>
            )}
          </li>
        ))}
      </ul>
      {!trader && (
        <p className="mt-2 text-sm text-muted">
          Claim and cancel at the stall.
        </p>
      )}
    </section>
  );
}

/** What buying `quantity` right now would cost, from the offers in the book. */
function instantCost(
  asks: readonly BookLevel[],
  quantity: number,
): number | null {
  let left = quantity;
  let cost = 0;
  for (const level of asks) {
    const n = Math.min(left, level.quantity);
    cost += n * level.price;
    left -= n;
    if (left === 0) return cost;
  }
  return left === quantity ? null : cost;
}

function ProductView({
  item,
  state,
  reader,
  trader,
  intro,
  onBack,
  onOrders,
}: {
  item: string;
  state: GameState;
  reader: BazaarReader;
  trader: BazaarTrader | null;
  intro: React.ReactNode;
  onBack: () => void;
  onOrders: (orders: OrderView[]) => void;
}) {
  const [detail, setDetail] = useState<ProductDetail | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let live = true;
    const load = () => {
      void reader.product(item).then((product) => {
        if (live && product) setDetail(product);
      });
    };
    load();
    const timer = setInterval(load, REFRESH_MS);
    return () => {
      live = false;
      clearInterval(timer);
    };
  }, [reader, item]);

  const have = state.inventory[item] ?? 0;
  const bestBid = detail?.bids[0]?.price ?? null;
  const bestAsk = detail?.asks[0]?.price ?? null;
  const npc = ITEMS[item]?.price ?? 1;

  const run = async (op: BazaarOp) => {
    if (!trader) return;
    setBusy(true);
    const outcome = await trader.trade(op);
    if (outcome.orders) onOrders(outcome.orders);
    const product = await reader.product(item);
    if (product) setDetail(product);
    setBusy(false);
  };

  return (
    <div>
      <button type="button" className={`${smallButton} mb-4`} onClick={onBack}>
        ← All products
      </button>
      {intro}
      <h3 className="type-card">{itemName(item)}</h3>
      <p className="mb-3 font-mono text-xs text-muted">
        You have {have.toLocaleString("en")} · the merchant pays {coins(npc)}
      </p>
      <PriceChart history={detail?.history ?? []} />

      <div className="mt-4 grid grid-cols-2 gap-4">
        <Book title="Buy orders" levels={detail?.bids ?? []} />
        <Book title="Sell offers" levels={detail?.asks ?? []} />
      </div>

      {trader && (
        <div className="mt-2 flex flex-col">
          <TradeForm
            title="Buy now"
            note={(quantity) => {
              const cost = detail ? instantCost(detail.asks, quantity) : null;
              return cost === null
                ? "Nobody is selling."
                : `About ${coins(cost)} coins.`;
            }}
            defaults={{ quantity: 1 }}
            busy={busy}
            disabled={bestAsk === null}
            onSubmit={({ quantity }) =>
              void run({ k: "instant", side: "buy", item, quantity })
            }
          />
          <TradeForm
            title="Sell now"
            note={() =>
              bestBid === null
                ? "Nobody is buying."
                : `From ${coins(bestBid)} each, less ${String(BAZAAR_TAX * 100)}% tax.`
            }
            defaults={{ quantity: Math.max(1, have) }}
            busy={busy}
            disabled={bestBid === null || have === 0}
            onSubmit={({ quantity }) =>
              void run({ k: "instant", side: "sell", item, quantity })
            }
          />
          <TradeForm
            title="Place a buy order"
            note={(quantity, price) =>
              `Holds ${coins(quantity * (price ?? 0))} coins until it fills.`
            }
            defaults={{ quantity: 64, price: (bestBid ?? npc) + 1 }}
            busy={busy}
            onSubmit={({ quantity, price }) =>
              void run({
                k: "order",
                side: "buy",
                item,
                quantity,
                price: price ?? 1,
              })
            }
          />
          <TradeForm
            title="Place a sell offer"
            note={() => `Holds the items until someone buys them.`}
            defaults={{
              quantity: Math.max(1, have),
              price: Math.max(1, (bestAsk ?? npc * 2) - 1),
            }}
            busy={busy}
            disabled={have === 0}
            onSubmit={({ quantity, price }) =>
              void run({
                k: "order",
                side: "sell",
                item,
                quantity,
                price: price ?? 1,
              })
            }
          />
        </div>
      )}
    </div>
  );
}

function Book({
  title,
  levels,
}: {
  title: string;
  levels: readonly BookLevel[];
}) {
  return (
    <section>
      <h4 className="mb-1 type-label text-muted">{title}</h4>
      {levels.length === 0 ? (
        <p className="font-mono text-xs text-muted">None</p>
      ) : (
        <ul className="font-mono text-xs">
          {levels.map((level) => (
            <li
              key={level.price}
              className="flex justify-between border-b border-hair py-1"
            >
              <span>{coins(level.price)}</span>
              <span className="text-muted">
                ×{level.quantity.toLocaleString("en")}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function TradeForm({
  title,
  note,
  defaults,
  busy,
  disabled = false,
  onSubmit,
}: {
  title: string;
  note: (quantity: number, price: number | undefined) => string;
  defaults: { quantity: number; price?: number };
  busy: boolean;
  disabled?: boolean;
  onSubmit: (values: { quantity: number; price?: number }) => void;
}) {
  const id = useId();
  const [quantity, setQuantity] = useState(String(defaults.quantity));
  const [price, setPrice] = useState(
    defaults.price === undefined ? undefined : String(defaults.price),
  );
  const q = Math.max(0, Math.floor(Number(quantity) || 0));
  const p =
    price === undefined
      ? undefined
      : Math.max(0, Math.floor(Number(price) || 0));
  const valid = q >= 1 && (p === undefined || p >= 1);
  return (
    <form
      className="flex flex-col gap-2 border-t border-hair py-3"
      onSubmit={(event) => {
        event.preventDefault();
        if (valid)
          onSubmit(
            p === undefined ? { quantity: q } : { quantity: q, price: p },
          );
      }}
    >
      <h4 className="font-semibold">{title}</h4>
      <div className="flex items-end gap-2">
        <label className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="type-label text-muted">Amount</span>
          <input
            id={`${id}-quantity`}
            type="number"
            min={1}
            inputMode="numeric"
            className={field}
            value={quantity}
            onChange={(event) => {
              setQuantity(event.target.value);
            }}
          />
        </label>
        {price !== undefined && (
          <label className="flex min-w-0 flex-1 flex-col gap-1">
            <span className="type-label text-muted">Price each</span>
            <input
              id={`${id}-price`}
              type="number"
              min={1}
              inputMode="numeric"
              className={field}
              value={price}
              onChange={(event) => {
                setPrice(event.target.value);
              }}
            />
          </label>
        )}
        <button
          type="submit"
          className={`${smallButton} min-h-9 shrink-0`}
          disabled={busy || disabled || !valid}
        >
          {busy ? "…" : "Go"}
        </button>
      </div>
      <p className="font-mono text-xs text-muted">{note(q, p)}</p>
    </form>
  );
}

/**
 * The last week's prices as one thin line: hourly averages, the newest on the
 * right. The numbers are also given as text, for people who can't see the line.
 */
export function PriceChart({
  history,
}: {
  history: readonly { t: number; price: number; volume: number }[];
}) {
  if (history.length === 0) {
    return (
      <p className="border border-hair px-3 py-6 text-center font-mono text-xs text-muted">
        No trades in the last 7 days.
      </p>
    );
  }
  const width = 320;
  const height = 110;
  const pad = 6;
  const prices = history.map((point) => point.price);
  const low = Math.min(...prices);
  const high = Math.max(...prices);
  const first = history[0]?.t ?? 0;
  const last = history.at(-1)?.t ?? first;
  const x = (t: number) =>
    last === first
      ? width / 2
      : pad + ((t - first) / (last - first)) * (width - pad * 2);
  const y = (price: number) =>
    high === low
      ? height / 2
      : height - pad - ((price - low) / (high - low)) * (height - pad * 2);
  const points = history.map(
    (point) => `${x(point.t).toFixed(1)},${y(point.price).toFixed(1)}`,
  );
  const latest = history.at(-1);
  return (
    <figure>
      <svg
        viewBox={`0 0 ${String(width)} ${String(height)}`}
        className="h-28 w-full border border-hair text-ink"
        role="img"
        aria-label={`Price over the last week: from ${String(low)} to ${String(high)} coins, ${String(latest?.price ?? 0)} most recently.`}
        preserveAspectRatio="none"
      >
        <line
          x1="0"
          x2={width}
          y1={height / 2}
          y2={height / 2}
          stroke="var(--tr-hair)"
          strokeWidth="1"
        />
        <polyline
          points={points.join(" ")}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          vectorEffect="non-scaling-stroke"
          strokeLinejoin="round"
        />
        {history.length === 1 && (
          <circle
            cx={x(first)}
            cy={y(latest?.price ?? 0)}
            r="2.5"
            fill="currentColor"
          />
        )}
      </svg>
      <figcaption className="mt-1 flex justify-between font-mono text-xs text-muted">
        <span>
          Low {coins(low)} · High {coins(high)}
        </span>
        <span>Last {coins(latest?.price ?? null)}</span>
      </figcaption>
    </figure>
  );
}
