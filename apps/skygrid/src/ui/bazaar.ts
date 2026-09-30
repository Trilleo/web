/**
 * Talking to the Bazaar (apps/web/src/lib/games/skygrid/bazaar-api.ts). Prices are
 * for anyone; trades go through the Syncer, so they build on everything played.
 */
import { parseSave, type BazaarOp, type BazaarSide } from "../core";
import type { GameSession } from "./session";
import type { ExclusiveResult, Syncer } from "./sync";

export const BAZAAR_URL = "/api/games/skygrid/bazaar";

export interface ProductSummary {
  buy: number | null;
  sell: number | null;
  volume: number;
}

export interface BookLevel {
  price: number;
  quantity: number;
  orders: number;
}

export interface ProductDetail {
  item: string;
  bids: BookLevel[];
  asks: BookLevel[];
  history: { t: number; price: number; volume: number }[];
}

export interface OrderView {
  id: number;
  item: string;
  side: BazaarSide;
  price: number;
  quantity: number;
  filled: number;
  claimed: number;
  status: "open" | "filled" | "done" | "cancelled";
  createdAt: string;
}

async function getJson<T>(
  url: string,
  fetchImpl: typeof fetch,
): Promise<T | null> {
  try {
    const response = await fetchImpl(url, {
      headers: { Accept: "application/json" },
      credentials: "same-origin",
    });
    return response.ok ? ((await response.json()) as T) : null;
  } catch {
    return null;
  }
}

export interface BazaarReader {
  summary(): Promise<Record<string, ProductSummary> | null>;
  product(item: string): Promise<ProductDetail | null>;
  orders(): Promise<OrderView[] | null>;
}

export function bazaarReader(
  fetchImpl: typeof fetch = (input, init) => fetch(input, init),
): BazaarReader {
  return {
    summary: async () =>
      (
        await getJson<{ products: Record<string, ProductSummary> }>(
          BAZAAR_URL,
          fetchImpl,
        )
      )?.products ?? null,
    product: (item) =>
      getJson<ProductDetail>(
        `${BAZAAR_URL}/${encodeURIComponent(item)}`,
        fetchImpl,
      ),
    orders: async () =>
      (
        await getJson<{ orders: OrderView[] }>(
          `${BAZAAR_URL}/orders`,
          fetchImpl,
        )
      )?.orders ?? null,
  };
}

export interface TradeOutcome {
  ok: boolean;
  message: string;
  orders?: OrderView[];
}

/** What a signed-in player can do at the Bazaar. */
export interface BazaarTrader {
  trade(op: BazaarOp): Promise<TradeOutcome>;
}

export function bazaarTrader(
  session: GameSession,
  syncer: Syncer,
  fetchImpl: typeof fetch = (input, init) => fetch(input, init),
): BazaarTrader {
  return {
    async trade(op) {
      let orders: OrderView[] | undefined;
      let message = "";
      const result = await syncer.exclusive(
        async (version): Promise<ExclusiveResult> => {
          let response: Response;
          try {
            response = await fetchImpl(`${BAZAAR_URL}/trade`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
              },
              body: JSON.stringify({ version, op }),
              credentials: "same-origin",
            });
          } catch {
            return {
              ok: false,
              error: "Can’t reach the Bazaar. Check your connection.",
            };
          }
          let body: {
            state?: unknown;
            version?: unknown;
            orders?: OrderView[];
            message?: string;
            error?: string;
          } = {};
          try {
            body = (await response.json()) as typeof body;
          } catch {
            // Not JSON: reported below.
          }
          const state = parseSave(body.state);
          const save =
            state && typeof body.version === "number"
              ? { state, version: body.version }
              : undefined;
          if (response.ok && save) {
            orders = body.orders;
            message = body.message ?? "Done.";
            return { ok: true, save };
          }
          return {
            ok: false,
            error: body.error ?? "The Bazaar couldn’t do that.",
            ...(save && { save }),
          };
        },
      );
      if (!result.ok) {
        session.say(result.error, "warn");
        return { ok: false, message: result.error };
      }
      session.say(message, "big");
      return { ok: true, message, ...(orders && { orders }) };
    },
  };
}
