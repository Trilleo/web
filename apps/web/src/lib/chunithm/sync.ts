/**
 * Keeping the CHUNITHM catalog up to date. One pass:
 *
 * 1. Fetch SEGA's song list and otoge-db's current and removed songs. If any of them
 *    fails or looks broken, the pass stops there: nothing is half-applied.
 * 2. Fetch sdvx.in's JSON lists (each folder's songs, removed songs, World's End) and
 *    record their songs and charts; a list that fails keeps what we had from it.
 * 3. Merge everything (@trilleo/chunithm's buildCatalog) and write it in one
 *    transaction: versions, songs, charts and the current version's constants. The
 *    first pass after sdvx.in's new viewer also moves what was kept from its older
 *    site (move.ts).
 * 4. Look for otoge-db's frozen constants of versions that have ended.
 * 5. Copy a batch of songs' jackets into storage (jackets.ts).
 *
 * A pass runs every SYNC_EVERY_MS, started by a timer (`startChunithmSync`) or any
 * request; while jackets are still waiting, the next starts BACKLOG_GAP_MS after the
 * last one ended. The admin can start one with /admin/chunithm/'s "Check now". A pass
 * stops copying jackets after PASS_TIME_LIMIT_MS, and stops reading sdvx.in once it
 * fails to answer SDVX_PASS.failuresToStop times in a row; the rest waits for the
 * next. New songs, new versions, sdvx.in charts it couldn't place and repeated
 * failures alert the admin.
 */
import {
  SDVX_JSON_DIR,
  SDVX_LIST_FILES,
  SDVX_MAX_FOLDERS,
  buildCatalog,
  constantRows,
  otogeFinalFile,
  parseOtogeMusic,
  parseSdvxSongs,
  parseSegaMusic,
  sdvxFolderList,
  sdvxSongKey,
  type Catalog,
  type CatalogInput,
  type Difficulty,
  type SdvxList,
  type SdvxSong,
} from "@trilleo/chunithm";
import {
  chuniCharts,
  chuniConstants,
  chuniSdvxPlacements,
  chuniSdvxSongs,
  chuniSongs,
  chuniSyncs,
  chuniVersions,
  type ChuniSyncSummary,
  type Database,
} from "@trilleo/db";
import {
  and,
  desc,
  eq,
  inArray,
  isNotNull,
  lt,
  sql,
  type Column,
} from "drizzle-orm";
import type { StorageDriver } from "@trilleo/storage/server";
import { alertAdmin } from "../mail/alerts";
import { getStorage } from "../storage/config";
import { copyJackets, jacketsDue } from "./jackets";
import { moveBuilds, moveLegacyBuilds, movePlacements, moved } from "./move";
import { forgetIndex } from "./viewer";
import {
  FetchError,
  chunithmSources,
  fetchJson,
  fetchSdvxList,
  type ChunithmSources,
} from "./sources";

const MINUTE_MS = 60 * 1000;
const DAY_MS = 24 * 60 * MINUTE_MS;

/** How often a pass runs (from any request). */
export const SYNC_EVERY_MS = 6 * 60 * MINUTE_MS;
/** While jackets are waiting, the next pass starts this long after one ends. */
export const BACKLOG_GAP_MS = 90 * 1000;
/** How often the timer checks whether a pass is due. */
export const TICK_MS = 30 * 1000;

export const SDVX_PASS = {
  /** The wait between two requests to sdvx.in. */
  delayMs: 1000,
  /** Requests in a row that get no answer (timeouts, 5xx) before a pass stops asking. */
  failuresToStop: 3,
};

/** A pass stops copying jackets after this long (the rest waits). */
export const PASS_TIME_LIMIT_MS = 10 * MINUTE_MS;

