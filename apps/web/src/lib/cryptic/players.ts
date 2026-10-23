/**
 * Playing the daily cryptic through an API app: players (cryptic_players, one per app
 * and the app's own ID for them), their guesses on the day's puzzle
 * (cryptic_attempts), and what's worked out from those: ranks, streaks and the
 * leaderboards. Everything is per app: one bot's players never meet another's.
 */
import {
  crypticAttempts,
  crypticPlayers,
  crypticPuzzles,
  type CrypticPlayer,
  type CrypticPuzzle,
  type Database,
} from "@trilleo/db";
import {
  checkGuess,
  dayStart,
  parseEnumeration,
  streaks,
  type GuessCheck,
} from "@trilleo/cryptic";
import {
  and,
  asc,
  count,
  eq,
  isNotNull,
  isNull,
  lt,
  or,
  sql,
  type SQL,
} from "drizzle-orm";
import { puzzleDays } from "./puzzles";

export interface PlayerRef {
  /** The app's own ID for them (a Discord user ID). */
  id: string;
  /** The name to show; the latest one sent wins. */
  name: string;
}

/** The player, made on first sight; their name follows what the app last sent. */
async function upsertPlayer(
  db: Database,
  appId: number,
  player: PlayerRef,
  now: Date,
): Promise<CrypticPlayer> {
  const [row] = await db
    .insert(crypticPlayers)
    .values({
      appId,
      externalId: player.id,
      name: player.name,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: [crypticPlayers.appId, crypticPlayers.externalId],
      set: { name: player.name, updatedAt: now },
    })
    .returning();
  if (!row) throw new Error("The player wasn't saved.");
  return row;
}

export async function findPlayer(
  db: Database,
  appId: number,
  externalId: string,
): Promise<CrypticPlayer | undefined> {
  const [row] = await db
    .select()
    .from(crypticPlayers)
    .where(
      and(
        eq(crypticPlayers.appId, appId),
        eq(crypticPlayers.externalId, externalId),
      ),
    );
  return row;
}

/** Forgets a player and everything they did (an app's "delete my data"). */
export async function deletePlayer(
  db: Database,
  appId: number,
  externalId: string,
): Promise<boolean> {
  const rows = await db
    .delete(crypticPlayers)
    .where(
      and(
        eq(crypticPlayers.appId, appId),
        eq(crypticPlayers.externalId, externalId),
      ),
    )
    .returning({ id: crypticPlayers.id });
  return rows.length > 0;
}

export type GuessResult =
  | { kind: "length"; letters: number; got: number }
  | {
      kind: "checked";
      correct: boolean;
      /** Counted for the day's leaderboard (today's puzzle only). */
      scored: boolean;
      /** Today's counted tries so far; null for practice. */
      tries: number | null;
      solved: boolean;
      /** Solved before this guess: it changed nothing. */
      alreadySolved: boolean;
      /** Place among the app's solvers today, once solved. */
      rank: number | null;
    };

/**
 * Checks a guess. On today's puzzle it counts (unless the player has already solved
 * it); on a past one it's practice and nothing is kept. A guess with the wrong number
 * of letters is never counted.
 */
