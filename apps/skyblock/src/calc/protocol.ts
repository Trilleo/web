/** Messages between the calculator page and its worker (worker.ts). */
import type { AlternativesView, PlanRequest, PlanView } from "./engine";

export type WorkerRequest =
  | { id: number; type: "load"; url: string }
  | { id: number; type: "plan"; request: PlanRequest }
  | { id: number; type: "alternatives"; request: PlanRequest; shard: string };

export type WorkerResponse =
  | { id: number; type: "load"; version: string }
  | { id: number; type: "plan"; plan: PlanView | null }
  | { id: number; type: "alternatives"; alternatives: AlternativesView | null }
  | { id: number; type: "error"; message: string };