/** SEGA's list shrinking below this share of the songs we have in the game is refused. */
export const MIN_SHARE_KEPT = 0.9;
/** Syncs kept in chuni_syncs. */
const SYNCS_KEPT = 50;
/**
 * Looks for the version that just ended's frozen constants daily (otoge-db adds the
 * file some time after); older versions without one, monthly.
 */
const FINAL_RETRY_MS = DAY_MS;
const OLD_FINAL_RETRY_MS = 30 * DAY_MS;
/** Failures in a row before the admin hears of them. */
const FAILURES_TO_ALERT = 4;
/** Rows per insert statement. */
const CHUNK = 400;

export interface SyncDeps {
  fetch?: typeof fetch;
  /** Where to fetch from; null: fetching is off. Read from the environment if left out. */
  sources?: ChunithmSources | null;
  now?: () => Date;
  /** Where jackets are copied to; null: none. Read from the environment if left out. */
  storage?: StorageDriver | null;
  /** The pass's time limit (PASS_TIME_LIMIT_MS; tests shorten it). */
  timeLimitMs?: number;
  /** Waits between sdvx.in requests (tests pass a no-op). */
  sleep?: (ms: number) => Promise<void>;
}

const wait = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

const errorText = (error: unknown) =>
  error instanceof Error ? error.message : String(error);

/** `excluded.<column>` in an upsert's SET. */
const excluded = (column: Column) => sql.raw(`excluded."${column.name}"`);

function chunks<T>(rows: T[]): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < rows.length; i += CHUNK)
    out.push(rows.slice(i, i + CHUNK));
  return out;
}

const emptySummary = (): ChuniSyncSummary => ({
  songs: 0,
  charts: 0,
  linked: 0,
  newSongs: [],
  newCharts: 0,
  removedSongs: [],
  newVersions: [],
  constants: 0,
  sdvxLists: 0,
  unmatched: [],
  errors: [],
});