export async function recordGuess(
  db: Database,
  args: {
    appId: number;
    player: PlayerRef;
    puzzle: CrypticPuzzle & { day: string };
    guess: string;
    today: string;
    now: Date;
  },
): Promise<GuessResult> {
  const { appId, puzzle, today, now } = args;
  const enumeration = parseEnumeration(puzzle.enumeration);
  if (!enumeration)
    throw new Error(`Puzzle ${String(puzzle.id)} has a bad enumeration.`);
  const check: GuessCheck = checkGuess(args.guess, puzzle.answer, enumeration);
  if (check.kind === "length") return check;
  const correct = check.kind === "correct";
  if (puzzle.day !== today)
    return {
      kind: "checked",
      correct,
      scored: false,
      tries: null,
      solved: correct,
      alreadySolved: false,
      rank: null,
    };

  const player = await upsertPlayer(db, appId, args.player, now);
  // One statement, so two guesses at once both count and a solve can't be undone.
  const [counted] = await db
    .insert(crypticAttempts)
    .values({
      playerId: player.id,
      puzzleId: puzzle.id,
      tries: 1,
      firstGuessAt: now,
      solvedAt: correct ? now : null,
    })
    .onConflictDoUpdate({
      target: [crypticAttempts.playerId, crypticAttempts.puzzleId],
      set: {
        tries: sql`${crypticAttempts.tries} + 1`,
        solvedAt: correct ? now : null,
      },
      setWhere: isNull(crypticAttempts.solvedAt),
    })
    .returning();
  const attempt =
    counted ??
    (
      await db
        .select()
        .from(crypticAttempts)
        .where(
          and(
            eq(crypticAttempts.playerId, player.id),
            eq(crypticAttempts.puzzleId, puzzle.id),
          ),
        )
    )[0];
  if (!attempt) throw new Error("The guess wasn't recorded.");
  const solved = attempt.solvedAt !== null;
  return {
    kind: "checked",
    correct,
    scored: counted !== undefined,
    tries: attempt.tries,
    solved,
    alreadySolved: counted === undefined,
    rank: solved ? await rankOf(db, appId, puzzle.id, attempt) : null,
  };
}

/** 1 + the app's solvers who did better: fewer tries, or as few and sooner. */
async function rankOf(
  db: Database,
  appId: number,
  puzzleId: number,
  mine: { tries: number; solvedAt: Date | null },
): Promise<number> {
  if (!mine.solvedAt) return 0;
  const [row] = await db
    .select({ n: count() })
    .from(crypticAttempts)
    .innerJoin(crypticPlayers, eq(crypticPlayers.id, crypticAttempts.playerId))
    .where(
      and(
        eq(crypticPlayers.appId, appId),
        eq(crypticAttempts.puzzleId, puzzleId),
        isNotNull(crypticAttempts.solvedAt),
        or(
          lt(crypticAttempts.tries, mine.tries),
          and(
            eq(crypticAttempts.tries, mine.tries),
            lt(crypticAttempts.solvedAt, mine.solvedAt),
          ),
        ),
      ),
    );
  return (row?.n ?? 0) + 1;
}

export interface DayEntry {
  rank: number;
  player: PlayerRef;
  tries: number;
  solvedAt: string;
  /** Seconds from the day's start to the solve. */
  seconds: number;
}

export interface DayBoard {
  /** The app's players who guessed (with the right number of letters). */
  players: number;
  solvers: number;
  items: DayEntry[];
}

/** The app's solvers of one puzzle, best first. */
export async function dayLeaderboard(
  db: Database,
  appId: number,
  puzzle: CrypticPuzzle & { day: string },
  limit: number,
): Promise<DayBoard> {
  const rows = await db
    .select({
      externalId: crypticPlayers.externalId,
      name: crypticPlayers.name,
      tries: crypticAttempts.tries,
      solvedAt: crypticAttempts.solvedAt,
    })
    .from(crypticAttempts)
    .innerJoin(crypticPlayers, eq(crypticPlayers.id, crypticAttempts.playerId))
    .where(
      and(
        eq(crypticPlayers.appId, appId),
        eq(crypticAttempts.puzzleId, puzzle.id),
      ),
    )
    .orderBy(asc(crypticAttempts.tries), asc(crypticAttempts.solvedAt));
  const start = dayStart(puzzle.day).getTime();
  const solved = rows.filter(
    (row): row is typeof row & { solvedAt: Date } => row.solvedAt !== null,
  );
  return {
    players: rows.length,
    solvers: solved.length,
    items: solved.slice(0, limit).map((row, index) => ({
      rank: index + 1,
      player: { id: row.externalId, name: row.name },
      tries: row.tries,
      solvedAt: row.solvedAt.toISOString(),
      seconds: Math.floor((row.solvedAt.getTime() - start) / 1000),
    })),
  };
}

export interface PlayerStats {
  player: PlayerRef;
  /** Puzzles solved on their day. */
  solved: number;
  /** Puzzles guessed at on their day. */
  played: number;
  currentStreak: number;
  bestStreak: number;
  /** Over solved puzzles, to one decimal; null before the first. */
  averageTries: number | null;
}

