/**
 * Answers the calculator's requests: loads the Deck (fetch), then plans and
 * alternatives through a CalcEngine. The same code runs in the worker and, where
 * there's no Worker, on the page itself.
 */
import {
  isPriceTable,
  type Deck,
  type PriceTable,
} from "@trilleo/skyblock/calc";
import { CalcEngine } from "./engine";
import type { WorkerRequest, WorkerResponse } from "./protocol";

function isDeck(value: unknown): value is Deck {
  if (typeof value !== "object" || value === null) return false;
  const deck = value as Record<string, unknown>;
  return (
    typeof deck.version === "string" &&
    Array.isArray(deck.shards) &&
    Array.isArray(deck.recipes)
  );
}

export class CalcHost {
  private engine: CalcEngine | null = null;
  /** Prices that arrived before the deck. */
  private prices: { table: PriceTable | null; fetchedAt: string } | null = null;

  constructor(
    private fetcher: typeof fetch = (input, init) => fetch(input, init),
  ) {}

  async handle(message: WorkerRequest): Promise<WorkerResponse> {
    try {
      if (message.type === "load") {
        const response = await this.fetcher(message.url, { cache: "no-cache" });
        if (!response.ok)
          throw new Error(
            `The shard data didn't load (HTTP ${String(response.status)}).`,
          );
        const deck: unknown = await response.json();
        if (!isDeck(deck)) throw new Error("The shard data didn't read.");
        this.engine = new CalcEngine(deck);
        if (this.prices)
          this.engine.setPrices(this.prices.table, this.prices.fetchedAt);
        return { id: message.id, type: "load", version: deck.version };
      }
      if (message.type === "prices") {
        const response = await this.fetcher(message.url, { cache: "no-cache" });
        if (!response.ok)
          throw new Error(
            `The prices didn't load (HTTP ${String(response.status)}).`,
          );
        const body: unknown = await response.json();
        const record =
          typeof body === "object" && body !== null
            ? (body as Record<string, unknown>)
            : {};
        const table = record.prices === null ? null : record.prices;
        if (table !== null && !isPriceTable(table))
          throw new Error("The prices didn't read.");
        const fetchedAt =
          typeof record.fetchedAt === "string" ? record.fetchedAt : null;
        this.prices = { table, fetchedAt: fetchedAt ?? "" };
        this.engine?.setPrices(table, fetchedAt ?? "");
        return {
          id: message.id,
          type: "prices",
          fetchedAt: table ? fetchedAt : null,
          prices: table,
        };
      }
      if (!this.engine) throw new Error("The shard data hasn't loaded yet.");
      if (message.type === "plan")
        return {
          id: message.id,
          type: "plan",
          plan: this.engine.plan(message.request),
        };
      return {
        id: message.id,
        type: "alternatives",
        alternatives: this.engine.alternatives(message.request, message.shard),
      };
    } catch (error) {
      return {
        id: message.id,
        type: "error",
        message:
          error instanceof Error ? error.message : "Something went wrong.",
      };
    }
  }
}
