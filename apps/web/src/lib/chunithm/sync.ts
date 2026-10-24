/**
 * Keeping the CHUNITHM catalog up to date. One pass:
 *
 * 1. Fetch SEGA's song list and otoge-db's current and removed songs. If any of them
 *    fails or looks broken, the pass stops there: nothing is half-applied.
 * 2. Fetch sdvx.in's list pages and record their entries (a failed page only means no
 *    new entries from it this time).
 * 3. Read a few entries' scripts (SDVX_PASS.scripts): new ones first, then any not
 *    read for SDVX_PASS.rereadDays. The first fill takes a few hours of passes.
 * 4. Merge everything (@trilleo/chunithm's buildCatalog) and write it in one
 *    transaction: versions, songs, charts and the current version's constants.
 * 5. Look for otoge-db's frozen constants of versions that have ended.
 *
 * A pass runs every SYNC_EVERY_MS from any request (more often while scripts are
 * still waiting to be read), or from /admin/chunithm/'s "Check now". New songs, new
 * versions, sdvx.in pages it couldn't place and repeated failures alert the admin.
 */
import {
  buildCatalog,
  constantRows,
  otogeFinalFile,
  parseOtogeMusic,
  parseSdvxList,
  parseSdvxScript,
  parseSegaMusic,
  sdvxScriptOf,
  sdvxScriptUrl,
  type Catalog,
  type CatalogInput,
  type Difficulty,
  type SdvxEntry,
  type SdvxListEntry,
} from "@trilleo/chunithm";
import {
  chuniCharts,
  chuniConstants,
  chuniSdvxEntries,
  chuniSdvxOverrides,
  chuniSongs,
  chuniSyncs,
  chuniVersions,
  type ChuniSdvxDetails,
  type ChuniSyncSummary,
  type Database,
} from "@trilleo/db";
import {
  and,
  asc,
  desc,
  eq,
  inArray,
  isNotNull,
  isNull,
  lt,
  sql,
  type Column,
} from "drizzle-orm";
import { alertAdmin } from "../mail/alerts";
import {
  FETCH_LIMITS,
  FetchError,
  SDVX_LIST_PAGES,
  chunithmSources,
  fetchJson,
  fetchText,
  type ChunithmSources,
} from "./sources";

const MINUTE_MS = 60 * 1000;
const DAY_MS = 24 * 60 * MINUTE_MS;

/** How often a pass runs (from any request), and while scripts are still unread. */
export const SYNC_EVERY_MS = 6 * 60 * MINUTE_MS;
export const BACKLOG_EVERY_MS = 10 * MINUTE_MS;

export const SDVX_PASS = {
  /** Scripts read per pass, one at a time. */
  scripts: 100,
  /** The wait between two requests to sdvx.in. */
  delayMs: 500,
  /** A script read this long ago is read again, for designers or levels that changed. */
  rereadDays: 30,
};

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
  /** Waits between sdvx.in requests (tests pass a no-op). */
  sleep?: (ms: number) => Promise<void>;
  scriptsPerPass?: number;
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
  scriptsRead: 0,
  scriptsLeft: 0,
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
  const listed = new Map<string, SdvxListEntry>();
  for (const page of SDVX_LIST_PAGES) {
    try {
      const html = await fetchText(
        fetcher,
        new URL(page, sources.sdvxOrigin).href,
        FETCH_LIMITS.maxPageBytes,
      );
      for (const entry of parseSdvxList(html)) {
        const before = listed.get(entry.script);
        // An entry on a genre page and the removed page: keep both facts.
        listed.set(entry.script, {
          ...entry,
          version: before?.version ?? entry.version,
          listTitle: before?.listTitle ?? entry.listTitle,
          removed: before?.removed ?? entry.removed,
        });
      }
    } catch (error) {
      summary.errors.push(errorText(error));
    }
    await sleep(SDVX_PASS.delayMs);
  }
  await recordEntries(db, [...listed.values()], now());

  // 3. A few scripts.
  const due = await dueScripts(
    db,
    deps.scriptsPerPass ?? SDVX_PASS.scripts,
    now(),
  );
  for (const script of due) {
    const url = new URL(sdvxScriptUrl(script), sources.sdvxOrigin).href;
    let details: ChuniSdvxDetails | null = null;
    let readError: string | null = null;
    try {
      details = parseSdvxScript(
        await fetchText(fetcher, url, FETCH_LIMITS.maxPageBytes),
        script,
      );
      if (!details) readError = "Not a chart script.";
    } catch (error) {
      readError = errorText(error);
    }
    await db
      .update(chuniSdvxEntries)
      .set({
        readAt: now(),
        readError,
        ...(details ? { details } : {}),
      })
      .where(eq(chuniSdvxEntries.script, script));
    summary.scriptsRead += 1;
    await sleep(SDVX_PASS.delayMs);
  }
  const [left] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(chuniSdvxEntries)
    .where(isNull(chuniSdvxEntries.readAt));
  summary.scriptsLeft = left?.count ?? 0;

  // 4. Merge and write.
  const catalog = buildCatalog({
    sega,
    otoge,
    otogeDeleted,
    sdvx: await storedEntries(db),
    overrides: (await db.select().from(chuniSdvxOverrides)).map((row) => ({
      path: row.path,
      songId: row.songId,
      difficulty: row.difficulty,
    })),
  });
  await writeCatalog(db, catalog, summary, now());

  // 5. Ended versions' constants.
  try {
    await readFinalConstants(db, fetcher, sources, catalog, summary, now());
  } catch (error) {
    summary.errors.push(errorText(error));
  }
  return finish(true);
}

