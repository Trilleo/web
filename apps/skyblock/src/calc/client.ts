/**
 * The page's side of the calculator engine: a Web Worker when the browser has them,
 * otherwise the same host on this thread. Requests are answered in order; a plan asked
 * for while another runs replaces it, so only the newest settings are solved.
 */
import type { PriceTable } from "@trilleo/skyblock/calc";
import type {
  AlternativesView,
  MultiRequest,
  MultiView,
  PlanRequest,
  PlanView,
} from "./engine";
import { CalcHost } from "./host";
import type { WorkerRequest, WorkerResponse } from "./protocol";

/** Where the calculator's data comes from (src/pages/api/skyblock/deck.json.ts). */
export const DECK_URL = "/api/skyblock/deck.json";
/** The Bazaar prices the server keeps (src/pages/api/skyblock/prices.json.ts). */
export const PRICES_URL = "/api/skyblock/prices.json";

interface Pending {
  resolve: (response: WorkerResponse) => void;
}

export class CalcClient {
  private worker: Worker | null = null;
  private host: CalcHost | null = null;
  private next = 1;
  private pending = new Map<number, Pending>();
  /** Plans and planner plans: only the newest request waiting behind a running one is kept. */
  private readonly plans = new Latest<PlanRequest, PlanView | null>((request) =>
    this.send({ type: "plan", request }).then(
      (response) => CalcClient.unwrap(response, "plan").plan,
    ),
  );
  private readonly multis = new Latest<MultiRequest, MultiView | null>(
    (request) =>
      this.send({ type: "multi", request }).then(
        (response) => CalcClient.unwrap(response, "multi").multi,
      ),
  );

  constructor(options: { useWorker?: boolean; fetcher?: typeof fetch } = {}) {
    if ((options.useWorker ?? true) && typeof Worker !== "undefined") {
      this.worker = new Worker(new URL("./worker.ts", import.meta.url), {
        type: "module",
      });
      this.worker.addEventListener(
        "message",
        (event: MessageEvent<WorkerResponse>) => {
          this.settle(event.data);
        },
      );
    } else {
      this.host = new CalcHost(options.fetcher);
    }
  }

  private settle(response: WorkerResponse) {
    const waiting = this.pending.get(response.id);
    this.pending.delete(response.id);
    waiting?.resolve(response);
  }

  private send(
    message: Omit<WorkerRequest, "id"> & Record<string, unknown>,
  ): Promise<WorkerResponse> {
    const id = this.next++;
    const full = { ...message, id } as WorkerRequest;
    return new Promise((resolve) => {
      this.pending.set(id, { resolve });
      if (this.worker) this.worker.postMessage(full);
      else
        void this.host?.handle(full).then((response) => {
          this.settle(response);
        });
    });
  }

  private static unwrap<T extends WorkerResponse["type"]>(
    response: WorkerResponse,
    type: T,
  ): Extract<WorkerResponse, { type: T }> {
    if (response.type === "error") throw new Error(response.message);
    if (response.type !== type)
      throw new Error("The calculator answered something else.");
    return response as Extract<WorkerResponse, { type: T }>;
  }

  /** Loads the shard data; resolves to its version. */
  async load(url = DECK_URL): Promise<string> {
    return CalcClient.unwrap(await this.send({ type: "load", url }), "load")
      .version;
  }

  /**
   * Loads the Bazaar prices into the engine; resolves to them and when the server
   * fetched them (null: none yet).
   */
  async loadPrices(
    url = PRICES_URL,
  ): Promise<{ fetchedAt: string | null; prices: PriceTable | null }> {
    const { fetchedAt, prices } = CalcClient.unwrap(
      await this.send({ type: "prices", url }),
      "prices",
    );
    return { fetchedAt, prices };
  }

  /**
   * A plan, or null for a shard the data doesn't have. Resolves to undefined when a
   * newer request replaced this one before it ran.
   */
  plan(request: PlanRequest): Promise<PlanView | null | undefined> {
    return this.plans.run(request);
  }

  /** The hunting planner's plan; undefined when a newer request replaced it. */
  multi(request: MultiRequest): Promise<MultiView | null | undefined> {
    return this.multis.run(request);
  }

  async alternatives(
    request: PlanRequest,
    shard: string,
  ): Promise<AlternativesView | null> {
    return CalcClient.unwrap(
      await this.send({ type: "alternatives", request, shard }),
      "alternatives",
    ).alternatives;
  }

  close(): void {
    this.worker?.terminate();
    this.worker = null;
  }
}

/**
 * Runs one request at a time; one asked for meanwhile waits, and a newer one replaces
 * it (the replaced one resolves to undefined), so only the newest settings are solved.
 */
class Latest<Request, Result> {
  private queued: {
    request: Request;
    resolve: (result: Result | undefined) => void;
  } | null = null;
  private running = false;

  constructor(private readonly start: (request: Request) => Promise<Result>) {}

  run(request: Request): Promise<Result | undefined> {
    if (this.running) {
      this.queued?.resolve(undefined);
      return new Promise((resolve) => {
        this.queued = { request, resolve };
      });
    }
    this.running = true;
    return this.start(request).finally(() => {
      this.running = false;
      const queued = this.queued;
      this.queued = null;
      if (queued)
        this.run(queued.request).then(queued.resolve, () => {
          queued.resolve(undefined);
        });
    });
  }
}
