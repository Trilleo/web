/**
 * Hotfix's public side: leaderboards and replays of the runs on them. They follow
 * the profile rules, as Skygrid's do: a private profile shows no name, and blocked
 * accounts don't appear at all.
 */
import { hotfixBests, hotfixPlayers, users, type Database } from "@trilleo/db";
import {
  dayOf,
  isAccessory,
  unpackInputs,
  previousDay,
  type AccessoryId,
  type LoggedInput,
} from "@trilleo/game-hotfix/core";
import { and, asc, desc, eq, isNull } from "drizzle-orm";
import { displayName } from "../../profile/profile";
import { ENDLESS_BOARD, dailyBoard } from "./store";

export const BOARDS = ["endless", "daily", "yesterday"] as const;
export type Board = (typeof BOARDS)[number];

export function isBoard(value: string | null): value is Board {
  return BOARDS.includes(value as Board);
}

export const LEADERBOARD_SIZE = 50;

/** The stored board a leaderboard shows, on a given day. */
export function boardKey(board: Board, now = Date.now()): string {
  const today = dayOf(now);
  if (board === "daily") return dailyBoard(today);
  if (board === "yesterday") return dailyBoard(previousDay(today));
  return ENDLESS_BOARD;
}

export interface LeaderRow {
  rank: number;
  /** The run, to watch. */
  id: string;
  /** Null for a private profile. */
  name: string | null;
  login: string | null;
  score: number;
  metres: number;
}

function shown(row: {
  login: string;
  name: string | null;
  displayName: string | null;
  profilePublic: boolean;
}): { name: string | null; login: string | null } {
  return row.profilePublic
    ? {
        name: displayName({
          username: row.login,
          name: row.name,
          displayName: row.displayName,
        }),
        login: row.login,
      }
    : { name: null, login: null };
}

export async function leaderboard(
  db: Database,
  board: Board,
  now = Date.now(),
  limit = LEADERBOARD_SIZE,
): Promise<LeaderRow[]> {
  const rows = await db
    .select({
      id: hotfixBests.id,
      score: hotfixBests.score,
      metres: hotfixBests.metres,
      login: users.username,
      name: users.name,
      displayName: users.displayName,
      profilePublic: users.profilePublic,
    })
    .from(hotfixBests)
    .innerJoin(users, eq(users.id, hotfixBests.userId))
    .where(
      and(eq(hotfixBests.board, boardKey(board, now)), isNull(users.blockedAt)),
    )
    .orderBy(desc(hotfixBests.score), asc(hotfixBests.achievedAt))
    .limit(limit);
  return rows.map((row, index) => ({
    rank: index + 1,
    id: row.id,
    score: row.score,
    metres: row.metres,
    ...shown(row),
  }));
}

/** A run to watch: its seed and inputs, and whose it was. */
export interface Replay {
  id: string;
  seed: number;
  inputs: LoggedInput[];
  frames: number;
  /** The engine's RULES_VERSION when it was run. */
  rules: number;
  score: number;
  /** "endless" or "daily:<day>". */
  board: string;
  name: string | null;
  login: string | null;
  accessory: AccessoryId | null;
}

/** A best run by its id, or null (none, or its player is blocked). */
export async function findReplay(
  db: Database,
  id: string,
): Promise<Replay | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const [row] = await db
    .select({
      best: hotfixBests,
      login: users.username,
      name: users.name,
      displayName: users.displayName,
      profilePublic: users.profilePublic,
      accessory: hotfixPlayers.accessory,
    })
    .from(hotfixBests)
    .innerJoin(users, eq(users.id, hotfixBests.userId))
    .leftJoin(hotfixPlayers, eq(hotfixPlayers.userId, hotfixBests.userId))
    .where(and(eq(hotfixBests.id, id), isNull(users.blockedAt)));
  if (!row) return null;
  const inputs = unpackInputs(row.best.inputs);
  if (!inputs) return null;
  return {
    id: row.best.id,
    seed: row.best.seed,
    inputs,
    frames: row.best.frames,
    rules: row.best.rules,
    score: row.best.score,
    board: row.best.board,
    accessory: isAccessory(row.accessory) ? row.accessory : null,
    ...shown(row),
  };
}

export function watchHref(id: string): string {
  return `/games/hotfix/?watch=${encodeURIComponent(id)}`;
}
