/**
 * What the CHUNITHM tool's pages read: the catalog index the browser searches
 * (/api/chunithm/index.json), and one chart's page. Withdrawn charts are listed but
 * not viewable; songs without charts aren't listed.
 */
import {
  sdvxJacketSources,
  type Difficulty,
  type SongIndex,
} from "@trilleo/chunithm";
import {
  chuniBuilds,
  chuniCharts,
  chuniConstants,
  chuniSongs,
  chuniSyncs,
  chuniVersions,
  type ChuniChart,
  type ChuniSong,
  type Database,
} from "@trilleo/db";
import type { StorageDriver } from "@trilleo/storage/server";
import { createHash } from "node:crypto";
import { and, asc, desc, eq, isNotNull } from "drizzle-orm";
import { aliasesBySong } from "./aliases";
import { publicManifest, type BuildState, type Variant } from "./build";
import { SDVX_ORIGIN } from "./sources";

/** How long a built index is reused before it's read again. */
const INDEX_TTL_MS = 5 * 60 * 1000;
let cached: {
  at: number;
  /** The catalog update it was built after. */
  sync: string;
  /** A hash of its content: the ETag browsers check it by. */
  key: string;
  index: SongIndex;
} | null = null;

/** The catalog for the browser: every song with a chart, and the versions. */
export async function songIndex(
  db: Database,
  storage: StorageDriver | null,
  now = Date.now(),
): Promise<{ index: SongIndex; key: string }> {
  // A new catalog update makes a new index; otherwise it's reused for a while.
  const [last] = await db
    .select({ id: chuniSyncs.id })
    .from(chuniSyncs)
    .where(isNotNull(chuniSyncs.finishedAt))
    .orderBy(desc(chuniSyncs.id))
    .limit(1);
  const sync = String(last?.id ?? 0);
  if (cached?.sync === sync && now - cached.at < INDEX_TTL_MS)
    return { index: cached.index, key: cached.key };

  const versions = await db
    .select({ slug: chuniVersions.slug, name: chuniVersions.name })
    .from(chuniVersions)
    .orderBy(asc(chuniVersions.sortOrder));
  const songs = await db.select().from(chuniSongs).orderBy(asc(chuniSongs.id));
  const charts = await db
    .select({
      songId: chuniCharts.songId,
      difficulty: chuniCharts.difficulty,
      level: chuniCharts.level,
      constant: chuniCharts.constant,
      worldsEndStars: chuniCharts.worldsEndStars,
      sdvxRef: chuniCharts.sdvxRef,
      withdrawnAt: chuniCharts.withdrawnAt,
    })
    .from(chuniCharts)
    .orderBy(asc(chuniCharts.songId), asc(chuniCharts.difficulty));
  const aliases = await aliasesBySong(db);
  const bySong = new Map<number, typeof charts>();
  for (const chart of charts)
    bySong.set(chart.songId, [...(bySong.get(chart.songId) ?? []), chart]);
  const index: SongIndex = {
    versions,
    songs: songs.flatMap((song) => {
      const list = bySong.get(song.id) ?? [];
      if (list.length === 0) return [];
      return [
        {
          id: song.id,
          title: song.title,
          artist: song.artist,
          reading: song.reading,
          genre: song.genre,
          version: song.version,
          inGame: song.inGame,
          removedIn: song.removedIn,
          jacket:
            song.jacketKey && storage
              ? storage.publicUrl(song.jacketKey)
              : null,
          bpm: song.bpm,
          addedOn: song.addedOn,
          aliases: aliases.get(song.id) ?? [],
          charts: list.map((chart) => ({
            difficulty: chart.difficulty,
            level: chart.level,
            constant: chart.constant,
            worldsEndStars: chart.worldsEndStars,
            viewable: chart.sdvxRef !== null && chart.withdrawnAt === null,
          })),
        },
      ];
    }),
  };
  const key = createHash("sha256")
    .update(JSON.stringify(index))
    .digest("base64url")
    .slice(0, 16);
  cached = { at: now, sync, key, index };
  return { index, key };
}

/** Builds the index afresh on its next read (after names, links or withdrawals change). */
export function forgetIndex(): void {
  cached = null;
}

export interface ChartPage {
  song: ChuniSong;
  chart: ChuniChart;
  /** The song's charts, for links between difficulties. */
  charts: Pick<
    ChuniChart,
    "difficulty" | "level" | "worldsEndStars" | "sdvxRef" | "withdrawnAt"
  >[];
  /** The chart's constant in each version it was known in, newest first. */
  constants: { version: string; name: string; constant: number }[];
  versionName: string | null;
  removedInName: string | null;
  jacket: string | null;
  /**
   * The original jacket on sdvx.in (its full size, often bigger than our copy), for
   * the page's "Original" link: visitors fetch it from sdvx.in, not from us.
   */
  jacketOriginal: string | null;
}

export async function chartPage(
  db: Database,
  storage: StorageDriver | null,
  songId: number,
  difficulty: Difficulty,
): Promise<ChartPage | null> {
  const [song] = await db
    .select()
    .from(chuniSongs)
    .where(eq(chuniSongs.id, songId));
  if (!song) return null;
  const charts = await db
    .select()
    .from(chuniCharts)
    .where(eq(chuniCharts.songId, songId))
    .orderBy(asc(chuniCharts.difficulty));
  const chart = charts.find((row) => row.difficulty === difficulty);
  if (!chart) return null;
  const versions = await db.select().from(chuniVersions);
  const nameOf = (slug: string | null) =>
    slug ? (versions.find((v) => v.slug === slug)?.name ?? slug) : null;
  const order = (slug: string) =>
    versions.find((v) => v.slug === slug)?.sortOrder ?? -1;
  const constants = (
    await db
      .select({
        version: chuniConstants.version,
        constant: chuniConstants.constant,
      })
      .from(chuniConstants)
      .where(eq(chuniConstants.chartId, chart.id))
  )
    .map((row) => ({ ...row, name: nameOf(row.version) ?? row.version }))
    .sort((a, b) => order(b.version) - order(a.version));
  const [original] = sdvxJacketSources(
    charts.flatMap((row) => (row.sdvxRef ? [row.sdvxRef] : [])),
  );
  return {
    song,
    chart,
    charts,
    constants,
    versionName: nameOf(song.version),
    removedInName: nameOf(song.removedIn),
    jacket:
      song.jacketKey && storage ? storage.publicUrl(song.jacketKey) : null,
    // The real sdvx.in, whatever CHUNITHM_SDVX_URL fetches through.
    jacketOriginal: original ? new URL(original, SDVX_ORIGIN).href : null,
  };
}

/**
 * A chart's picture as far as it's got, without asking for a build: what a page
 * rendered for a visitor (or a crawler) shows; the page's script asks.
 */
export async function peekBuild(
  db: Database,
  storage: StorageDriver,
  chart: Pick<ChuniChart, "id" | "sdvxRef" | "withdrawnAt">,
  variant: Variant,
): Promise<BuildState | null> {
  if (chart.withdrawnAt) return { status: "unavailable", reason: "withdrawn" };
  if (!chart.sdvxRef) return { status: "unavailable", reason: "no-page" };
  const [row] = await db
    .select()
    .from(chuniBuilds)
    .where(
      and(eq(chuniBuilds.chartId, chart.id), eq(chuniBuilds.variant, variant)),
    );
  if (!row) return null;
  if (row.manifest && row.builtAt)
    return {
      status: "ready",
      manifest: publicManifest(row.manifest, storage),
      builtAt: row.builtAt,
    };
  return null;
}