interface AttemptRow {
  playerId: number;
  day: string | null;
  tries: number;
  solvedAt: Date | null;
}

function statsOf(
  player: CrypticPlayer,
  attempts: readonly AttemptRow[],
  days: readonly string[],
  today: string,
): PlayerStats {
  const solvedRows = attempts.filter((row) => row.solvedAt !== null);
  const { current, best } = streaks(
    days,
    new Set(solvedRows.flatMap((row) => (row.day ? [row.day] : []))),
    today,
  );
  const tries = solvedRows.reduce((total, row) => total + row.tries, 0);
  return {
    player: { id: player.externalId, name: player.name },
    solved: solvedRows.length,
    played: attempts.length,
    currentStreak: current,
    bestStreak: best,
    averageTries:
      solvedRows.length > 0
        ? Math.round((tries / solvedRows.length) * 10) / 10
        : null,
  };
}

async function attemptsOf(db: Database, where: SQL): Promise<AttemptRow[]> {
  return db
    .select({
      playerId: crypticAttempts.playerId,
      day: crypticPuzzles.day,
      tries: crypticAttempts.tries,
      solvedAt: crypticAttempts.solvedAt,
    })
    .from(crypticAttempts)
    .innerJoin(crypticPuzzles, eq(crypticPuzzles.id, crypticAttempts.puzzleId))
    .innerJoin(crypticPlayers, eq(crypticPlayers.id, crypticAttempts.playerId))
    .where(where);
}

export async function playerStats(
  db: Database,
  player: CrypticPlayer,
  today: string,
): Promise<PlayerStats> {
  const attempts = await attemptsOf(
    db,
    eq(crypticAttempts.playerId, player.id),
  );
  return statsOf(player, attempts, await puzzleDays(db, today), today);
}

/** A player's go at today's puzzle, if any. */
export async function attemptOn(
  db: Database,
  player: CrypticPlayer,
  puzzleId: number,
): Promise<{ tries: number; solved: boolean } | null> {
  const [row] = await db
    .select()
    .from(crypticAttempts)
    .where(
      and(
        eq(crypticAttempts.playerId, player.id),
        eq(crypticAttempts.puzzleId, puzzleId),
      ),
    );
  return row ? { tries: row.tries, solved: row.solvedAt !== null } : null;
}

export const BOARDS = ["streak", "solved"] as const;
export type Board = (typeof BOARDS)[number];

/**
 * The app's all-time leaderboard, players who've solved at least one: by current
 * streak (then best streak, then solved), or by puzzles solved (then fewer tries).
 */
export async function leaderboard(
  db: Database,
  appId: number,
  board: Board,
  limit: number,
  today: string,
): Promise<(PlayerStats & { rank: number })[]> {
  const players = await db
    .select()
    .from(crypticPlayers)
    .where(eq(crypticPlayers.appId, appId));
  const attempts = await attemptsOf(db, eq(crypticPlayers.appId, appId));
  const days = await puzzleDays(db, today);
  const byPlayer = new Map<number, AttemptRow[]>();
  for (const row of attempts) {
    const list = byPlayer.get(row.playerId) ?? [];
    list.push(row);
    byPlayer.set(row.playerId, list);
  }
  const all = players
    .map((player) =>
      statsOf(player, byPlayer.get(player.id) ?? [], days, today),
    )
    .filter((stats) => stats.solved > 0);
  const tries = (stats: PlayerStats) => stats.averageTries ?? Infinity;
  all.sort((a, b) =>
    board === "streak"
      ? b.currentStreak - a.currentStreak ||
        b.bestStreak - a.bestStreak ||
        b.solved - a.solved ||
        a.player.name.localeCompare(b.player.name)
      : b.solved - a.solved ||
        tries(a) - tries(b) ||
        b.bestStreak - a.bestStreak ||
        a.player.name.localeCompare(b.player.name),
  );
  return all
    .slice(0, limit)
    .map((stats, index) => ({ ...stats, rank: index + 1 }));
}
