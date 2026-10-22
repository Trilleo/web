import {
  dayOf,
  packInputs,
  type AccessoryId,
  type CrashCause,
  type LoggedInput,
  type RunMode,
  type RunResult,
} from "../core";

/*
 * Talks to the server for signed-in players (see apps/web's lib/games/hotfix/api.ts).
 * Tickets are fetched ahead, so a run starts the moment Space goes down; without
 * one (offline, say) the run still plays, it just isn't counted.
 */

export const API = "/api/games/hotfix";

export interface Ticket {
  id: string;
  seed: number;
  mode: RunMode;
  day: string | null;
}

/** A best run, as the server ranks it. */
export interface BestView {
  id: string;
  score: number;
  metres: number;
  rank: number;
}

/** The player's record, as the server keeps it. */
export interface PlayerView {
  runs: number;
  tokens: number;
  furthest: number;
  achievements: string[];
  accessory: AccessoryId | null;
  endless: BestView | null;
  daily: BestView | null;
}

export interface Checked {
  result: RunResult;
  cause: CrashCause | null;
  mode: RunMode;
  newBest: boolean;
  unlocked: string[];
  player: PlayerView;
}

export type CheckOutcome =
  { ok: true; checked: Checked } | { ok: false; error: string };

async function post(path: string, body: unknown): Promise<Response> {
  return fetch(`${API}/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(body),
    credentials: "same-origin",
  });
}

async function errorOf(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { error?: unknown };
    if (typeof body.error === "string") return body.error;
  } catch {
    // Not JSON: say something general.
  }
  return response.status === 401
    ? "You’ve been signed out, so this run wasn’t counted."
    : "Something went wrong, so this run wasn’t counted.";
}

export class Account {
  private ready = new Map<RunMode, Ticket>();
  private pending = new Map<RunMode, Promise<void>>();

  /** Gets a ticket for the next run in this mode, unless one is waiting. */
  prefetch(mode: RunMode): Promise<void> {
    if (this.ready.has(mode)) return Promise.resolve();
    const waiting = this.pending.get(mode);
    if (waiting) return waiting;
    const fetching = (async () => {
      try {
        const response = await post("runs", { mode });
        if (response.ok)
          this.ready.set(mode, (await response.json()) as Ticket);
      } catch {
        // Offline: the next run plays unchecked.
      } finally {
        this.pending.delete(mode);
      }
    })();
    this.pending.set(mode, fetching);
    return fetching;
  }

  /** The waiting ticket, if there is one (a Daily Run's only on its own day). */
  take(mode: RunMode, now = Date.now()): Ticket | null {
    const ticket = this.ready.get(mode) ?? null;
    this.ready.delete(mode);
    if (ticket && mode === "daily" && ticket.day !== dayOf(now)) return null;
    return ticket;
  }

  /** Hands a finished run in to be replayed and counted. */
  async finish(
    ticket: Ticket,
    log: readonly LoggedInput[],
  ): Promise<CheckOutcome> {
    try {
      const response = await post("finish", {
        ticket: ticket.id,
        inputs: packInputs(log),
      });
      if (!response.ok) return { ok: false, error: await errorOf(response) };
      return { ok: true, checked: (await response.json()) as Checked };
    } catch {
      return {
        ok: false,
        error: "Couldn’t reach the server, so this run wasn’t counted.",
      };
    }
  }

  async wear(accessory: AccessoryId | null): Promise<boolean> {
    try {
      return (await post("look", { accessory })).ok;
    } catch {
      return false;
    }
  }
}
