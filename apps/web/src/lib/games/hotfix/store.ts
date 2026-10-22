/**
 * Hotfix runs in the database. The server hands out a seed (a ticket), and when the
 * run is over it replays the browser's input log through the same engine: the score
 * is whatever that replay comes to, never what the browser says.
 */
import {
  hotfixBests,
  hotfixPlayers,
  hotfixTickets,
  type Database,
} from "@trilleo/db";
import {
  FPS,
  MAX_RUN_FRAMES,
  RULES_VERSION,
  dailySeed,
  dayOf,
  isAccessory,
  newlyEarned,
  packInputs,
  replay,
  resultOf,
  unlockedAccessories,
  type AccessoryId,
  type CrashCause,
  type LoggedInput,
  type RunMode,
  type RunResult,
} from "@trilleo/game-hotfix/core";
import { and, asc, count, eq, gt, inArray, like, lt, sql } from "drizzle-orm";

export const TICKET_LIMITS = {
  /** Unused tickets one player may hold; older ones are dropped. */
  outstanding: 4,
  /** Unused tickets go after this long. */
  maxAgeMs: 24 * 60 * 60 * 1000,
} as const;

/**
 * A run can't be longer than the time since its ticket: a tenth more for clocks and
 * frame timing, plus a few seconds for the request.
 */
export const CLOCK_SLACK = { factor: 1.1, frames: 3 * FPS } as const;

export const ENDLESS_BOARD = "endless";

export function dailyBoard(day: string): string {
  return `daily:${day}`;
}

export interface Ticket {
  id: string;
  seed: number;
  mode: RunMode;
  /** The Daily Run's day; null for endless runs. */
  day: string | null;
}

function randomSeed(): number {
  return crypto.getRandomValues(new Uint32Array(1))[0] ?? 1;
}

/** A seed for the next run, kept until it's used (or for a day). */
export async function issueTicket(
  db: Database,
  userId: string,
  mode: RunMode,
  now = Date.now(),
  makeSeed: () => number = randomSeed,
): Promise<Ticket> {
  const day = mode === "daily" ? dayOf(now) : null;
  const seed = day ? dailySeed(day) : makeSeed() >>> 0;

  await db
    .delete(hotfixTickets)
    .where(
      and(
        eq(hotfixTickets.userId, userId),
        lt(hotfixTickets.issuedAt, new Date(now - TICKET_LIMITS.maxAgeMs)),
      ),
    );
  const held = await db
    .select({ id: hotfixTickets.id })
    .from(hotfixTickets)
    .where(eq(hotfixTickets.userId, userId))
    .orderBy(asc(hotfixTickets.issuedAt));
  const extra = held.length - (TICKET_LIMITS.outstanding - 1);
  if (extra > 0) {
    await db.delete(hotfixTickets).where(
      inArray(
        hotfixTickets.id,
        held.slice(0, extra).map((ticket) => ticket.id),
      ),
    );
  }

  const [ticket] = await db
    .insert(hotfixTickets)
    .values({ userId, mode, day, seed, issuedAt: new Date(now) })
    .returning({ id: hotfixTickets.id });
  if (!ticket) throw new Error("Ticket not saved");
  return { id: ticket.id, seed, mode, day };
}

export interface BestView {
  id: string;
  score: number;
  metres: number;
  /** 1 for the top of the board. */
  rank: number;
}

export interface PlayerView {
  runs: number;
  tokens: number;
  furthest: number;
  achievements: string[];
  accessory: AccessoryId | null;
  endless: BestView | null;
  /** Today's Daily Run. */
  daily: BestView | null;
}

async function bestOn(
  db: Database,
  userId: string,
  board: string,
): Promise<BestView | null> {
  const [best] = await db
    .select({
      id: hotfixBests.id,
      score: hotfixBests.score,
      metres: hotfixBests.metres,
    })
    .from(hotfixBests)
    .where(and(eq(hotfixBests.userId, userId), eq(hotfixBests.board, board)));
  if (!best) return null;
  const [ahead] = await db
    .select({ n: count() })
    .from(hotfixBests)
    .where(
      and(eq(hotfixBests.board, board), gt(hotfixBests.score, best.score)),
    );
  return { ...best, rank: (ahead?.n ?? 0) + 1 };
}

function storedAchievements(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((id): id is string => typeof id === "string")
    : [];
}

/** Someone's Hotfix record, or the empty one if they haven't finished a run. */
export async function loadPlayer(
  db: Database,
  userId: string,
  now = Date.now(),
): Promise<PlayerView> {
  const [row] = await db
    .select()
    .from(hotfixPlayers)
    .where(eq(hotfixPlayers.userId, userId));
  const [endless, daily] = await Promise.all([
    bestOn(db, userId, ENDLESS_BOARD),
    bestOn(db, userId, dailyBoard(dayOf(now))),
  ]);
  const accessory = row?.accessory;
  return {
    runs: row?.runs ?? 0,
    tokens: row?.tokens ?? 0,
    furthest: row?.furthest ?? 0,
    achievements: storedAchievements(row?.achievements),
    accessory: isAccessory(accessory) ? accessory : null,
    endless,
    daily,
  };
}

export type FinishResult =
  | {
      ok: true;
      result: RunResult;
      cause: CrashCause | null;
      mode: RunMode;
      /** Beat their best on this board. */
      newBest: boolean;
      /** Achievements earned just now. */
      unlocked: string[];
      player: PlayerView;
    }
  | { ok: false; error: "unknown-ticket" | "unfinished" };

