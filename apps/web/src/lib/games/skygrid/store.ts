/**
 * Skygrid saves in the database. The server never takes the browser's word for a
 * state: it replays the player's actions through the same engine and keeps the
 * result (see apps/skygrid/src/core).
 */
import { skygridSaves, type Database } from "@trilleo/db";
import {
  GameRuleError,
  applyAction,
  parseSave,
  totalSkillXp,
  type Action,
  type GameState,
} from "@trilleo/game-skygrid/core";
import { eq } from "drizzle-orm";

/** Most actions in one sync (a few seconds of play is well under this). */
export const SYNC_MAX_ACTIONS = 500;
/** How far ahead of the server's clock an action may be stamped. */
export const CLOCK_SLACK_MS = 5000;

export interface AccountSave {
  state: GameState;
  version: number;
}

function toSave(row: { state: unknown; version: number }): AccountSave {
  const state = parseSave(row.state);
  // Only the engine writes saves, so this means the save format changed without
  // a migration in parseSave: a bug to fix, not a player's problem to see.
  if (!state) throw new Error("Unreadable Skygrid save");
  return { state, version: row.version };
}

export async function loadSkygridSave(
  db: Database,
  userId: string,
): Promise<AccountSave | null> {
  const [row] = await db
    .select({ state: skygridSaves.state, version: skygridSaves.version })
    .from(skygridSaves)
    .where(eq(skygridSaves.userId, userId));
  return row ? toSave(row) : null;
}

function totals(state: GameState) {
  return { skillXp: totalSkillXp(state), coins: state.coins };
}

export type StartResult =
  | { ok: true; save: AccountSave }
  | { ok: false; error: "exists"; save: AccountSave };

/** Gives an account its first island (new, or brought from a browser). */
export async function startSkygridSave(
  db: Database,
  userId: string,
  state: GameState,
  now = new Date(),
): Promise<StartResult> {
  const created = await db
    .insert(skygridSaves)
    .values({
      userId,
      state,
      version: 1,
      ...totals(state),
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoNothing()
    .returning({ version: skygridSaves.version });
  if (created.length > 0) return { ok: true, save: { state, version: 1 } };
  const save = await loadSkygridSave(db, userId);
  if (!save) throw new Error("Skygrid save vanished");
  return { ok: false, error: "exists", save };
}

export type SyncResult =
  | { ok: true; version: number; applied: number }
  | { ok: false; error: "no-save" }
  /** The client was behind (another tab played): here's the current island. */
  | { ok: false; error: "conflict"; save: AccountSave }
  /** An action broke a rule: everything before it was kept. */
  | { ok: false; error: "rejected"; message: string; save: AccountSave };

/**
 * Replays a batch of actions on the saved island. `version` is the one the client
 * last saw; the row is locked, so two syncs can't interleave.
 */
export async function syncSkygridSave(
  db: Database,
  userId: string,
  input: { version: number; actions: readonly Action[] },
  now = Date.now(),
): Promise<SyncResult> {
  return db.transaction(async (tx): Promise<SyncResult> => {
    const [row] = await tx
      .select({ state: skygridSaves.state, version: skygridSaves.version })
      .from(skygridSaves)
      .where(eq(skygridSaves.userId, userId))
      .for("update");
    if (!row) return { ok: false, error: "no-save" };
    const saved = toSave(row);
    if (saved.version !== input.version) {
      return { ok: false, error: "conflict", save: saved };
    }

    let state = saved.state;
    let applied = 0;
    let message: string | null = null;
    for (const action of input.actions) {
      if (action.t > now + CLOCK_SLACK_MS) {
        message = "Your device’s clock is ahead of ours.";
        break;
      }
      try {
        state = applyAction(state, action).state;
        applied += 1;
      } catch (error) {
        if (!(error instanceof GameRuleError)) throw error;
        message = error.message;
        break;
      }
    }

    let version = saved.version;
    if (applied > 0) {
      version += 1;
      await tx
        .update(skygridSaves)
        .set({ state, version, ...totals(state), updatedAt: new Date(now) })
        .where(eq(skygridSaves.userId, userId));
    }
    if (message !== null) {
      return {
        ok: false,
        error: "rejected",
        message,
        save: { state, version },
      };
    }
    return { ok: true, version, applied };
  });
}
