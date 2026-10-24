/**
 * The admin's side of the CHUNITHM catalog (/admin/chunithm/): how the updates are
 * going, sdvx.in pages to place by hand, and charts taken down.
 *
 * Placing a page (an override) takes effect at once and is kept for every later pass
 * (@trilleo/chunithm's buildCatalog ranks it above everything else). Withdrawing a
 * chart hides it from the viewer and stops it being built; updates leave it alone.
 */
import {
  DIFFICULTIES,
  isDifficulty,
  isSdvxPath,
  sdvxPathInfo,
  type Difficulty,
} from "@trilleo/chunithm";
import type { StorageDriver } from "@trilleo/storage/server";
import {
  chuniBuilds,
  chuniCharts,
  chuniConstants,
  chuniSdvxEntries,
  chuniSdvxOverrides,
  chuniSongs,
  chuniSyncs,
  chuniVersions,
  type ChuniSync,
  type Database,
} from "@trilleo/db";
import {
  and,
  asc,
  count,
  desc,
  eq,
  inArray,
  isNotNull,
  isNull,
  sql,
} from "drizzle-orm";
import { setBuildsHidden } from "./build";

export const WITHDRAW_REASON_MAX = 300;

export interface CatalogOverview {
  songs: number;
  inGame: number;
  charts: number;
  linked: number;
  withdrawn: number;
  scriptsLeft: number;
  scriptErrors: number;
  versions: {
    slug: string;
    name: string;
    startedOn: string | null;
    constants: number;
    finalConstantsAt: Date | null;
  }[];
  currentVersion: string | null;
  syncs: ChuniSync[];
  /** The latest successful pass, whose unmatched pages the admin places. */
  lastGood: ChuniSync | null;
}

export async function catalogOverview(db: Database): Promise<CatalogOverview> {
  const [songs] = await db
    .select({
      all: count(),
      inGame: sql<number>`count(*) filter (where ${chuniSongs.inGame})::int`,
    })
    .from(chuniSongs);
  const [charts] = await db
    .select({
      all: count(),
      linked: sql<number>`count(${chuniCharts.sdvxPath})::int`,
      withdrawn: sql<number>`count(${chuniCharts.withdrawnAt})::int`,
    })
    .from(chuniCharts);
  const [scripts] = await db
    .select({
      left: sql<number>`count(*) filter (where ${chuniSdvxEntries.readAt} is null)::int`,
      errors: sql<number>`count(${chuniSdvxEntries.readError})::int`,
    })
    .from(chuniSdvxEntries);
  const versions = await db
    .select({
      slug: chuniVersions.slug,
      name: chuniVersions.name,
      startedOn: chuniVersions.startedOn,
      finalConstantsAt: chuniVersions.finalConstantsAt,
      constants: sql<number>`(select count(*)::int from ${chuniConstants} where ${chuniConstants.version} = ${chuniVersions.slug})`,
    })
    .from(chuniVersions)
    .orderBy(desc(chuniVersions.sortOrder));
  const syncs = await db
    .select()
    .from(chuniSyncs)
    .orderBy(desc(chuniSyncs.id))
    .limit(10);
  const [lastGood] = await db
    .select()
    .from(chuniSyncs)
    .where(eq(chuniSyncs.ok, true))
    .orderBy(desc(chuniSyncs.id))
    .limit(1);
  return {
    songs: songs?.all ?? 0,
    inGame: songs?.inGame ?? 0,
    charts: charts?.all ?? 0,
    linked: charts?.linked ?? 0,
    withdrawn: charts?.withdrawn ?? 0,
    scriptsLeft: scripts?.left ?? 0,
    scriptErrors: scripts?.errors ?? 0,
    versions,
    currentVersion: versions[0]?.slug ?? null,
    syncs,
    lastGood: lastGood ?? null,
  };
}

export interface ChartRef {
  id: number;
  songId: number;
  title: string;
  artist: string;
  difficulty: Difficulty;
  level: string;
  sdvxPath: string | null;
  linkedBy: string | null;
  withdrawnAt: Date | null;
  withdrawnReason: string | null;
}

