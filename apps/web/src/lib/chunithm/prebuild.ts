/**
 * Building charts ahead of visitors: while nobody is opening charts, a timer builds
 * the Master and Ultima charts of songs in the game that have no picture yet, newest
 * songs first, one every PREBUILD.everyMs, so most charts people open are ready.
 *
 * Visitors come first. A tick does nothing while one of their builds is queued or
 * running, or within PREBUILD.quietMs of the last time anyone asked for a chart's
 * picture (`chartsLastAsked`); its builds never enter their queue, and take turns
 * with theirs (`buildInTurn`), so the server still builds one chart at a time. They
 * count toward BUILD_LIMITS.perHour like any other. A chart that fails keeps its
 * failed row and isn't picked again: a visitor opening it, or "Rebuild", retries it.
 *
 * The admin can pause it (`pausePrebuild`, kept in chuni_prebuild so restarts keep
 * it: for a while, or until `resumePrebuild`), build the next chart at once
 * (`prebuildNow`, which skips the wait, the quiet rule and the pause, not the hourly
 * limit or visitors' waiting builds), and clear its failed charts so they're picked
 * again (`retryFailedPrebuilds`).
 *
 * Started like the catalog's timer (`startChunithmPrebuild`, from the middleware's
 * first server-rendered request). Never with CHUNITHM_SYNC=off (nothing is fetched)
 * or CHUNITHM_PREBUILD=off (e2e, which starts its builds itself).
 */
import {
  chuniBuilds,
  chuniCharts,
  chuniPrebuild,
  chuniSongs,
  type Database,
} from "@trilleo/db";
import {
  and,
  count,
  desc,
  eq,
  inArray,
  isNotNull,
  isNull,
  sql,
} from "drizzle-orm";
import {
  BUILD_LIMITS,
  buildInTurn,
  buildsThisHour,
  chartsLastAsked,
  siteBuildDeps,
  type BuildDeps,
} from "./build";
import { chunithmSources } from "./sources";

const MINUTE_MS = 60 * 1000;

export const PREBUILD = {
  /** One chart per tick at most. */
  everyMs: 2 * MINUTE_MS,
  /** Quiet this long after anyone asked for a chart's picture before building ahead. */
  quietMs: 5 * MINUTE_MS,
  difficulties: ["master", "ultima"] as const,
  /** How long the admin can pause it for, in hours (null: until resumed). */
  pauseHours: [1, 6, 24, null] as const,
};

/** The admin's pause: when it began and until when (null: until resumed). */
export interface PrebuildPause {
  pausedAt: Date;
  until: Date | null;
}

/** The pause in force at `now`, or null while it runs (a timed one runs out). */
export async function prebuildPause(
  db: Database,
  now: Date,
): Promise<PrebuildPause | null> {
  const [row] = await db
    .select()
    .from(chuniPrebuild)
    .where(eq(chuniPrebuild.id, 1));
  if (!row) return null;
  if (row.pausedUntil && row.pausedUntil <= now) return null;
  return { pausedAt: row.pausedAt, until: row.pausedUntil };
}

/** Pauses it for `hours` (null: until resumed), replacing any pause. */
export async function pausePrebuild(
  db: Database,
  now: Date,
  hours: number | null,
): Promise<void> {
  const until =
    hours === null ? null : new Date(now.getTime() + hours * 60 * MINUTE_MS);
  await db
    .insert(chuniPrebuild)
    .values({ id: 1, pausedAt: now, pausedUntil: until })
    .onConflictDoUpdate({
      target: chuniPrebuild.id,
      set: { pausedAt: now, pausedUntil: until },
    });
}

export async function resumePrebuild(db: Database): Promise<void> {
  await db.delete(chuniPrebuild).where(eq(chuniPrebuild.id, 1));
}

/** Its charts whose build failed with no picture to show (what "Retry failed" clears). */
function failedWithoutTiles() {
  return and(
    eq(chuniBuilds.variant, "normal"),
    eq(chuniBuilds.status, "failed"),
    isNull(chuniBuilds.manifest),
  );
}

/** How many of its charts failed with no picture yet. */
export async function failedPrebuilds(db: Database): Promise<number> {
  const [row] = await db
    .select({ n: count() })
    .from(chuniBuilds)
    .innerJoin(chuniCharts, eq(chuniCharts.id, chuniBuilds.chartId))
    .innerJoin(chuniSongs, eq(chuniSongs.id, chuniCharts.songId))
    .where(and(wanted(), failedWithoutTiles()));
  return row?.n ?? 0;
}

/**
 * Deletes those failed rows, so it picks the charts again in its usual order; says
 * how many. A failed rebuild keeps its row: it still has tiles to show.
 */
export async function retryFailedPrebuilds(db: Database): Promise<number> {
  const charts = db
    .select({ id: chuniCharts.id })
    .from(chuniCharts)
    .innerJoin(chuniSongs, eq(chuniSongs.id, chuniCharts.songId))
    .where(wanted());
  const gone = await db
    .delete(chuniBuilds)
    .where(and(failedWithoutTiles(), inArray(chuniBuilds.chartId, charts)))
    .returning({ id: chuniBuilds.id });
  return gone.length;
}