async function recordEntries(
  db: Database,
  entries: SdvxListEntry[],
  now: Date,
): Promise<void> {
  for (const rows of chunks(entries))
    await db
      .insert(chuniSdvxEntries)
      .values(
        rows.map((entry) => ({
          script: entry.script,
          entryId: entry.entryId,
          kind: entry.kind,
          listTitle: entry.listTitle,
          version: entry.version,
          removedOn: entry.removed?.on ?? null,
          removedIn: entry.removed?.version ?? null,
          firstSeenAt: now,
          listedAt: now,
        })),
      )
      .onConflictDoUpdate({
        target: chuniSdvxEntries.script,
        set: {
          listTitle: excluded(chuniSdvxEntries.listTitle),
          version: sql`coalesce(${excluded(chuniSdvxEntries.version)}, ${chuniSdvxEntries.version})`,
          removedOn: excluded(chuniSdvxEntries.removedOn),
          removedIn: excluded(chuniSdvxEntries.removedIn),
          listedAt: excluded(chuniSdvxEntries.listedAt),
        },
      });
}

/** Never read (first listed first), then read longest ago, past the reread age. */
async function dueScripts(
  db: Database,
  limit: number,
  now: Date,
): Promise<string[]> {
  if (limit <= 0) return [];
  const fresh = await db
    .select({ script: chuniSdvxEntries.script })
    .from(chuniSdvxEntries)
    .where(isNull(chuniSdvxEntries.readAt))
    // Newest folders first ("ult", "end", "11", "10", …): the songs people look for.
    .orderBy(asc(chuniSdvxEntries.firstSeenAt), desc(chuniSdvxEntries.script))
    .limit(limit);
  if (fresh.length >= limit) return fresh.map((row) => row.script);
  const stale = await db
    .select({ script: chuniSdvxEntries.script })
    .from(chuniSdvxEntries)
    .where(
      lt(
        chuniSdvxEntries.readAt,
        new Date(now.getTime() - SDVX_PASS.rereadDays * DAY_MS),
      ),
    )
    .orderBy(asc(chuniSdvxEntries.readAt))
    .limit(limit - fresh.length);
  return [...fresh, ...stale].map((row) => row.script);
}

