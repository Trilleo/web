/**
 * The page's side of the calculator engine: a Web Worker when the browser has them,
 * otherwise the same host on this thread. Requests are answered in order; a plan asked
 * for while another runs replaces it, so only the newest settings are solved.
 */
import type { AlternativesView, PlanRequest, PlanView } from "./engine";
import { CalcHost } from "./host";
import type { WorkerRequest, WorkerResponse } from "./protocol";

/** Where the calculator's data comes from (src/pages/api/skyblock/deck.json.ts). */
export const DECK_URL = "/api/skyblock/deck.json";

interface Pending {
  resolve: (response: WorkerResponse) => void;
}

export class CalcClient {
  private worker: Worker | null = null;
  private host: CalcHost | null = null;
  private next = 1;
  private pending = new Map<number, Pending>();
  /** The plan request waiting behind the running one (only the newest is kept). */
  private queuedPlan: {
    request: PlanRequest;
    resolve: (plan: PlanView | null | undefined) => void;
  } | null = null;
  private planning = false;

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
   * A plan, or null for a shard the data doesn't have. Resolves to undefined when a
   * newer request replaced this one before it ran.
   */
  plan(request: PlanRequest): Promise<PlanView | null | undefined> {
    if (this.planning) {
      this.queuedPlan?.resolve(undefined);
      return new Promise((resolve) => {
        this.queuedPlan = { request, resolve };
      });
    }
    this.planning = true;
    return this.send({ type: "plan", request })
      .then((response) => CalcClient.unwrap(response, "plan").plan)
      .finally(() => {
        this.planning = false;
        const queued = this.queuedPlan;
        this.queuedPlan = null;
        if (queued)
          this.plan(queued.request).then(queued.resolve, () => {
            queued.resolve(undefined);
          });
      });
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
