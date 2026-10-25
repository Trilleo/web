/**
 * Chart pictures built on the admin's computer: the to-do list it starts from
 * (`chartTodo`, /admin/chunithm/todo.json) and importing the bundles it makes
 * (bundle.ts) from storage, where /admin/chunithm/import/ uploaded them (purpose
 * "chunithm-import").
 *
 * An import (`runImports`, one bundle at a time per server, in the background) reads
 * the archive with ranged reads (@trilleo/storage's `listZip` / `readZipEntry`), so
 * a 200 MB bundle never sits in memory. Each chart is skipped when it no longer needs
 * a picture (already built, being built, withdrawn, linked to another of sdvx.in's
 * charts, gone) and refused when its manifest or a tile doesn't check out; otherwise its tiles go to a
 * fresh folder, as a build's do, and it gets a ready chuni_builds row with the
 * layers' tags, so the usual check against sdvx.in notices a redraw later. The upload
 * is deleted when the import ends; chuni_imports keeps what it came to.
 */
import {
  chuniBuilds,
  chuniCharts,
  chuniImports,
  chuniSongs,
  files,
  type ChuniBuildManifest,
  type ChuniImport,
  type ChuniImportSummary,
  type Database,
} from "@trilleo/db";
import { listZip, PUBLIC_CACHE, readZipEntry } from "@trilleo/storage";
import type { StorageDriver } from "@trilleo/storage/server";
import { randomBytes } from "node:crypto";
import {
  and,
  desc,
  eq,
  inArray,
  isNotNull,
  isNull,
  lt,
  sql,
} from "drizzle-orm";
import {
  BUNDLE_INDEX,
  BUNDLE_LIMITS,
  TODO_FORMAT,
  checkBundleChart,
  parseBundleIndex,
  webpSize,
  type BundleChart,
  type Todo,
} from "./bundle";
import { BUILD_VERSION } from "./picture";
import { TILE_PREFIX } from "./build";
import { forgetIndex } from "./viewer";
import { getDb } from "../db";
import { getStorage } from "../storage/config";
import { changeStatus } from "../storage/store";

export const IMPORT_PURPOSE = "chunithm-import";
/** An import "running" this long was cut off (a restart): it's run again. */
const STALE_MS = 60 * 60 * 1000;

export interface ImportDeps {
  db: Database;
  storage: StorageDriver;
  now?: () => Date;
}

/** The site's own: its database and storage (null when storage is off). */
export async function siteImportDeps(): Promise<ImportDeps | null> {
  const storage = getStorage();
  if (!storage) return null;
  return { db: await getDb(), storage };
}

/**
 * In-game Master charts with a chart on sdvx.in and no picture yet, newest songs first:
 * what the admin's computer builds. Failed builds count as no picture.
 */
