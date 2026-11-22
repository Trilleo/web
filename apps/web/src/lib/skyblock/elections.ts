/**
 * SkyBlock's mayor elections as the site has recorded them (lib/skyblock/feeds.ts
 * writes sb_elections and sb_election_votes from Hypixel's election feed): each
 * election by the year its booth opened, final once closed, with the running one's
 * votes by the hour. History starts with the site's first fetch; Hypixel only ever
 * shows the current election and the last one.
 */
import { sbElectionVotes, sbElections, type Database } from "@trilleo/db";
import type { Candidate } from "@trilleo/skyblock/events";
import { asc, desc, eq } from "drizzle-orm";

export const ELECTIONS_PATH = "/tools/skyblock/events/elections/";

export function electionPath(year: number): string {
  return `${ELECTIONS_PATH}${String(year)}/`;
}

export interface ElectionRecord {
  year: number;
  closed: boolean;
  /** Most votes first. */
  candidates: Candidate[];
  mayor: Candidate | null;
  minister: Candidate | null;
  totalVotes: number;
  updatedAt: Date;
}

function record(row: typeof sbElections.$inferSelect): ElectionRecord {
  // Written by recordElection from the election reader's checked output.
  const candidates = [...(row.candidates as Candidate[])].sort(
    (a, b) => b.votes - a.votes,
  );
  return {
    year: row.year,
    closed: row.closed,
    candidates,
    mayor: candidates.find((c) => c.key === row.mayorKey) ?? null,
    minister: candidates.find((c) => c.key === row.ministerKey) ?? null,
    totalVotes: candidates.reduce((sum, c) => sum + c.votes, 0),
    updatedAt: row.updatedAt,
  };
}

/** Every recorded election, newest first. */
export async function listElections(db: Database): Promise<ElectionRecord[]> {
  const rows = await db
    .select()
    .from(sbElections)
    .orderBy(desc(sbElections.year));
  return rows.map(record);
}

export async function electionByYear(
  db: Database,
  year: number,
): Promise<ElectionRecord | null> {
  const [row] = await db
    .select()
    .from(sbElections)
    .where(eq(sbElections.year, year));
  return row ? record(row) : null;
}

export interface VotePoint {
  hour: Date;
  /** Candidate key → votes. */
  votes: Record<string, number>;
}

/** An election's votes through the hours the site saw it running, oldest first. */
export async function electionVotes(
  db: Database,
  year: number,
): Promise<VotePoint[]> {
  return db
    .select({ hour: sbElectionVotes.hour, votes: sbElectionVotes.votes })
    .from(sbElectionVotes)
    .where(eq(sbElectionVotes.year, year))
    .orderBy(asc(sbElectionVotes.hour));
}

/** Each candidate's share at each point, 0–1, for the charts. */
export function shareSeries(
  points: readonly VotePoint[],
  keys: readonly string[],
): Map<string, number[]> {
  const series = new Map<string, number[]>(keys.map((key) => [key, []]));
  for (const point of points) {
    const total = keys.reduce((sum, key) => sum + (point.votes[key] ?? 0), 0);
    for (const key of keys)
      series.get(key)?.push(total > 0 ? (point.votes[key] ?? 0) / total : 0);
  }
  return series;
}

/** An SVG polyline's points for values 0–1 across a width and height. */
export function sparkline(
  values: readonly number[],
  width: number,
  height: number,
  max = 1,
): string {
  if (values.length === 0) return "";
  const step = values.length > 1 ? width / (values.length - 1) : 0;
  return values
    .map((value, i) => {
      const x = values.length > 1 ? i * step : width / 2;
      const y = height - (Math.min(value, max) / max) * height;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}
