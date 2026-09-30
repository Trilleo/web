/**
 * Signed in, the island lives in the account: every action is sent to the server,
 * which replays it (see apps/web/src/lib/games/skygrid/api.ts). Actions go in
 * batches every few seconds, and at once when the page is left.
 */
import { parseSave, type Action, type GameState } from "../core";
import type { GameSession } from "./session";

export const SYNC_URL = "/api/games/skygrid/sync";
export const SYNC_EVERY_MS = 3000;
/** The server takes at most this many per request. */
export const SYNC_BATCH = 500;

export type ExclusiveResult =
  | { ok: true; save: { state: GameState; version: number } }
  | { ok: false; error: string; save?: { state: GameState; version: number } };

export type SyncStatus =
  /** Everything played so far is in the account. */
  | "saved"
  /** Some of it is on its way. */
  | "saving"
  /** The server can't be reached; it'll keep trying. */
  | "offline"
  /** Signed out in the meantime: nothing more can be saved. */
  | "signed-out";

export class Syncer {
  private pending: Action[] = [];
  private sending = false;
  private timer: ReturnType<typeof setInterval> | undefined;
  private listeners = new Set<() => void>();
  private status: SyncStatus = "saved";

  constructor(
    private readonly session: GameSession,
    private version: number,
    private readonly fetchImpl: typeof fetch = (input, init) =>
      fetch(input, init),
  ) {}

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getStatus = (): SyncStatus => this.status;

  private setStatus(status: SyncStatus): void {
    if (status === this.status) return;
    this.status = status;
    for (const listener of this.listeners) listener();
  }

  record(action: Action): void {
    if (this.status === "signed-out") return;
    this.pending.push(action);
    if (this.status === "saved") this.setStatus("saving");
  }

  start(): void {
    this.timer ??= setInterval(() => {
      void this.flush();
    }, SYNC_EVERY_MS);
  }

  stop(): void {
    clearInterval(this.timer);
    this.timer = undefined;
  }

  /** Sends what's waiting. `leaving`: the page is going away, so the request must outlive it. */
  async flush(leaving = false): Promise<void> {
    while (
      !this.sending &&
      this.pending.length > 0 &&
      this.status !== "signed-out"
    ) {
      const batch = this.pending.slice(0, SYNC_BATCH);
      this.sending = true;
      let response: Response;
      try {
        response = await this.fetchImpl(SYNC_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({ version: this.version, actions: batch }),
          credentials: "same-origin",
          keepalive: leaving,
        });
      } catch {
        this.sending = false;
        this.setStatus("offline");
        return;
      }
      this.sending = false;
      if (!(await this.handle(response, batch.length))) return;
    }
    if (this.pending.length === 0 && this.status !== "signed-out") {
      this.setStatus("saved");
    }
  }

  /**
   * Runs a request that changes the island on the server (a trade): input pauses,
   * everything played so far is sent first, then `request` gets the version to
   * build on and returns the island the server made, or an error message.
   */
  async exclusive(
    request: (version: number) => Promise<ExclusiveResult>,
  ): Promise<ExclusiveResult> {
    this.session.setPaused(true);
    try {
      await this.flush();
      if (this.pending.length > 0 || this.status === "offline") {
        return {
          ok: false,
          error: "Can’t reach the server. Try again in a moment.",
        };
      }
      const result = await request(this.version);
      if (result.save) {
        this.version = result.save.version;
        this.session.adopt(result.save.state);
      }
      return result;
    } finally {
      this.session.setPaused(false);
    }
  }

  /** Deals with the server's answer; false: stop sending for now. */
  private async handle(response: Response, sent: number): Promise<boolean> {
    let body: { version?: unknown; state?: unknown; error?: unknown } = {};
    try {
      body = (await response.json()) as typeof body;
    } catch {
      // Not JSON (a proxy's error page): treated like being offline.
    }
    if (response.ok && typeof body.version === "number") {
      this.version = body.version;
      this.pending = this.pending.slice(sent);
      return true;
    }
    if (response.status === 401) {
      this.pending = [];
      this.setStatus("signed-out");
      return false;
    }
    const state = parseSave(body.state);
    if (
      (response.status === 409 || response.status === 422) &&
      state &&
      typeof body.version === "number"
    ) {
      // The server's island wins; what was played on top of ours is dropped.
      this.version = body.version;
      this.pending = [];
      const reason =
        typeof body.error === "string"
          ? body.error
          : "Something didn’t add up.";
      this.session.replace(
        state,
        `${reason} Your island was reloaded from your account.`,
      );
      return true;
    }
    this.setStatus("offline");
    return false;
  }
}