/** One pass. Returns its summary (also kept in chuni_syncs). */
export async function syncCatalog(
  db: Database,
  deps: SyncDeps = {},
): Promise<ChuniSyncSummary & { ok: boolean }> {
  const fetcher = deps.fetch ?? fetch;
  const now = deps.now ?? (() => new Date());
  const sleep = deps.sleep ?? wait;
  const sources = deps.sources === undefined ? chunithmSources() : deps.sources;
  const summary = emptySummary();
  const [run] = await db
    .insert(chuniSyncs)
    .values({ startedAt: now() })
    .returning({ id: chuniSyncs.id });
  if (!run) throw new Error("couldn't record the sync");
  const finish = async (ok: boolean) => {
    await db
      .update(chuniSyncs)
      .set({ finishedAt: now(), ok, summary })
      .where(eq(chuniSyncs.id, run.id));
    await pruneSyncs(db);
    await alertIfNeeded(db, run.id, ok, summary, now());
    return { ...summary, ok };
  };
  if (!sources) {
    summary.errors.push("Fetching is switched off (CHUNITHM_SYNC=off).");
    return finish(false);
  }

  // 1. The song lists: all or nothing.
  let sega: CatalogInput["sega"];
  let otoge: CatalogInput["otoge"];
  let otogeDeleted: CatalogInput["otogeDeleted"];
  try {
    sega = parseSegaMusic(await fetchJson(fetcher, sources.segaUrl));
    otoge = parseOtogeMusic(
      await fetchJson(fetcher, new URL("music-ex.json", sources.otogeUrl).href),
    );
    otogeDeleted = parseOtogeMusic(
      await fetchJson(
        fetcher,
        new URL("music-ex-deleted.json", sources.otogeUrl).href,
      ),
      { minSongs: 0 },
    );
  } catch (error) {
    summary.errors.push(errorText(error));
    return finish(false);
  }
  const [inGame] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(chuniSongs)
    .where(eq(chuniSongs.inGame, true));
  const had = inGame?.count ?? 0;
  if (had > 0 && sega.length < had * MIN_SHARE_KEPT) {
    summary.errors.push(
      `SEGA's list has ${String(sega.length)} songs, we have ${String(had)} in the game: not applied.`,
    );
    return finish(false);
  }

  // 2. sdvx.in's lists.
  const started = Date.now();
  const listed = await readSdvxLists(
    fetcher,
    sources,
    (ms) => sleep(sources.delayMs ?? ms),
    summary,
  );
  await recordSdvxSongs(db, listed, now());
  const sdvx = await storedSdvxSongs(db);

  // 3. Merge and write (moving the older site's data first, once).
  const placementMove = (await moved(db))
    ? null
    : await movePlacements(db, sdvx, now());
  const catalog = buildCatalog({
    sega,
    otoge,
    otogeDeleted,
    sdvx,
    placements: (await db.select().from(chuniSdvxPlacements)).map((row) => ({
      ref: row.ref,
      songId: row.songId,
      difficulty: row.difficulty,
    })),
  });
  await writeCatalog(db, catalog, summary, now());
  const storage = deps.storage === undefined ? getStorage() : deps.storage;
  try {
    if (placementMove) await moveBuilds(db, storage, now(), placementMove);
    else await moveLegacyBuilds(db, now());
  } catch (error) {
    summary.errors.push(`Moving to sdvx.in's new viewer: ${errorText(error)}`);
  }
  // The index is cached by finished passes; this one isn't finished yet, but the
  // catalog has changed: build the index afresh on its next read.
  forgetIndex();

  // 4. Ended versions' constants.
  try {
    await readFinalConstants(db, fetcher, sources, catalog, summary, now());
  } catch (error) {
    summary.errors.push(errorText(error));
  }

  // 5. A batch of jackets.
  const timeLimit = deps.timeLimitMs ?? PASS_TIME_LIMIT_MS;
  if (storage)
    try {
      summary.jackets = await copyJackets(db, storage, {
        fetch: fetcher,
        sdvxOrigin: sources.sdvxOrigin,
        now: now(),
        deadline: started + timeLimit,
        sleep: (ms) => sleep(sources.delayMs ?? ms),
      });
      summary.jacketsLeft = await jacketsDue(db, now());
    } catch (error) {
      summary.errors.push(errorText(error));
    }
  return finish(true);
}

/**
 * Reads sdvx.in's lists, one request at a time: folders from 01 until one isn't there
 * yet, then the removed and World's End lists. A list that fails is reported and
 * skipped (what we had from it stays); after SDVX_PASS.failuresToStop in a row
 * without an answer, the rest wait for the next pass.
 */
async function readSdvxLists(
  fetcher: typeof fetch,
  sources: ChunithmSources,
  sleep: (ms: number) => Promise<void>,
  summary: ChuniSyncSummary,
): Promise<SdvxSong[]> {
  const songs = new Map<string, SdvxSong>();
  let failures = 0;
  const read = async (file: string, list: SdvxList): Promise<boolean> => {
    const url = new URL(SDVX_JSON_DIR + file, sources.sdvxOrigin).href;
    try {
      const json = await fetchSdvxList(fetcher, url);
      failures = 0;
      if (json === null) return false;
      // A song on two lists (in a folder and removed): the first wins.
      for (const song of parseSdvxSongs(json, list))
        if (!songs.has(song.key)) songs.set(song.key, song);
      summary.sdvxLists = (summary.sdvxLists ?? 0) + 1;
    } catch (error) {
      if (error instanceof FetchError) failures++;
      summary.errors.push(errorText(error));
    } finally {
      await sleep(SDVX_PASS.delayMs);
    }
    return true;
  };
  const stopped = () => failures >= SDVX_PASS.failuresToStop;
  for (let folder = 1; folder <= SDVX_MAX_FOLDERS && !stopped(); folder++)
    if (!(await read(sdvxFolderList(folder), "songs"))) break;
  for (const { file, list } of SDVX_LIST_FILES) {
    if (stopped()) break;
    await read(file, list);
  }
  if (stopped())
    summary.errors.push(
      `sdvx.in didn't answer ${String(failures)} times in a row: stopped reading its lists for this pass.`,
    );
  return [...songs.values()];
}