const chartColumns = {
  id: chuniCharts.id,
  songId: chuniCharts.songId,
  title: chuniSongs.title,
  artist: chuniSongs.artist,
  difficulty: chuniCharts.difficulty,
  level: chuniCharts.level,
  sdvxPath: chuniCharts.sdvxPath,
  linkedBy: chuniCharts.linkedBy,
  withdrawnAt: chuniCharts.withdrawnAt,
  withdrawnReason: chuniCharts.withdrawnReason,
};

export async function findChart(
  db: Database,
  songId: number,
  difficulty: Difficulty,
): Promise<ChartRef | null> {
  const [row] = await db
    .select(chartColumns)
    .from(chuniCharts)
    .innerJoin(chuniSongs, eq(chuniSongs.id, chuniCharts.songId))
    .where(
      and(
        eq(chuniCharts.songId, songId),
        eq(chuniCharts.difficulty, difficulty),
      ),
    );
  return row ?? null;
}

/** Songs by ID, for showing the candidates next to an unmatched page. */
export async function songTitles(
  db: Database,
  ids: number[],
): Promise<Map<number, string>> {
  if (ids.length === 0) return new Map();
  const rows = await db
    .select({ id: chuniSongs.id, title: chuniSongs.title })
    .from(chuniSongs)
    .where(sql`${chuniSongs.id} in ${ids}`);
  return new Map(rows.map((row) => [row.id, row.title]));
}

export async function withdrawnCharts(db: Database): Promise<ChartRef[]> {
  return db
    .select(chartColumns)
    .from(chuniCharts)
    .innerJoin(chuniSongs, eq(chuniSongs.id, chuniCharts.songId))
    .where(isNotNull(chuniCharts.withdrawnAt))
    .orderBy(desc(chuniCharts.withdrawnAt));
}

/** In-game charts sdvx.in draws (Expert and up) that have no page yet. */
export async function chartsWithoutPage(db: Database): Promise<ChartRef[]> {
  return db
    .select(chartColumns)
    .from(chuniCharts)
    .innerJoin(chuniSongs, eq(chuniSongs.id, chuniCharts.songId))
    .where(
      and(
        eq(chuniSongs.inGame, true),
        isNull(chuniCharts.sdvxPath),
        isNull(chuniCharts.withdrawnAt),
        inArray(chuniCharts.difficulty, [
          "expert",
          "master",
          "ultima",
          "worldsend",
        ]),
      ),
    )
    .orderBy(desc(chuniSongs.id), asc(chuniCharts.difficulty))
    .limit(200);
}

export interface OverrideRow {
  path: string;
  songId: number | null;
  difficulty: Difficulty | null;
  title: string | null;
  createdAt: Date;
}

export async function listOverrides(db: Database): Promise<OverrideRow[]> {
  return db
    .select({
      path: chuniSdvxOverrides.path,
      songId: chuniSdvxOverrides.songId,
      difficulty: chuniSdvxOverrides.difficulty,
      title: chuniSongs.title,
      createdAt: chuniSdvxOverrides.createdAt,
    })
    .from(chuniSdvxOverrides)
    .leftJoin(chuniSongs, eq(chuniSongs.id, chuniSdvxOverrides.songId))
    .orderBy(asc(chuniSdvxOverrides.path));
}

export type AdminResult = { ok: true } | { ok: false; error: string };

/**
 * The admin says an sdvx.in page is this chart (or, with `target` null, nothing of
 * ours). Applied now; kept for later passes.
 */