async function storedEntries(db: Database): Promise<SdvxEntry[]> {
  const rows = await db.select().from(chuniSdvxEntries);
  return rows.map((row) => ({
    entry: {
      script: row.script,
      entryId: row.entryId,
      kind: row.kind as SdvxListEntry["kind"],
      listTitle: row.listTitle,
      version: row.version,
      removed: row.removedOn
        ? { version: row.removedIn, on: row.removedOn }
        : null,
    },
    details: row.details
      ? {
          ...row.details,
          charts: row.details.charts.map((chart) => ({
            ...chart,
            difficulty: chart.difficulty as Difficulty,
          })),
        }
      : null,
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

    // Charts. Pages that move are let go first, so the unique path index holds.
    const existing = await tx
      .select({
        id: chuniCharts.id,
        songId: chuniCharts.songId,
        difficulty: chuniCharts.difficulty,
        sdvxPath: chuniCharts.sdvxPath,
      })
      .from(chuniCharts);
    const pathOf = new Map(
      existing.map((row) => [`${String(row.songId)}:${row.difficulty}`, row]),
    );
    const target = new Map(
      catalog.charts.map((chart) => [
        `${String(chart.songId)}:${chart.difficulty}`,
        chart.sdvxPath,
      ]),
    );
    const claimed = new Set(target.values());
    const release = existing.flatMap((row) => {
      if (!row.sdvxPath) return [];
      const wanted = target.get(`${String(row.songId)}:${row.difficulty}`);
      // A chart the catalog lacks keeps its page unless another chart takes it.
      if (wanted === undefined)
        return claimed.has(row.sdvxPath) ? [row.id] : [];
      return wanted === row.sdvxPath ? [] : [row.id];
    });
    for (const ids of chunks(release))
      await tx
        .update(chuniCharts)
        .set({ sdvxPath: null, linkedBy: null })
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
            chain: excluded(chuniCharts.chain),
            sdvxPath: excluded(chuniCharts.sdvxPath),
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
  summary.linked = catalog.charts.filter((chart) => chart.sdvxPath).length;
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
    // Only pages sdvx.in added since the first fill (the rest is retired content
    // with no official ID), and only once: not those the last pass had.
    const reported = new Set(previous?.unmatched.map((row) => row.path) ?? []);
    const added = await newPagePaths(
      db,
      summary.unmatched.map((row) => row.path),
    );
    const fresh = summary.unmatched.filter(
      (row) => added.has(row.path) && !reported.has(row.path),
    );
    if (fresh.length > 0)
      notes.push(
        `${String(fresh.length)} sdvx.in ${fresh.length === 1 ? "page" : "pages"} to place`,
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

/** Entries first seen this long after the first fill began count as new. */
const FIRST_FILL_MS = 60 * MINUTE_MS;

/**
 * Of these sdvx.in chart pages, the ones whose entries appeared after the first fill:
 * what sdvx.in added since, as opposed to its archive.
 */
export async function newPagePaths(
  db: Database,
  paths: string[],
): Promise<Set<string>> {
  const scripts = new Map(
    paths.flatMap((path) => {
      const script = sdvxScriptOf(path);
      return script ? [[path, script] as const] : [];
    }),
  );
  if (scripts.size === 0) return new Set();
  const [first] = await db
    .select({ at: sql<Date | null>`min(${chuniSdvxEntries.firstSeenAt})` })
    .from(chuniSdvxEntries);
  const start = first?.at ? new Date(first.at).getTime() : null;
  if (start === null) return new Set();
  const rows = await db
    .select({
      script: chuniSdvxEntries.script,
      firstSeenAt: chuniSdvxEntries.firstSeenAt,
    })
    .from(chuniSdvxEntries)
    .where(inArray(chuniSdvxEntries.script, [...new Set(scripts.values())]));
  const added = new Set(
    rows
      .filter((row) => row.firstSeenAt.getTime() > start + FIRST_FILL_MS)
      .map((row) => row.script),
  );
  return new Set(
    [...scripts].flatMap(([path, script]) => (added.has(script) ? [path] : [])),
  );
}

let running: Promise<unknown> | null = null;
/** When the last pass started; read from chuni_syncs after a restart. */
let lastStart: number | null = null;
let loading = false;
let backlog = true;

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
      backlog = result.scriptsLeft > 0;
    })
    .catch((error: unknown) => {
      console.warn("CHUNITHM catalog update failed:", error);
    })
    .finally(() => {
      running = null;
    });
  return true;
}

/** From any request: a pass when one is due (never with CHUNITHM_SYNC=off). */
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
            summary: chuniSyncs.summary,
          })
          .from(chuniSyncs)
          .orderBy(desc(chuniSyncs.id))
          .limit(1),
      )
      .then(([last]) => {
        lastStart = last?.startedAt.getTime() ?? 0;
        backlog = last?.summary ? last.summary.scriptsLeft > 0 : true;
      })
      .catch(() => {
        lastStart = 0;
      })
      .finally(() => {
        loading = false;
      });
    return;
  }
  const every = backlog ? BACKLOG_EVERY_MS : SYNC_EVERY_MS;
  if (now - lastStart < every) return;
  startSync(getDb);
}