async function recordSdvxSongs(
  db: Database,
  songs: SdvxSong[],
  now: Date,
): Promise<void> {
  for (const rows of chunks(songs))
    await db
      .insert(chuniSdvxSongs)
      .values(
        rows.map((song) => ({
          key: song.key,
          list: song.list,
          title: song.title,
          artist: song.artist,
          genre: song.genre,
          bpm: song.bpm,
          charts: song.charts,
          removed: song.removed !== null,
          removedOn: song.removed?.on ?? null,
          removedIn: song.removed?.version ?? null,
          firstSeenAt: now,
          listedAt: now,
        })),
      )
      .onConflictDoUpdate({
        target: chuniSdvxSongs.key,
        set: {
          list: excluded(chuniSdvxSongs.list),
          title: excluded(chuniSdvxSongs.title),
          artist: excluded(chuniSdvxSongs.artist),
          genre: excluded(chuniSdvxSongs.genre),
          bpm: excluded(chuniSdvxSongs.bpm),
          charts: excluded(chuniSdvxSongs.charts),
          removed: excluded(chuniSdvxSongs.removed),
          removedOn: excluded(chuniSdvxSongs.removedOn),
          removedIn: excluded(chuniSdvxSongs.removedIn),
          listedAt: excluded(chuniSdvxSongs.listedAt),
        },
      });
}

