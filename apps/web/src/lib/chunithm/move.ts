/**
 * Moving to sdvx.in's new viewer (October 2026). Its older site numbered some songs
 * differently and kept PNG layers; the new one has JSON lists, WebP layers and refs
 * ("11061/mst"). What we kept from the older site is moved by the first catalog pass
 * after the new lists are read (sync.ts), once, and recorded in chuni_sdvx_move:
 *
 * - The admin's placements and ignores (chuni_sdvx_overrides, by older page) become
 *   placements by ref: the older page's script told us its title, artist and level,
 *   which find the chart on the new lists (never by assuming the number carried over).
 *   Those that can't be found are listed for the admin.
 * - Kept layers (chuni_layers) were PNGs from the older site: removed.
 * - Jackets copied after the older site's files were renumbered (JACKETS_RENUMBERED)
 *   may be another song's: copied again.
 *
 * And on every pass, `moveBuilds`: pictures built from the older site's layers are
 * correct (and a little sharper: the new notes are lossy WebP), so a ready one is
 * kept and pointed at its chart's new layers, with empty tags that its next check
 * (build.ts `checkBuild`) fills in without rebuilding. Ones built after the older
 * site's lanes were renumbered (LANES_RENUMBERED) may have one song's notes on
 * another's lanes: built again. Failed builds are cleared, so they're tried with the
 * new layers. A ready picture whose chart has no ref yet waits for a pass that links
 * it.
 */
import {
  legacySdvxPathInfo,
  matchKey,
  refFromLegacyPath,
  sdvxImages,
  type Difficulty,
  type SdvxSong,
} from "@trilleo/chunithm";
import {
  chuniBuilds,
  chuniCharts,
  chuniLayers,
  chuniSdvxEntries,
  chuniSdvxMove,
  chuniSdvxOverrides,
  chuniSdvxPlacements,
  chuniSongs,
  type ChuniBuildSource,
  type ChuniMoveSummary,
  type Database,
} from "@trilleo/db";
import type { StorageDriver } from "@trilleo/storage/server";
import { and, eq, gte, inArray, isNotNull, sql } from "drizzle-orm";

/**
 * When sdvx.in redrew its older site's lanes and measure numbers under the new
 * numbering (its notes kept the old): pictures built since may not line up.
 */
export const LANES_RENUMBERED = new Date("2026-10-25T07:32:00Z");
/** When its older site's jackets were renumbered. */
export const JACKETS_RENUMBERED = new Date("2026-10-25T07:33:00Z");

/** Whether the move has been done. */
export async function moved(db: Database): Promise<boolean> {
  const [row] = await db
    .select({ id: chuniSdvxMove.id })
    .from(chuniSdvxMove)
    .where(eq(chuniSdvxMove.id, 1));
  return row !== undefined;
}

export interface PlacementMove {
  placements: number;
  unmoved: ChuniMoveSummary["unmoved"];
}

/**
 * The admin's placements of older pages, as placements of the new lists' charts.
 * Placements already made by ref are left alone.
 */
export async function movePlacements(
  db: Database,
  sdvx: SdvxSong[],
  now: Date,
): Promise<PlacementMove> {
  const overrides = await db.select().from(chuniSdvxOverrides);
  const result: PlacementMove = { placements: 0, unmoved: [] };
  if (overrides.length === 0) return result;
  const entries = await db
    .select({ details: chuniSdvxEntries.details })
    .from(chuniSdvxEntries)
    .where(isNotNull(chuniSdvxEntries.details));
  const pages = new Map<
    string,
    {
      title: string;
      artist: string;
      level: string | null;
      stars: number | null;
    }
  >();
  for (const { details } of entries)
    for (const chart of details?.charts ?? [])
      pages.set(chart.path, {
        title: details?.title ?? "",
        artist: details?.artist ?? "",
        level: chart.level,
        stars: chart.worldsEndStars,
      });
  for (const override of overrides) {
    const info = legacySdvxPathInfo(override.path);
    const page = pages.get(override.path);
    const unmoved = (reason: string) =>
      result.unmoved.push({ path: override.path, reason });
    if (!info) {
      unmoved("It isn't one of the older site's chart pages.");
      continue;
    }
    if (!page) {
      unmoved(
        "The older page was never read, so there's nothing to find it by.",
      );
      continue;
    }
    const ref = findRef(sdvx, info.difficulty, page, override.path);
    if (typeof ref !== "string") {
      unmoved(ref.reason);
      continue;
    }
    const [inserted] = await db
      .insert(chuniSdvxPlacements)
      .values({
        ref,
        songId: override.songId,
        difficulty: override.difficulty,
        fromPath: override.path,
        createdAt: now,
      })
      .onConflictDoNothing()
      .returning({ ref: chuniSdvxPlacements.ref });
    if (inserted) result.placements++;
  }
  return result;
}

/**
 * The chart on the new lists that an older page showed: same title, then the same
 * artist, level (World's End: kanji and stars) and, when that leaves several, the
 * number the page had.
 */
