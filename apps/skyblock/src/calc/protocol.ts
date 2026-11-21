/** Messages between the calculator page and its worker (worker.ts). */
import type { PriceTable } from "@trilleo/skyblock/calc";
import type {
  AlternativesView,
  MultiRequest,
  MultiView,
  PlanRequest,
  PlanView,
} from "./engine";

export type WorkerRequest =
  | { id: number; type: "load"; url: string }
  | { id: number; type: "prices"; url: string }
  | { id: number; type: "plan"; request: PlanRequest }
  | { id: number; type: "multi"; request: MultiRequest }
  | { id: number; type: "alternatives"; request: PlanRequest; shard: string };

export type WorkerResponse =
  | { id: number; type: "load"; version: string }
  /** fetchedAt: when the server fetched them; null: it has none yet. */
  | {
      id: number;
      type: "prices";
      fetchedAt: string | null;
      prices: PriceTable | null;
    }
  | { id: number; type: "plan"; plan: PlanView | null }
  | { id: number; type: "multi"; multi: MultiView | null }
  | { id: number; type: "alternatives"; alternatives: AlternativesView | null }
  | { id: number; type: "error"; message: string };