export async function chartTodo(db: Database, now: Date): Promise<Todo> {
  const rows = await db
    .select({
      chartId: chuniCharts.id,
      songId: chuniCharts.songId,
      title: chuniSongs.title,
      difficulty: chuniCharts.difficulty,
      sdvxRef: chuniCharts.sdvxRef,
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
    .where(
      and(
        eq(chuniCharts.difficulty, "master"),
        isNotNull(chuniCharts.sdvxRef),
        isNull(chuniCharts.withdrawnAt),
        eq(chuniSongs.inGame, true),
        isNull(chuniBuilds.manifest),
      ),
    )
    .orderBy(sql`${chuniSongs.addedOn} desc nulls last`, desc(chuniSongs.id));
  return {
    kind: "chunithm-todo",
    format: TODO_FORMAT,
    buildVersion: BUILD_VERSION,
    createdAt: now.toISOString(),
    charts: rows.flatMap((row) =>
      row.sdvxRef
        ? [
            {
              chartId: row.chartId,
              songId: row.songId,
              title: row.title,
              difficulty: row.difficulty,
              sdvxRef: row.sdvxRef,
              variant: "normal" as const,
            },
          ]
        : [],
    ),
  };
}

export interface BundleUpload {
  fileId: string;
  name: string;
  bytes: number;
  uploadedAt: Date;
  /** "processing" while storage hashes and scans it; "published" once ready. */
  status: string;
}

/** Bundles uploaded and not imported or queued yet (ready, or still being checked). */
export async function waitingBundles(db: Database): Promise<BundleUpload[]> {
  const rows = await db
    .select({
      fileId: files.id,
      name: files.name,
      bytes: files.size,
      uploadedAt: files.createdAt,
      status: files.status,
    })
    .from(files)
    .leftJoin(chuniImports, eq(chuniImports.fileId, files.id))
    .where(
      and(
        eq(files.purpose, IMPORT_PURPOSE),
        inArray(files.status, ["processing", "published"]),
        isNull(chuniImports.id),
      ),
    )
    .orderBy(files.createdAt);
  return rows;
}

/** Recent imports, newest first. */
export async function recentImports(
  db: Database,
  limit = 20,
): Promise<ChuniImport[]> {
  return db
    .select()
    .from(chuniImports)
    .orderBy(desc(chuniImports.requestedAt))
    .limit(limit);
}

/** "#123 Title (master)" for each chart ID, for the import report. */
export async function chartLabels(
  db: Database,
  ids: number[],
): Promise<Map<number, string>> {
  if (ids.length === 0) return new Map();
  const rows = await db
    .select({
      id: chuniCharts.id,
      songId: chuniCharts.songId,
      title: chuniSongs.title,
      difficulty: chuniCharts.difficulty,
    })
    .from(chuniCharts)
    .innerJoin(chuniSongs, eq(chuniSongs.id, chuniCharts.songId))
    .where(inArray(chuniCharts.id, [...new Set(ids)]));
  return new Map(
    rows.map((row) => [
      row.id,
      `#${String(row.songId)} ${row.title} (${row.difficulty})`,
    ]),
  );
}

/** Queues an uploaded bundle; false when it isn't one (or is queued already). */
export async function queueImport(
  db: Database,
  fileId: string,
  now: Date,
): Promise<boolean> {
  const [file] = await db
    .select()
    .from(files)
    .where(
      and(
        eq(files.id, fileId),
        eq(files.purpose, IMPORT_PURPOSE),
        eq(files.status, "published"),
      ),
    );
  if (!file) return false;
  const [row] = await db
    .insert(chuniImports)
    .values({ fileId, name: file.name, bytes: file.size, requestedAt: now })
    .onConflictDoNothing()
    .returning({ id: chuniImports.id });
  return row !== undefined;
}

/** Runs queued imports one after another; says how many ran. */
export async function runImports(deps: ImportDeps): Promise<number> {
  const now = deps.now ?? (() => new Date());
  // Imports cut off by a restart go back in line.
  await deps.db
    .update(chuniImports)
    .set({ status: "queued" })
    .where(
      and(
        eq(chuniImports.status, "running"),
        lt(chuniImports.startedAt, new Date(now().getTime() - STALE_MS)),
      ),
    );
  let ran = 0;
  for (;;) {
    const [next] = await deps.db
      .select()
      .from(chuniImports)
      .where(eq(chuniImports.status, "queued"))
      .orderBy(chuniImports.requestedAt)
      .limit(1);
    if (!next) return ran;
    const [claimed] = await deps.db
      .update(chuniImports)
      .set({ status: "running", startedAt: now() })
      .where(
        and(eq(chuniImports.id, next.id), eq(chuniImports.status, "queued")),
      )
      .returning();
    if (!claimed) continue;
    const summary = await importBundle(deps, claimed);
    await deps.db
      .update(chuniImports)
      .set({
        status: summary.error ? "failed" : "done",
        finishedAt: now(),
        summary,
      })
      .where(eq(chuniImports.id, claimed.id));
    await deleteUpload(deps, claimed.fileId);
    if (summary.imported > 0) forgetIndex();
    ran++;
  }
}

let running: Promise<unknown> | null = null;
let again = false;

/** Starts the import worker unless it's running (then it looks once more when done). */
export function kickImports(deps: () => Promise<ImportDeps | null>): void {
  if (running) {
    again = true;
    return;
  }
  again = false;
  running = deps()
    .then((found) => (found ? runImports(found) : 0))
    .catch((error: unknown) => {
      console.warn("CHUNITHM imports failed:", error);
    })
    .finally(() => {
      running = null;
      if (again) kickImports(deps);
    });
}

/** Whether an import is running in this server. */
export function importRunning(): boolean {
  return running !== null;
}

/** The bundle's bytes are gone once imported (its row stays, as storage keeps rows). */
async function deleteUpload(
  deps: ImportDeps,
  fileId: string | null,
): Promise<void> {
  if (!fileId) return;
  const [file] = await deps.db.select().from(files).where(eq(files.id, fileId));
  if (file?.status !== "published") return;
  try {
    await deps.storage.remove(file.key);
    await changeStatus(deps.db, {
      id: file.id,
      from: "published",
      to: "deleted",
      action: "delete",
      actorId: file.ownerId,
      set: { purgedAt: deps.now?.() ?? new Date() },
      notify: false,
    });
  } catch (error) {
    console.warn(`Couldn't delete the CHUNITHM bundle ${file.id}:`, error);
  }
}

/** What one bundle came to (`error` when the whole bundle was refused). */
export async function importBundle(
  deps: ImportDeps,
  row: Pick<ChuniImport, "fileId">,
): Promise<ChuniImportSummary> {
  const summary: ChuniImportSummary = { imported: 0, skipped: [], refused: [] };
  const refuse = (error: string) => ({ ...summary, error });
  const [file] = row.fileId
    ? await deps.db.select().from(files).where(eq(files.id, row.fileId))
    : [];
  if (file?.status !== "published") return refuse("The upload is gone.");

  const read = async (start: number, end: number) =>
    new Uint8Array(
      await new Response(
        await deps.storage.read(file.key, {
          start,
          end: Math.min(end, file.size),
        }),
      ).arrayBuffer(),
    );
  let listing;
  try {
    listing = await listZip(file.size, read, BUNDLE_LIMITS.maxEntries);
  } catch (error) {
    return refuse(
      `The bundle couldn't be read from storage (${error instanceof Error ? error.message : String(error)}).`,
    );
  }
  if (!listing) return refuse("That isn't a ZIP file.");
  if (listing.truncated)
    return refuse(
      `A bundle holds at most ${String(BUNDLE_LIMITS.maxEntries)} files.`,
    );
  const entries = new Map(listing.entries.map((entry) => [entry.name, entry]));
  const indexEntry = entries.get(BUNDLE_INDEX);
  const indexBytes = indexEntry
    ? await readZipEntry(indexEntry, read, BUNDLE_LIMITS.maxIndexBytes)
    : null;
  if (!indexBytes) return refuse(`The bundle has no ${BUNDLE_INDEX}.`);
  let parsed;
  try {
    parsed = parseBundleIndex(JSON.parse(new TextDecoder().decode(indexBytes)));
  } catch {
    return refuse(`The bundle's ${BUNDLE_INDEX} isn't JSON.`);
  }
  if (typeof parsed === "string") return refuse(parsed);
  if (parsed.buildVersion !== BUILD_VERSION)
    return refuse(
      `The bundle was made by build code version ${String(parsed.buildVersion)}; the site is on ${String(BUILD_VERSION)}. Make it again from an up-to-date checkout.`,
    );

  const seen = new Set<string>();
  for (const chart of parsed.charts) {
    const note = (reason: string) => ({
      chartId: chart.chartId,
      variant: chart.variant,
      reason,
    });
    const key = `${String(chart.chartId)}-${chart.variant}`;
    if (seen.has(key)) {
      summary.refused.push(note("it's in the bundle twice"));
      continue;
    }
    seen.add(key);
    const skip = await whySkip(deps.db, chart);
    if (skip) {
      summary.skipped.push(note(skip));
      continue;
    }
    const problem = checkBundleChart(chart);
    if (problem) {
      summary.refused.push(note(problem));
      continue;
    }
    // Every tile checked before any is stored.
    const tiles: Uint8Array[] = [];
    let bad: string | null = null;
    for (const tile of chart.tiles) {
      const entry = entries.get(tile.file);
      if (!entry) {
        bad = `its tile ${tile.file} is missing`;
        break;
      }
      const bytes = await readZipEntry(entry, read, BUNDLE_LIMITS.maxTileBytes);
      const size = bytes ? webpSize(bytes) : null;
      if (!bytes || !size) {
        bad = `its tile ${tile.file} isn't a WebP picture`;
        break;
      }
      if (size.width !== chart.manifest.width || size.height !== tile.height) {
        bad = `its tile ${tile.file} is ${String(size.width)}×${String(size.height)}, not ${String(chart.manifest.width)}×${String(tile.height)}`;
        break;
      }
      tiles.push(bytes);
    }
    if (bad) {
      summary.refused.push(note(bad));
      continue;
    }
    const result = await storeChart(deps, chart, tiles);
    if (result === "imported") summary.imported++;
    else if (result === "raced")
      summary.skipped.push(note("it was built here meanwhile"));
    else summary.refused.push(note(result.refused));
  }
  return summary;
}

/** Why a bundled chart isn't needed here any more, or null when it is. */
async function whySkip(
  db: Database,
  chart: BundleChart,
): Promise<string | null> {
  const [found] = await db
    .select()
    .from(chuniCharts)
    .where(eq(chuniCharts.id, chart.chartId));
  if (!found) return "it isn't in the catalog";
  if (found.withdrawnAt) return "it's withdrawn";
  if (found.sdvxRef !== chart.sdvxRef)
    return "its chart on sdvx.in has changed since the to-do list";
  const [build] = await db
    .select()
    .from(chuniBuilds)
    .where(
      and(
        eq(chuniBuilds.chartId, chart.chartId),
        eq(chuniBuilds.variant, chart.variant),
      ),
    );
  if (build?.manifest) return "it has a picture already";
  if (build && (build.status === "queued" || build.status === "building"))
    return "it's being built here right now";
  return null;
}

/**
 * Stores a checked chart's tiles and marks it ready: "imported", "raced" (a build
 * here got there first; the tiles are taken back), or why storage refused.
 */
async function storeChart(
  deps: ImportDeps,
  chart: BundleChart,
  tiles: Uint8Array[],
): Promise<"imported" | "raced" | { refused: string }> {
  const { db, storage } = deps;
  const now = (deps.now ?? (() => new Date()))();
  const folder = `${TILE_PREFIX}${String(chart.chartId)}/${chart.variant}-${randomBytes(6).toString("hex")}`;
  const stored: ChuniBuildManifest["tiles"] = [];
  let bytes = 0;
  const takeBack = async () => {
    for (const tile of stored)
      await storage.remove(tile.key).catch((error: unknown) => {
        console.warn(`Couldn't remove ${tile.key}:`, error);
      });
  };
  try {
    for (const [index, tile] of tiles.entries()) {
      const key = `${folder}/${String(index)}.webp`;
      await storage.put(key, tile, {
        contentType: "image/webp",
        contentDisposition: "inline",
        cacheControl: PUBLIC_CACHE,
      });
      stored.push({ key, height: chart.tiles[index]?.height ?? 0 });
      await storage.setPublic(key, true);
      bytes += tile.byteLength;
    }
  } catch (error) {
    await takeBack();
    return {
      refused: `storage refused its tiles (${error instanceof Error ? error.message : String(error)})`,
    };
  }
  const values = {
    status: "ready" as const,
    version: BUILD_VERSION,
    attempts: 0,
    error: null,
    nextAttemptAt: null,
    source: chart.source,
    manifest: { ...chart.manifest, tiles: stored },
    bytes,
    hidden: false,
    builtAt: now,
    checkedAt: now,
  };
  // Only a chart still without a picture, and not being built, takes them.
  const [updated] = await db
    .update(chuniBuilds)
    .set(values)
    .where(
      and(
        eq(chuniBuilds.chartId, chart.chartId),
        eq(chuniBuilds.variant, chart.variant),
        isNull(chuniBuilds.manifest),
        eq(chuniBuilds.status, "failed"),
      ),
    )
    .returning({ id: chuniBuilds.id });
  if (updated) return "imported";
  const [inserted] = await db
    .insert(chuniBuilds)
    .values({
      chartId: chart.chartId,
      variant: chart.variant,
      requestedAt: now,
      ...values,
    })
    .onConflictDoNothing()
    .returning({ id: chuniBuilds.id });
  if (inserted) return "imported";
  await takeBack();
  return "raced";
}