export function findRef(
  sdvx: SdvxSong[],
  difficulty: Difficulty,
  page: {
    title: string;
    artist: string;
    level: string | null;
    stars: number | null;
  },
  path: string,
): string | { reason: string } {
  const title = matchKey(page.title);
  let found = sdvx.flatMap((song) => {
    if (matchKey(song.title) !== title) return [];
    const chart = song.charts.find((c) => c.difficulty === difficulty);
    return chart ? [{ song, chart }] : [];
  });
  const narrow = (fits: (f: (typeof found)[number]) => boolean) => {
    if (found.length < 2) return;
    const fitting = found.filter(fits);
    if (fitting.length > 0) found = fitting;
  };
  narrow(({ song }) => matchKey(song.artist) === matchKey(page.artist));
  narrow(
    ({ chart }) =>
      (!page.level || chart.level === page.level) &&
      (!page.stars || chart.worldsEndStars === page.stars),
  );
  const guess = refFromLegacyPath(path);
  narrow(({ chart }) => chart.ref === guess);
  const [only] = found;
  if (!only)
    return {
      reason: `No ${difficulty} chart called "${page.title}" on sdvx.in's lists.`,
    };
  if (found.length > 1)
    return {
      reason: `Several charts called "${page.title}" fit: ${found.map((f) => f.chart.ref).join(", ")}.`,
    };
  return only.chart.ref;
}

/**
 * Points pictures built from the older site's layers at their charts' new ones
 * (see above). Returns what it did.
 */
export async function moveLegacyBuilds(
  db: Database,
  now: Date,
): Promise<Pick<ChuniMoveSummary, "kept" | "rebuilt" | "retried" | "waiting">> {
  const rows = await db
    .select({
      id: chuniBuilds.id,
      variant: chuniBuilds.variant,
      status: chuniBuilds.status,
      source: chuniBuilds.source,
      manifest: chuniBuilds.manifest,
      builtAt: chuniBuilds.builtAt,
      ref: chuniCharts.sdvxRef,
    })
    .from(chuniBuilds)
    .innerJoin(chuniCharts, eq(chuniCharts.id, chuniBuilds.chartId))
    .where(
      and(
        isNotNull(chuniBuilds.source),
        sql`${chuniBuilds.source}->>'ref' is null`,
      ),
    );
  const done = { kept: 0, rebuilt: 0, retried: 0, waiting: 0 };
  const failed: number[] = [];
  for (const row of rows) {
    if (!row.source) continue;
    if (!row.manifest) {
      if (row.status === "failed") failed.push(row.id);
      continue;
    }
    const images = row.ref ? sdvxImages(row.ref) : null;
    if (!row.ref || !images) {
      done.waiting++;
      continue;
    }
    const source: ChuniBuildSource = {
      ref: row.ref,
      path: row.source.path,
      bg: images.bg,
      obj: row.variant === "mirror" ? images.mirror : images.obj,
      bar: images.bar,
      tags: { bg: "", obj: "", bar: "" },
    };
    const suspect = !row.builtAt || row.builtAt >= LANES_RENUMBERED;
    await db
      .update(chuniBuilds)
      .set({
        source,
        checkedAt: null,
        ...(suspect && row.status !== "queued" && row.status !== "building"
          ? { status: "queued" as const, requestedAt: now }
          : {}),
      })
      .where(eq(chuniBuilds.id, row.id));
    if (suspect) done.rebuilt++;
    else done.kept++;
  }
  // Failed builds without a picture: gone, so visitors and the build-ahead worker
  // try them afresh.
  if (failed.length > 0) {
    await db.delete(chuniBuilds).where(inArray(chuniBuilds.id, failed));
    done.retried = failed.length;
  }
  // Failed rebuilds keep their tiles: tried again with the new layers now.
  return done;
}

/**
 * After the first catalog write from the new lists: moves the builds, removes the
 * older site's kept layers, copies suspect jackets again, and records the move.
 */
export async function moveBuilds(
  db: Database,
  storage: StorageDriver | null,
  now: Date,
  placements: PlacementMove,
): Promise<ChuniMoveSummary> {
  const builds = await moveLegacyBuilds(db, now);

  const layers = await db.select().from(chuniLayers);
  for (const row of layers) {
    await storage?.remove(row.key).catch((error: unknown) => {
      console.warn(`Couldn't remove ${row.key}:`, error);
    });
    await db.delete(chuniLayers).where(eq(chuniLayers.url, row.url));
  }

  const jackets = await db
    .select({ id: chuniSongs.id, key: chuniSongs.jacketKey })
    .from(chuniSongs)
    .where(
      and(
        isNotNull(chuniSongs.jacketKey),
        gte(chuniSongs.jacketCheckedAt, JACKETS_RENUMBERED),
      ),
    );
  for (const row of jackets) {
    if (row.key)
      await storage?.remove(row.key).catch((error: unknown) => {
        console.warn(`Couldn't remove ${row.key ?? ""}:`, error);
      });
    await db
      .update(chuniSongs)
      .set({ jacketKey: null, jacketCheckedAt: null })
      .where(eq(chuniSongs.id, row.id));
  }

  const summary: ChuniMoveSummary = {
    ...builds,
    placements: placements.placements,
    unmoved: placements.unmoved,
    jackets: jackets.length,
    layers: layers.length,
  };
  await db
    .insert(chuniSdvxMove)
    .values({ id: 1, movedAt: now, summary })
    .onConflictDoNothing();
  return summary;
}

/** What the move did, for the admin page (null until it's done). */
export async function moveSummary(
  db: Database,
): Promise<{ movedAt: Date; summary: ChuniMoveSummary } | null> {
  const [row] = await db
    .select()
    .from(chuniSdvxMove)
    .where(eq(chuniSdvxMove.id, 1));
  return row ? { movedAt: row.movedAt, summary: row.summary } : null;
}