/**
 * Checks a finished run: the ticket is used up, its input log replayed, and the
 * result counted (totals, best on its board, achievements). A log that doesn't
 * crash within the time since the ticket isn't a finished run.
 */
export async function finishRun(
  db: Database,
  userId: string,
  ticketId: string,
  inputs: readonly LoggedInput[],
  now = Date.now(),
): Promise<FinishResult> {
  const [ticket] = await db
    .delete(hotfixTickets)
    .where(
      and(eq(hotfixTickets.id, ticketId), eq(hotfixTickets.userId, userId)),
    )
    .returning();
  if (!ticket) return { ok: false, error: "unknown-ticket" };

  const elapsed = Math.max(0, now - ticket.issuedAt.getTime());
  const allowed = Math.min(
    MAX_RUN_FRAMES,
    Math.floor((elapsed / 1000) * FPS * CLOCK_SLACK.factor) +
      CLOCK_SLACK.frames,
  );
  const run = replay(ticket.seed, inputs, allowed);
  if (run.alive) return { ok: false, error: "unfinished" };

  const result = resultOf(run);
  const board =
    ticket.mode === "daily" && ticket.day
      ? dailyBoard(ticket.day)
      : ENDLESS_BOARD;

  const counted = await db.transaction(async (tx) => {
    await tx.insert(hotfixPlayers).values({ userId }).onConflictDoNothing();
    const [player] = await tx
      .select()
      .from(hotfixPlayers)
      .where(eq(hotfixPlayers.userId, userId))
      .for("update");
    if (!player) throw new Error("Hotfix player vanished");

    const improved = await tx
      .insert(hotfixBests)
      .values({
        userId,
        board,
        ...result,
        seed: ticket.seed,
        rules: RULES_VERSION,
        inputs: packInputs(inputs),
        achievedAt: new Date(now),
      })
      .onConflictDoUpdate({
        target: [hotfixBests.userId, hotfixBests.board],
        set: {
          score: result.score,
          metres: result.metres,
          tokens: result.tokens,
          frames: result.frames,
          seed: ticket.seed,
          rules: RULES_VERSION,
          inputs: packInputs(inputs),
          achievedAt: new Date(now),
        },
        setWhere: sql`${hotfixBests.score} < ${result.score}`,
      })
      .returning({ id: hotfixBests.id });

    const [days] = await tx
      .select({ n: count() })
      .from(hotfixBests)
      .where(
        and(eq(hotfixBests.userId, userId), like(hotfixBests.board, "daily:%")),
      );
    const totals = {
      runs: player.runs + 1,
      tokens: player.tokens + result.tokens,
      furthest: Math.max(player.furthest, result.metres),
      dailyDays: days?.n ?? 0,
    };
    const had = storedAchievements(player.achievements);
    const unlocked = newlyEarned(run, totals, had);
    await tx
      .update(hotfixPlayers)
      .set({
        runs: totals.runs,
        tokens: totals.tokens,
        furthest: totals.furthest,
        achievements: [...had, ...unlocked],
        updatedAt: new Date(now),
      })
      .where(eq(hotfixPlayers.userId, userId));
    return { newBest: improved.length > 0, unlocked };
  });

  return {
    ok: true,
    result,
    cause: run.cause,
    mode: ticket.mode,
    ...counted,
    player: await loadPlayer(db, userId, now),
  };
}

/** Wears an accessory (or none). Only ones their achievements unlocked. */
export async function setAccessory(
  db: Database,
  userId: string,
  accessory: AccessoryId | null,
  now = Date.now(),
): Promise<boolean> {
  const [row] = await db
    .select({ achievements: hotfixPlayers.achievements })
    .from(hotfixPlayers)
    .where(eq(hotfixPlayers.userId, userId));
  if (!row) return accessory === null;
  if (
    accessory !== null &&
    !unlockedAccessories(storedAchievements(row.achievements)).includes(
      accessory,
    )
  ) {
    return false;
  }
  await db
    .update(hotfixPlayers)
    .set({ accessory, updatedAt: new Date(now) })
    .where(eq(hotfixPlayers.userId, userId));
  return true;
}

/** Everything kept about someone's Hotfix play, for the account export. */
export async function exportHotfix(db: Database, userId: string) {
  const [player] = await db
    .select({
      runs: hotfixPlayers.runs,
      tokens: hotfixPlayers.tokens,
      furthest: hotfixPlayers.furthest,
      achievements: hotfixPlayers.achievements,
      accessory: hotfixPlayers.accessory,
      createdAt: hotfixPlayers.createdAt,
      updatedAt: hotfixPlayers.updatedAt,
    })
    .from(hotfixPlayers)
    .where(eq(hotfixPlayers.userId, userId));
  const bests = await db
    .select({
      board: hotfixBests.board,
      score: hotfixBests.score,
      metres: hotfixBests.metres,
      tokens: hotfixBests.tokens,
      seed: hotfixBests.seed,
      inputs: hotfixBests.inputs,
      achievedAt: hotfixBests.achievedAt,
    })
    .from(hotfixBests)
    .where(eq(hotfixBests.userId, userId))
    .orderBy(asc(hotfixBests.board));
  return player ? { ...player, bests } : null;
}
