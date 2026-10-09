/**
 * Skygrid's public side: leaderboards, and other players' islands. Both follow the
 * profile rules: a private profile shows no name and has no island page, and
 * blocked accounts don't appear at all.
 */
import { skygridSaves, users, type Database, type User } from "@trilleo/db";
import {
  SKILLS,
  parseSave,
  type GameState,
  type SkillId,
} from "@trilleo/game-skygrid/core";
import { and, desc, eq, gt, isNull, sql } from "drizzle-orm";
import { normalizeUsername } from "../../auth/usernames";
import { displayName } from "../../profile/profile";

export const BOARDS = ["total", ...SKILLS, "coins"] as const;
export type Board = (typeof BOARDS)[number];

export function isBoard(value: string | null): value is Board {
  return BOARDS.includes(value as Board);
}

export const LEADERBOARD_SIZE = 50;

export interface LeaderRow {
  rank: number;
  /** Null for a private profile. */
  name: string | null;
  login: string | null;
  /** XP (skills, total) or coins. */
  value: number;
}

function score(board: Board) {
  if (board === "total") return sql<number>`${skygridSaves.skillXp}::float8`;
  if (board === "coins") return sql<number>`${skygridSaves.coins}::float8`;
  return sql<number>`coalesce((${skygridSaves.state} -> 'skills' ->> ${board satisfies SkillId})::float8, 0)`;
}

export async function leaderboard(
  db: Database,
  board: Board,
  limit = LEADERBOARD_SIZE,
): Promise<LeaderRow[]> {
  const value = score(board);
  const rows = await db
    .select({
      value,
      login: users.username,
      name: users.name,
      displayName: users.displayName,
      profilePublic: users.profilePublic,
    })
    .from(skygridSaves)
    .innerJoin(users, sql`${users.id} = ${skygridSaves.userId}`)
    .where(and(isNull(users.blockedAt), gt(value, 0)))
    .orderBy(desc(value), skygridSaves.createdAt)
    .limit(limit);
  return rows.map((row, index) => ({
    rank: index + 1,
    name: row.profilePublic
      ? displayName({
          username: row.login,
          name: row.name,
          displayName: row.displayName,
        })
      : null,
    login: row.profilePublic ? row.login : null,
    value: row.value,
  }));
}

export interface IslandPage {
  user: User;
  state: GameState;
}

/**
 * Someone's island, by username: null if there's none to show (no island,
 * blocked, or a private profile, except to its owner).
 */
export async function findIsland(
  db: Database,
  login: string,
  viewerId: string | null,
): Promise<IslandPage | null> {
  const [row] = await db
    .select({ user: users, state: skygridSaves.state })
    .from(users)
    .innerJoin(skygridSaves, sql`${skygridSaves.userId} = ${users.id}`)
    .where(
      and(
        eq(users.username, normalizeUsername(login)),
        isNull(users.blockedAt),
      ),
    )
    .limit(1);
  if (!row) return null;
  if (!row.user.profilePublic && row.user.id !== viewerId) return null;
  const state = parseSave(row.state);
  return state ? { user: row.user, state } : null;
}

/** Their island's page. */
export function islandHref(login: string): string {
  return `/games/skygrid/visit/${encodeURIComponent(login)}/`;
}