/** Every song sdvx.in has listed, as @trilleo/chunithm reads them. */
export async function storedSdvxSongs(db: Database): Promise<SdvxSong[]> {
  const rows = await db.select().from(chuniSdvxSongs);
  return rows.map((row) => ({
    key: row.key,
    id: row.key.replace(/^we\//, ""),
    list: row.list as SdvxList,
    title: row.title,
    artist: row.artist,
    genre: row.genre,
    bpm: row.bpm,
    charts: row.charts.map((chart) => ({
      ...chart,
      difficulty: chart.difficulty as Difficulty,
    })),
    removed: row.removed ? { version: row.removedIn, on: row.removedOn } : null,
  }));
}

async function writeCatalog(
  db: Database,
  catalog: Catalog,
  summary: ChuniSyncSummary,
  now: Date,
): Promise<void> {
  await db.transaction(async (tx) => {
    const known = new Map(
      (
        await tx
          .select({ id: chuniSongs.id, inGame: chuniSongs.inGame })
          .from(chuniSongs)
      ).map((row) => [row.id, row.inGame]),
    );
    const knownVersions = new Set(
      (await tx.select({ slug: chuniVersions.slug }).from(chuniVersions)).map(
        (row) => row.slug,
      ),
    );
    const firstPass = known.size === 0;

    for (const version of catalog.versions) {
      if (!knownVersions.has(version.slug) && knownVersions.size > 0)
        summary.newVersions.push(version.slug);
    }
    for (const rows of chunks(catalog.versions))
      await tx
        .insert(chuniVersions)
        .values(
          rows.map((version) => ({
            slug: version.slug,
            name: version.name,
            sortOrder: version.order,
            startedOn: version.startedOn,
          })),
        )
        .onConflictDoUpdate({
          target: chuniVersions.slug,
          set: {
            name: excluded(chuniVersions.name),
            sortOrder: excluded(chuniVersions.sortOrder),
            startedOn: excluded(chuniVersions.startedOn),
          },
        });

    for (const song of catalog.songs) {
      const before = known.get(song.id);
      if (before === undefined && !firstPass && song.inGame)
        summary.newSongs.push(song.id);
      if (before === true && !song.inGame) summary.removedSongs.push(song.id);
    }
    for (const rows of chunks(catalog.songs))
      await tx
        .insert(chuniSongs)
        .values(
          rows.map((song) => ({
            ...song,
            firstSeenAt: now,
            updatedAt: now,
            // A song that just left SEGA's list without a known day left today.
            removedOn:
              song.removedOn ??
              (known.get(song.id) === true && !song.inGame
                ? now.toISOString().slice(0, 10)
                : null),
          })),
        )
        .onConflictDoUpdate({
          target: chuniSongs.id,
          set: {
            title: excluded(chuniSongs.title),
            reading: excluded(chuniSongs.reading),
            artist: excluded(chuniSongs.artist),
            genre: excluded(chuniSongs.genre),
            image: excluded(chuniSongs.image),
            bpm: excluded(chuniSongs.bpm),
            version: excluded(chuniSongs.version),
            addedOn: excluded(chuniSongs.addedOn),
            inGame: excluded(chuniSongs.inGame),
            removedOn: sql`coalesce(${excluded(chuniSongs.removedOn)}, ${chuniSongs.removedOn})`,
            removedIn: sql`coalesce(${excluded(chuniSongs.removedIn)}, ${chuniSongs.removedIn})`,
            updatedAt: excluded(chuniSongs.updatedAt),
          },
        });
    // A song back in the game isn't removed any more.
    await tx
      .update(chuniSongs)
      .set({ removedOn: null, removedIn: null })
      .where(and(eq(chuniSongs.inGame, true), isNotNull(chuniSongs.removedOn)));

    // Charts. Refs that move are let go first, so the unique ref index holds.
    const existing = await tx
      .select({
        id: chuniCharts.id,
        songId: chuniCharts.songId,
        difficulty: chuniCharts.difficulty,
        sdvxRef: chuniCharts.sdvxRef,
      })
      .from(chuniCharts);
    const pathOf = new Map(
      existing.map((row) => [`${String(row.songId)}:${row.difficulty}`, row]),
    );
    const target = new Map(
      catalog.charts.map((chart) => [
        `${String(chart.songId)}:${chart.difficulty}`,
        chart.sdvxRef,
      ]),
    );
    const claimed = new Set(target.values());
    const release = existing.flatMap((row) => {
      if (!row.sdvxRef) return [];
      const wanted = target.get(`${String(row.songId)}:${row.difficulty}`);
      // A chart the catalog lacks keeps its ref unless another chart takes it.
      if (wanted === undefined) return claimed.has(row.sdvxRef) ? [row.id] : [];
      return wanted === row.sdvxRef ? [] : [row.id];
    });
    for (const ids of chunks(release))
      await tx
        .update(chuniCharts)
        .set({ sdvxRef: null, linkedBy: null })
        .where(inArray(chuniCharts.id, ids));
    summary.newCharts = firstPass
      ? 0
      : catalog.charts.filter(
          (chart) => !pathOf.has(`${String(chart.songId)}:${chart.difficulty}`),
        ).length;
    for (const rows of chunks(catalog.charts))
      await tx
        .insert(chuniCharts)
        .values(
          rows.map((chart) => ({
            ...chart,
            firstSeenAt: now,
            updatedAt: now,
          })),
        )
        .onConflictDoUpdate({
          target: [chuniCharts.songId, chuniCharts.difficulty],
          set: {
            level: excluded(chuniCharts.level),
            worldsEndStars: excluded(chuniCharts.worldsEndStars),
            constant: excluded(chuniCharts.constant),
            notes: excluded(chuniCharts.notes),
            designer: excluded(chuniCharts.designer),
            noteTypes: excluded(chuniCharts.noteTypes),
            sdvxRef: excluded(chuniCharts.sdvxRef),
            linkedBy: excluded(chuniCharts.linkedBy),
            updatedAt: excluded(chuniCharts.updatedAt),
          },
        });

    // The current version's constants: only songs in the game (a removed song's
    // last constant belongs to the version it left in, from otoge-db's final file).
    if (catalog.currentVersion) {
      const ids = await chartIds(tx);
      const inGame = new Set(
        catalog.songs.filter((song) => song.inGame).map((song) => song.id),
      );
      const rows = catalog.charts.flatMap((chart) => {
        const id = ids.get(`${String(chart.songId)}:${chart.difficulty}`);
        return chart.constant !== null &&
          id !== undefined &&
          inGame.has(chart.songId)
          ? [{ chartId: id, constant: chart.constant }]
          : [];
      });
      await writeConstants(tx, catalog.currentVersion, rows, now);
      summary.constants = rows.length;
    }
  });
  summary.songs = catalog.songs.length;
  summary.charts = catalog.charts.length;
  summary.linked = catalog.charts.filter((chart) => chart.sdvxRef).length;
  summary.unmatched = catalog.unmatched;
}

async function chartIds(db: Database): Promise<Map<string, number>> {
  const rows = await db
    .select({
      id: chuniCharts.id,
      songId: chuniCharts.songId,
      difficulty: chuniCharts.difficulty,
    })
    .from(chuniCharts);
  return new Map(
    rows.map((row) => [`${String(row.songId)}:${row.difficulty}`, row.id]),
  );
}

async function writeConstants(
  db: Database,
  version: string,
  rows: { chartId: number; constant: number }[],
  now: Date,
): Promise<void> {
  for (const chunk of chunks(rows))
    await db
      .insert(chuniConstants)
      .values(chunk.map((row) => ({ ...row, version, updatedAt: now })))
      .onConflictDoUpdate({
        target: [chuniConstants.chartId, chuniConstants.version],
        set: {
          constant: excluded(chuniConstants.constant),
          updatedAt: sql`case when ${chuniConstants.constant} = ${excluded(chuniConstants.constant)} then ${chuniConstants.updatedAt} else ${excluded(chuniConstants.updatedAt)} end`,
        },
      });
}

/**
 * otoge-db freezes a version's constants once it ends. For each ended version without
 * them, look (at most daily) and keep what's there as that version's constants.
 */
async function readFinalConstants(
  db: Database,
  fetcher: typeof fetch,
  sources: ChunithmSources,
  catalog: Catalog,
  summary: ChuniSyncSummary,
  now: Date,
): Promise<void> {
  if (!catalog.currentVersion) return;
  const versions = await db
    .select()
    .from(chuniVersions)
    .orderBy(desc(chuniVersions.sortOrder));
  const current = versions.findIndex(
    (version) => version.slug === catalog.currentVersion,
  );
  const ended = versions
    .filter((version, index) => {
      if (index <= current || version.finalConstantsAt) return false;
      const wait = index === current + 1 ? FINAL_RETRY_MS : OLD_FINAL_RETRY_MS;
      return (
        !version.finalCheckedAt ||
        version.finalCheckedAt.getTime() < now.getTime() - wait
      );
    })
    .slice(0, 2);
  if (ended.length === 0) return;
  const ids = await chartIds(db);
  for (const version of ended) {
    const url = new URL(otogeFinalFile(version.slug), sources.otogeUrl).href;
    try {
      const songs = parseOtogeMusic(await fetchJson(fetcher, url), {
        minSongs: 100,
      });
      const rows = constantRows(songs).flatMap((row) => {
        const id = ids.get(`${String(row.songId)}:${row.difficulty}`);
        return id === undefined
          ? []
          : [{ chartId: id, constant: row.constant }];
      });
      await writeConstants(db, version.slug, rows, now);
      await db
        .update(chuniVersions)
        .set({ finalConstantsAt: now, finalCheckedAt: now })
        .where(eq(chuniVersions.slug, version.slug));
    } catch (error) {
      await db
        .update(chuniVersions)
        .set({ finalCheckedAt: now })
        .where(eq(chuniVersions.slug, version.slug));
      // Older versions simply have no frozen file: only other failures are news.
      if (!(error instanceof FetchError && error.missing))
        summary.errors.push(errorText(error));
    }
  }
}

async function pruneSyncs(db: Database): Promise<void> {
  const keep = await db
    .select({ id: chuniSyncs.id })
    .from(chuniSyncs)
    .orderBy(desc(chuniSyncs.id))
    .limit(SYNCS_KEPT);
  const oldest = keep.at(-1)?.id;
  if (keep.length === SYNCS_KEPT && oldest !== undefined)
    await db.delete(chuniSyncs).where(lt(chuniSyncs.id, oldest));
}

/**
 * Tells the admin about new songs, new versions and sdvx.in pages the last pass
 * hadn't already reported; and about failures, once FAILURES_TO_ALERT passes in a
 * row have failed.
 */
async function alertIfNeeded(
  db: Database,
  runId: number,
  ok: boolean,
  summary: ChuniSyncSummary,
  now: Date,
): Promise<void> {
  const recent = await db
    .select({
      id: chuniSyncs.id,
      ok: chuniSyncs.ok,
      summary: chuniSyncs.summary,
    })
    .from(chuniSyncs)
    .where(isNotNull(chuniSyncs.finishedAt))
    .orderBy(desc(chuniSyncs.id))
    .limit(FAILURES_TO_ALERT + 1);
  const notes: string[] = [];
  if (!ok) {
    const failures = recent.findIndex((row) => row.ok);
    const inARow = failures === -1 ? recent.length : failures;
    if (inARow === FAILURES_TO_ALERT)
      notes.push(
        `The catalog update has failed ${String(FAILURES_TO_ALERT)} times in a row: ${summary.errors[0] ?? "unknown error"}`,
      );
  } else {
    const previous = recent.find((row) => row.id !== runId && row.ok)?.summary;
    if (summary.newSongs.length > 0)
      notes.push(
        `${String(summary.newSongs.length)} new ${summary.newSongs.length === 1 ? "song" : "songs"}`,
      );
    if (summary.newVersions.length > 0)
      notes.push(`new version: ${summary.newVersions.join(", ")}`);
    // Only charts sdvx.in added since the first fill (the rest is retired content
    // with no official ID), and only once: not those the last pass had.
    const reported = new Set(
      previous?.unmatched.map((row) => row.ref ?? row.path) ?? [],
    );
    const refs = summary.unmatched.flatMap((row) => (row.ref ? [row.ref] : []));
    const added = await newRefs(db, refs);
    const fresh = refs.filter((ref) => added.has(ref) && !reported.has(ref));
    if (fresh.length > 0)
      notes.push(
        `${String(fresh.length)} sdvx.in ${fresh.length === 1 ? "chart" : "charts"} to place`,
      );
  }
  if (notes.length === 0) return;
  await alertAdmin(
    db,
    {
      kind: "chunithm-update",
      summary: `CHUNITHM: ${notes.join("; ")}.`,
      path: "/admin/chunithm/",
    },
    now,
  );
}

/** Songs first seen this long after the first fill began count as new. */
const FIRST_FILL_MS = 60 * MINUTE_MS;

/**
 * Of these sdvx.in charts, the ones whose songs appeared on its lists after the first
 * fill: what sdvx.in added since, as opposed to its archive.
 */
export async function newRefs(
  db: Database,
  refs: string[],
): Promise<Set<string>> {
  const keys = new Map(
    refs.flatMap((ref) => {
      const key = sdvxSongKey(ref);
      return key ? [[ref, key] as const] : [];
    }),
  );
  if (keys.size === 0) return new Set();
  const [first] = await db
    .select({ at: sql<Date | null>`min(${chuniSdvxSongs.firstSeenAt})` })
    .from(chuniSdvxSongs);
  const start = first?.at ? new Date(first.at).getTime() : null;
  if (start === null) return new Set();
  const rows = await db
    .select({
      key: chuniSdvxSongs.key,
      firstSeenAt: chuniSdvxSongs.firstSeenAt,
    })
    .from(chuniSdvxSongs)
    .where(inArray(chuniSdvxSongs.key, [...new Set(keys.values())]));
  const added = new Set(
    rows
      .filter((row) => row.firstSeenAt.getTime() > start + FIRST_FILL_MS)
      .map((row) => row.key),
  );
  return new Set(
    [...keys].flatMap(([ref, key]) => (added.has(key) ? [ref] : [])),
  );
}

let running: Promise<unknown> | null = null;
/** When the last pass started and ended; read from chuni_syncs after a restart. */
let lastStart: number | null = null;
let lastEnd = 0;
let loading = false;
let backlog = true;
let ticking = false;

/** Whether a pass is running in this server. */
export function syncRunning(): boolean {
  return running !== null;
}

/** Starts a pass now unless one is running (the admin's "Check now"). */
export function startSync(
  getDb: () => Promise<Database>,
  deps: SyncDeps = {},
): boolean {
  if (running) return false;
  lastStart = Date.now();
  running = getDb()
    .then((db) => syncCatalog(db, deps))
    .then((result) => {
      backlog = (result.jacketsLeft ?? 0) > 0;
    })
    .catch((error: unknown) => {
      console.warn("CHUNITHM catalog update failed:", error);
    })
    .finally(() => {
      running = null;
      lastEnd = Date.now();
    });
  return true;
}

/**
 * Whether a pass is due: BACKLOG_GAP_MS after the last one ended while jackets are
 * waiting (or the move to the new viewer is), SYNC_EVERY_MS after it started otherwise.
 */
export function passDue(
  state: { lastStart: number; lastEnd: number; backlog: boolean },
  now: number,
): boolean {
  return state.backlog
    ? now - Math.max(state.lastEnd, state.lastStart) >= BACKLOG_GAP_MS
    : now - state.lastStart >= SYNC_EVERY_MS;
}

/**
 * A pass if one is due (never with CHUNITHM_SYNC=off). Called by the timer
 * (`startChunithmSync`) and, as a fallback, from any request.
 */
export function chunithmSyncInBackground(
  getDb: () => Promise<Database>,
  now = Date.now(),
): void {
  if (running || loading || !chunithmSources()) return;
  if (lastStart === null) {
    // After a restart, go by the last pass on record rather than starting one.
    loading = true;
    void getDb()
      .then((db) =>
        db
          .select({
            startedAt: chuniSyncs.startedAt,
            finishedAt: chuniSyncs.finishedAt,
            summary: chuniSyncs.summary,
          })
          .from(chuniSyncs)
          .orderBy(desc(chuniSyncs.id))
          .limit(1),
      )
      .then(([last]) => {
        lastStart = last?.startedAt.getTime() ?? 0;
        lastEnd = last?.finishedAt?.getTime() ?? lastStart;
        // A pass from before the new viewer (no `sdvxLists`): the move is due.
        backlog =
          last?.summary?.sdvxLists === undefined ||
          (last.summary.jacketsLeft ?? 0) > 0;
      })
      .catch(() => {
        lastStart = 0;
      })
      .finally(() => {
        loading = false;
      });
    return;
  }
  if (passDue({ lastStart, lastEnd, backlog }, now)) startSync(getDb);
}

/**
 * Checks every TICK_MS whether a pass is due, so the catalog keeps up with no visitors
 * (the site has few). Started once per server by the middleware's first
 * server-rendered request (never during the build), like the webhooks; the timer
 * doesn't keep the process alive.
 */
export function startChunithmSync(getDb: () => Promise<Database>): void {
  if (ticking || !chunithmSources()) return;
  ticking = true;
  const tick = () => {
    chunithmSyncInBackground(getDb);
  };
  setTimeout(tick, 5000).unref();
  setInterval(tick, TICK_MS).unref();
}