export async function placePage(
  db: Database,
  path: string,
  target: { songId: number; difficulty: Difficulty } | null,
): Promise<AdminResult> {
  if (!isSdvxPath(path))
    return { ok: false, error: "That isn't an sdvx.in chart page." };
  let chartId: number | null = null;
  if (target) {
    if (sdvxPathInfo(path)?.difficulty !== target.difficulty)
      return {
        ok: false,
        error: "That page is for another difficulty.",
      };
    const chart = await findChart(db, target.songId, target.difficulty);
    if (!chart)
      return { ok: false, error: "There's no such chart in the catalog." };
    chartId = chart.id;
  }
  await db.transaction(async (tx) => {
    await tx
      .update(chuniCharts)
      .set({ sdvxPath: null, linkedBy: null })
      .where(eq(chuniCharts.sdvxPath, path));
    if (chartId !== null)
      await tx
        .update(chuniCharts)
        .set({ sdvxPath: path, linkedBy: "admin", updatedAt: new Date() })
        .where(eq(chuniCharts.id, chartId));
    await tx
      .insert(chuniSdvxOverrides)
      .values({
        path,
        songId: target?.songId ?? null,
        difficulty: target?.difficulty ?? null,
      })
      .onConflictDoUpdate({
        target: chuniSdvxOverrides.path,
        set: {
          songId: target?.songId ?? null,
          difficulty: target?.difficulty ?? null,
          createdAt: new Date(),
        },
      });
  });
  return { ok: true };
}

/** Forgets the admin's word on a page; the next pass links it the usual way. */
export async function forgetPage(db: Database, path: string): Promise<void> {
  await db.transaction(async (tx) => {
    await tx
      .delete(chuniSdvxOverrides)
      .where(eq(chuniSdvxOverrides.path, path));
    await tx
      .update(chuniCharts)
      .set({ sdvxPath: null, linkedBy: null })
      .where(
        and(eq(chuniCharts.sdvxPath, path), eq(chuniCharts.linkedBy, "admin")),
      );
  });
}

export async function withdrawChart(
  db: Database,
  storage: StorageDriver | null,
  songId: number,
  difficulty: Difficulty,
  reason: string,
): Promise<AdminResult> {
  const text = reason.trim();
  if (!text) return { ok: false, error: "Say why it's withdrawn." };
  if (text.length > WITHDRAW_REASON_MAX)
    return {
      ok: false,
      error: `Keep the reason under ${String(WITHDRAW_REASON_MAX)} characters.`,
    };
  const chart = await findChart(db, songId, difficulty);
  if (!chart)
    return { ok: false, error: "There's no such chart in the catalog." };
  await db
    .update(chuniCharts)
    .set({ withdrawnAt: new Date(), withdrawnReason: text })
    .where(and(eq(chuniCharts.id, chart.id), isNull(chuniCharts.withdrawnAt)));
  // Its tiles stop being served (browsers may keep a copy for a day: PUBLIC_CACHE).
  await setBuildsHidden(db, storage, chart.id, true);
  return { ok: true };
}

export async function restoreChart(
  db: Database,
  storage: StorageDriver | null,
  chartId: number,
): Promise<void> {
  await db
    .update(chuniCharts)
    .set({ withdrawnAt: null, withdrawnReason: null })
    .where(eq(chuniCharts.id, chartId));
  await setBuildsHidden(db, storage, chartId, false);
}

/** Builds that failed (or whose last rebuild failed), newest first. */
export async function failedBuilds(db: Database): Promise<
  (ChartRef & {
    variant: string;
    error: string;
    attempts: number;
    nextAttemptAt: Date | null;
  })[]
> {
  return db
    .select({
      ...chartColumns,
      variant: chuniBuilds.variant,
      error: sql<string>`${chuniBuilds.error}`,
      attempts: chuniBuilds.attempts,
      nextAttemptAt: chuniBuilds.nextAttemptAt,
    })
    .from(chuniBuilds)
    .innerJoin(chuniCharts, eq(chuniCharts.id, chuniBuilds.chartId))
    .innerJoin(chuniSongs, eq(chuniSongs.id, chuniCharts.songId))
    .where(isNotNull(chuniBuilds.error))
    .orderBy(desc(chuniBuilds.nextAttemptAt))
    .limit(100);
}

/** "master" → "master"; anything else null. */
export function difficultyFrom(value: string): Difficulty | null {
  return isDifficulty(value) ? value : null;
}

export { DIFFICULTIES };