/** The charts it builds: Master and Ultima, in the game, with a page, not withdrawn. */
function wanted() {
  return and(
    inArray(chuniCharts.difficulty, [...PREBUILD.difficulties]),
    isNotNull(chuniCharts.sdvxRef),
    isNull(chuniCharts.withdrawnAt),
    eq(chuniSongs.inGame, true),
  );
}

/** The next chart to build ahead: one without a normal build yet, newest songs first. */
export async function nextPrebuild(db: Database): Promise<number | null> {
  const [next] = await db
    .select({ id: chuniCharts.id })
    .from(chuniCharts)
    .innerJoin(chuniSongs, eq(chuniSongs.id, chuniCharts.songId))
    .leftJoin(
      chuniBuilds,
      and(
        eq(chuniBuilds.chartId, chuniCharts.id),
        eq(chuniBuilds.variant, "normal"),
      ),
    )
    .where(and(wanted(), isNull(chuniBuilds.id)))
    .orderBy(
      sql`${chuniSongs.addedOn} desc nulls last`,
      desc(chuniSongs.id),
      // Ultima after the same song's Master.
      chuniCharts.difficulty,
    )
    .limit(1);
  return next?.id ?? null;
}

export type PrebuildResult =
  "built" | "failed" | "visitors" | "hour-full" | "done" | "paused";

/**
 * One tick: builds the next chart if no one is opening charts, and says what it did
 * ("visitors": someone's builds or views came first; "done": nothing left; "paused":
 * the admin paused it). `force` (the admin's "Build next now") skips the pause and
 * the quiet rule.
 */
export async function prebuildOnce(
  deps: BuildDeps,
  now: Date,
  { force = false }: { force?: boolean } = {},
): Promise<PrebuildResult> {
  const { db } = deps;
  if (!force) {
    if (await prebuildPause(db, now)) return "paused";
    if (now.getTime() - chartsLastAsked() < PREBUILD.quietMs) return "visitors";
  }
  const [waiting] = await db
    .select({ n: count() })
    .from(chuniBuilds)
    .where(inArray(chuniBuilds.status, ["queued", "building"]));
  if ((waiting?.n ?? 0) > 0) return "visitors";
  if ((await buildsThisHour(db, now)) >= BUILD_LIMITS.perHour)
    return "hour-full";
  const chartId = await nextPrebuild(db);
  if (chartId === null) return "done";
  const [row] = await db
    .insert(chuniBuilds)
    .values({
      chartId,
      variant: "normal",
      status: "building",
      requestedAt: now,
      startedAt: now,
    })
    .onConflictDoNothing()
    .returning();
  // A visitor asked for it a moment ago: theirs goes ahead.
  if (!row) return "visitors";
  return (await buildInTurn(deps, row)) ? "built" : "failed";
}

/** How far it has got: charts it builds, and how many of them are ready. */
export async function prebuildProgress(
  db: Database,
): Promise<{ ready: number; total: number }> {
  const [row] = await db
    .select({
      total: count(),
      ready: sql<number>`count(${chuniBuilds.manifest})::int`,
    })
    .from(chuniCharts)
    .innerJoin(chuniSongs, eq(chuniSongs.id, chuniCharts.songId))
    .leftJoin(
      chuniBuilds,
      and(
        eq(chuniBuilds.chartId, chuniCharts.id),
        eq(chuniBuilds.variant, "normal"),
      ),
    )
    .where(wanted());
  return { ready: row?.ready ?? 0, total: row?.total ?? 0 };
}

let ticking = false;
let busy = false;
let last: { result: PrebuildResult; at: Date } | null = null;

/** What the last tick did, for the admin page; null before the first. */
export function lastPrebuild(): { result: PrebuildResult; at: Date } | null {
  return last;
}

/** Whether it runs in this server (CHUNITHM_SYNC and CHUNITHM_PREBUILD not "off"). */
export function prebuildEnabled(
  env: Record<string, string | undefined> = process.env,
): boolean {
  return env.CHUNITHM_PREBUILD !== "off" && chunithmSources(env) !== null;
}

/** Runs one tick in the background unless one is running; says whether it started. */
function tick(force: boolean): boolean {
  if (busy) return false;
  busy = true;
  void siteBuildDeps()
    .then(async (deps) => {
      if (!deps) return;
      const result = await prebuildOnce(deps, new Date(), { force });
      last = { result, at: new Date() };
    })
    .catch((error: unknown) => {
      console.warn("CHUNITHM building ahead failed:", error);
    })
    .finally(() => {
      busy = false;
    });
  return true;
}

/**
 * The admin's "Build next now": one forced tick in the background. False when a
 * tick is already running (or it's switched off here).
 */
export function prebuildNow(): boolean {
  return prebuildEnabled() && tick(true);
}

/** Starts the timer once per server; it doesn't keep the process alive. */
export function startChunithmPrebuild(): void {
  if (ticking || !prebuildEnabled()) return;
  ticking = true;
  setInterval(() => tick(false), PREBUILD.everyMs).unref();
}
