/**
 * Building a chart's picture: sdvx.in's three layers joined into one strip, cut into
 * WebP tiles and kept in storage (@trilleo/chunithm's charts.ts does the joining).
 *
 * A chart is built the first time someone asks for it (`requestBuild`, from
 * /api/chunithm/charts/…), one build at a time in this server (`runBuilds`), at most
 * BUILD_LIMITS.perHour an hour, so sdvx.in sees a trickle. One build:
 *
 * 1. Read the chart page's script for its three layers (never guessed: some are gone).
 * 2. Fetch each without following redirects (sdvx.in sends missing files to an HTML
 *    page) and check it's a PNG, under BUILD_LIMITS.maxLayerBytes. All three must be
 *    there and the same size, or the build fails and says which.
 * 3. Join (findLayout, drawOver, checkOverlaps), find the measures, cut tiles from the
 *    bottom, encode, upload, make public (unless the chart is withdrawn).
 * 4. Record the manifest; remove the tiles it replaced.
 *
 * A failed build waits BUILD_LIMITS.retryDelaysMs before it's tried again; a rebuild
 * that fails keeps serving the old tiles. A ready chart older than checkAfterDays is
 * compared with sdvx.in (HEAD requests) when it's next viewed, and rebuilt if a layer
 * changed; so is one built by an older BUILD_VERSION or from another page.
 */
import {
  COLUMN,
  ChartLayoutError,
  checkOverlaps,
  drawOver,
  findLayout,
  findMeasures,
  parseSdvxImages,
  sdvxImageScript,
  stripHeight,
  stripTile,
  tileRanges,
  type ChartManifest,
  type SdvxImages,
} from "@trilleo/chunithm";
import {
  chuniBuilds,
  chuniCharts,
  type ChuniBuild,
  type ChuniBuildManifest,
  type ChuniBuildSource,
  type Database,
} from "@trilleo/db";
import { PUBLIC_CACHE } from "@trilleo/storage";
import type { StorageDriver } from "@trilleo/storage/server";
import { randomBytes, createHash } from "node:crypto";
import { and, asc, count, eq, gt, inArray, lt, sql } from "drizzle-orm";
import { decodePng, giveWay, isPng, PngError } from "./png";
import { getDb } from "../db";
import { getStorage } from "../storage/config";
import {
  FETCH_LIMITS,
  FetchError,
  USER_AGENT,
  chunithmSources,
  fetchText,
} from "./sources";
import { BUILD_LIMITS } from "./limits";
import { encodeWebp } from "./webp";

export { BUILD_LIMITS };

/** Bump when the tiles or manifest would come out differently: charts rebuild when viewed. */
export const BUILD_VERSION = 1;

export const VARIANTS = ["normal", "mirror"] as const;
export type Variant = (typeof VARIANTS)[number];

const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

/** Where in storage a build's tiles go: a fresh folder per build. */
export const TILE_PREFIX = "chunithm/";

export type BuildState =
  | { status: "ready"; manifest: ChartManifest; builtAt: Date }
  | { status: "queued" | "building" }
  | { status: "failed"; error: string; retryAt: Date | null }
  | {
      status: "unavailable";
      reason:
        "no-chart" | "no-page" | "withdrawn" | "storage" | "busy" | "too-many";
    };

export interface BuildDeps {
  db: Database;
  storage: StorageDriver;
  fetch?: typeof fetch;
  sdvxOrigin: string;
  now?: () => Date;
}

/** What went wrong, in words for the admin (and the viewer). */
export class BuildError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BuildError";
  }
}

/** The manifest the viewer gets: tile keys turned into URLs. */
export function publicManifest(
  manifest: ChuniBuildManifest,
  storage: StorageDriver,
): ChartManifest {
  return {
    v: 1,
    width: manifest.width,
    height: manifest.height,
    gutter: manifest.gutter,
    lane: manifest.lane,
    tiles: manifest.tiles.map((tile) => ({
      url: storage.publicUrl(tile.key),
      height: tile.height,
    })),
    measures: manifest.measures,
    columns: manifest.columns,
  };
}

function stateOf(row: ChuniBuild, storage: StorageDriver): BuildState {
  if (row.manifest && row.builtAt)
    return {
      status: "ready",
      manifest: publicManifest(row.manifest, storage),
      builtAt: row.builtAt,
    };
  if (row.status === "failed")
    return {
      status: "failed",
      error: row.error ?? "The build failed.",
      retryAt: row.nextAttemptAt,
    };
  return { status: row.status === "building" ? "building" : "queued" };
}

/** Remembers which visitors started builds this hour, by a hash of their address. */
class VisitorCounter {
  private readonly started = new Map<string, number[]>();

  static key(ip: string): string {
    return createHash("sha256").update(`chunithm\n${ip}`).digest("base64url");
  }

  take(key: string, now: number): boolean {
    const recent = (this.started.get(key) ?? []).filter(
      (t) => now - t < HOUR_MS,
    );
    if (recent.length >= BUILD_LIMITS.perVisitorHourly) {
      this.started.set(key, recent);
      return false;
    }
    if (!this.started.has(key) && this.started.size >= 10_000)
      this.started.clear();
    this.started.set(key, [...recent, now]);
    return true;
  }
}

let visitors = new VisitorCounter();

/** For tests: forget who started what. */
export function resetVisitorLimits(): void {
  visitors = new VisitorCounter();
}

/** Whether a ready build should be made again (newer code, or another page now). */
function outdated(row: ChuniBuild, sdvxPath: string): boolean {
  return row.version !== BUILD_VERSION || row.source?.path !== sdvxPath;
}

/**
 * The chart's picture as far as it's got, asking for a build if there's none (or the
 * one there is is out of date). `ip` limits how many builds one visitor starts.
 */
export async function requestBuild(
  deps: BuildDeps,
  chartId: number,
  variant: Variant,
  ip = "",
): Promise<BuildState> {
  const { db, storage } = deps;
  const now = (deps.now ?? (() => new Date()))();
  const [chart] = await db
    .select({
      id: chuniCharts.id,
      sdvxPath: chuniCharts.sdvxPath,
      withdrawnAt: chuniCharts.withdrawnAt,
    })
    .from(chuniCharts)
    .where(eq(chuniCharts.id, chartId));
  if (!chart) return { status: "unavailable", reason: "no-chart" };
  if (chart.withdrawnAt) return { status: "unavailable", reason: "withdrawn" };
  if (!chart.sdvxPath) return { status: "unavailable", reason: "no-page" };
  const [row] = await db
    .select()
    .from(chuniBuilds)
    .where(
      and(eq(chuniBuilds.chartId, chartId), eq(chuniBuilds.variant, variant)),
    );

  if (row && (row.status === "queued" || row.status === "building"))
    return stateOf(row, storage);
  const waiting = row?.nextAttemptAt && row.nextAttemptAt > now;
  if (row?.manifest) {
    // Ready: rebuild in the background if it's out of date, or check sdvx.in now and then.
    if (!waiting && outdated(row, chart.sdvxPath)) await queue(db, row.id, now);
    else if (
      !row.checkedAt ||
      now.getTime() - row.checkedAt.getTime() >
        BUILD_LIMITS.checkAfterDays * DAY_MS
    )
      checkInBackground(deps, row.id);
    return stateOf(row, storage);
  }
  if (row && waiting) return stateOf(row, storage);

  // A new build (or a failed one's next try): within the limits.
  const [queued] = await db
    .select({ n: count() })
    .from(chuniBuilds)
    .where(eq(chuniBuilds.status, "queued"));
  if ((queued?.n ?? 0) >= BUILD_LIMITS.maxQueued)
    return { status: "unavailable", reason: "busy" };
  if (!visitors.take(VisitorCounter.key(ip), now.getTime()))
    return { status: "unavailable", reason: "too-many" };
  if (row) await queue(db, row.id, now);
  else
    await db
      .insert(chuniBuilds)
      .values({ chartId, variant, status: "queued", requestedAt: now })
      .onConflictDoNothing();
  return { status: "queued" };
}

async function queue(db: Database, id: number, now: Date): Promise<void> {
  await db
    .update(chuniBuilds)
    .set({ status: "queued", requestedAt: now })
    .where(
      and(
        eq(chuniBuilds.id, id),
        inArray(chuniBuilds.status, ["ready", "failed"]),
      ),
    );
}

/** Builds one chart's picture now (the worker claims the row first). */
export async function buildChart(
  deps: BuildDeps,
  build: ChuniBuild,
): Promise<boolean> {
  const { db, storage } = deps;
  const now = deps.now ?? (() => new Date());
  const fetcher = deps.fetch ?? fetch;
  const uploaded: string[] = [];
  try {
    const [chart] = await db
      .select()
      .from(chuniCharts)
      .where(eq(chuniCharts.id, build.chartId));
    if (!chart?.sdvxPath)
      throw new BuildError("The chart has no sdvx.in page.");
    const path = chart.sdvxPath;
    const images = await readImages(fetcher, deps.sdvxOrigin, path);
    const notes = build.variant === "mirror" ? images.mirror : images.obj;
    if (!notes)
      throw new BuildError("sdvx.in has no mirrored notes for this chart.");

    // One layer at a time, to keep memory down: lanes, notes over them, numbers on top.
    const bgLayer = await fetchLayer(
      fetcher,
      deps.sdvxOrigin,
      images.bg,
      "lanes",
    );
    const picture = await decodeLayer(bgLayer.bytes, "lanes");
    const layout = findLayout(picture);
    const notesLayer = await fetchLayer(
      fetcher,
      deps.sdvxOrigin,
      notes,
      "notes",
    );
    const notesImage = await decodeLayer(notesLayer.bytes, "notes");
    sameSize(picture, notesImage, "notes");
    await giveWay();
    drawOver(picture, notesImage);
    await giveWay();
    const barLayer = await fetchLayer(
      fetcher,
      deps.sdvxOrigin,
      images.bar,
      "measure numbers",
    );
    const barImage = await decodeLayer(barLayer.bytes, "measure numbers");
    sameSize(picture, barImage, "measure numbers");
    const measures = findMeasures(barImage, layout);
    await giveWay();
    drawOver(picture, barImage);
    await giveWay();
    checkOverlaps(picture, layout);

    const height = stripHeight(layout);
    const folder = `${TILE_PREFIX}${String(build.chartId)}/${build.variant}-${randomBytes(6).toString("hex")}`;
    const tiles: ChuniBuildManifest["tiles"] = [];
    let bytes = 0;
    for (const [index, [from, to]] of tileRanges(height).entries()) {
      await giveWay();
      const webp = await encodeWebp(stripTile(picture, layout, from, to));
      const key = `${folder}/${String(index)}.webp`;
      await storage.put(key, webp, {
        contentType: "image/webp",
        contentDisposition: "inline",
        cacheControl: PUBLIC_CACHE,
      });
      uploaded.push(key);
      if (!chart.withdrawnAt) await storage.setPublic(key, true);
      tiles.push({ key, height: to - from });
      bytes += webp.length;
    }
    const manifest: ChuniBuildManifest = {
      width: COLUMN.pitch,
      height,
      gutter: COLUMN.gutter,
      lane: COLUMN.lane,
      tiles,
      measures,
      columns: layout.columns.length,
    };
    const source: ChuniBuildSource = {
      path,
      bg: images.bg,
      obj: notes,
      bar: images.bar,
      tags: { bg: bgLayer.tag, obj: notesLayer.tag, bar: barLayer.tag },
    };
    const at = now();
    await db
      .update(chuniBuilds)
      .set({
        status: "ready",
        version: BUILD_VERSION,
        attempts: 0,
        error: null,
        nextAttemptAt: null,
        source,
        manifest,
        bytes,
        hidden: chart.withdrawnAt !== null,
        builtAt: at,
        checkedAt: at,
      })
      .where(eq(chuniBuilds.id, build.id));
    await removeTiles(storage, build.manifest);
    return true;
  } catch (error) {
    await removeTiles(storage, {
      tiles: uploaded.map((key) => ({ key, height: 0 })),
    });
    const attempts = build.attempts + 1;
    const delays = BUILD_LIMITS.retryDelaysMs;
    const delay = delays[Math.min(attempts, delays.length) - 1] ?? DAY_MS;
    await db
      .update(chuniBuilds)
      .set({
        // A rebuild that fails keeps the picture it had.
        status: build.manifest ? "ready" : "failed",
        attempts,
        error: describe(error),
        nextAttemptAt: new Date(now().getTime() + delay),
        checkedAt: now(),
      })
      .where(eq(chuniBuilds.id, build.id));
    if (!(
      error instanceof BuildError ||
      error instanceof ChartLayoutError ||
      error instanceof PngError ||
      error instanceof FetchError
    ))
      console.warn(
        `CHUNITHM chart ${String(build.chartId)} build failed:`,
        error,
      );
    return false;
  }
}

function describe(error: unknown): string {
  if (
    error instanceof BuildError ||
    error instanceof ChartLayoutError ||
    error instanceof PngError
  )
    return error.message;
  if (error instanceof FetchError)
    return `Couldn't download ${error.url}: ${error.message.slice(error.url.length + 2)}`;
  return "Something went wrong while building it.";
}

async function readImages(
  fetcher: typeof fetch,
  origin: string,
  path: string,
): Promise<SdvxImages> {
  const script = sdvxImageScript(path);
  if (!script) throw new BuildError(`"${path}" isn't an sdvx.in chart page.`);
  const text = await fetchText(
    fetcher,
    new URL(script, origin).href,
    FETCH_LIMITS.maxPageBytes,
  );
  const images = parseSdvxImages(text, path);
  if (!images)
    throw new BuildError(
      `sdvx.in's script for ${path} names no picture for it.`,
    );
  return images;
}

/** A layer's bytes and a tag that changes when sdvx.in redraws it. */
async function fetchLayer(
  fetcher: typeof fetch,
  origin: string,
  src: string,
  name: string,
): Promise<{ bytes: Uint8Array; tag: string }> {
  const url = new URL(src, origin).href;
  let response: Response;
  try {
    response = await fetcher(url, {
      headers: { "User-Agent": USER_AGENT, Accept: "image/png" },
      redirect: "manual",
      signal: AbortSignal.timeout(FETCH_LIMITS.timeoutMs * 2),
    });
  } catch (error) {
    throw new BuildError(
      `The ${name} layer couldn't be downloaded (${error instanceof Error ? error.message : "failed"}).`,
    );
  }
  if (response.status !== 200) {
    await response.body?.cancel();
    throw new BuildError(
      `sdvx.in has no ${name} layer for this chart (HTTP ${String(response.status)}).`,
    );
  }
  const length = Number(response.headers.get("content-length") ?? "0");
  if (length > BUILD_LIMITS.maxLayerBytes) {
    await response.body?.cancel();
    throw new BuildError(`The ${name} layer is too large.`);
  }
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes.byteLength > BUILD_LIMITS.maxLayerBytes)
    throw new BuildError(`The ${name} layer is too large.`);
  if (!isPng(bytes))
    throw new BuildError(
      `sdvx.in's ${name} layer for this chart isn't a picture.`,
    );
  return { bytes, tag: layerTag(response.headers, bytes.byteLength) };
}

function layerTag(headers: Headers, size: number): string {
  return `${headers.get("etag") ?? headers.get("last-modified") ?? ""}|${String(size)}`;
}

async function decodeLayer(bytes: Uint8Array, name: string) {
  try {
    return await decodePng(bytes);
  } catch (error) {
    throw new BuildError(
      `The ${name} layer can't be read: ${error instanceof Error ? error.message : "broken"}`,
    );
  }
}

function sameSize(
  a: { width: number; height: number },
  b: { width: number; height: number },
  name: string,
) {
  if (a.width !== b.width || a.height !== b.height)
    throw new BuildError(
      `The ${name} layer is ${String(b.width)}×${String(b.height)}, the lanes ${String(a.width)}×${String(a.height)}.`,
    );
}

async function removeTiles(
  storage: StorageDriver,
  manifest: Pick<ChuniBuildManifest, "tiles"> | null,
): Promise<void> {
  for (const tile of manifest?.tiles ?? [])
    await storage.remove(tile.key).catch((error: unknown) => {
      console.warn(`Couldn't remove ${tile.key}:`, error);
    });
}

/**
 * Compares a ready build's layers with sdvx.in's (HEAD, no downloads); a changed or
 * vanished layer queues a rebuild. Records when it looked.
 */
export async function checkBuild(
  deps: BuildDeps,
  id: number,
): Promise<"same" | "changed" | "skipped"> {
  const { db } = deps;
  const fetcher = deps.fetch ?? fetch;
  const now = (deps.now ?? (() => new Date()))();
  const [row] = await db
    .select()
    .from(chuniBuilds)
    .where(eq(chuniBuilds.id, id));
  if (!row?.source || row.status !== "ready") return "skipped";
  await db
    .update(chuniBuilds)
    .set({ checkedAt: now })
    .where(eq(chuniBuilds.id, id));
  const layers = [
    ["bg", row.source.bg],
    ["obj", row.source.obj],
    ["bar", row.source.bar],
  ] as const;
  for (const [name, src] of layers) {
    let tag: string | null = null;
    try {
      const response = await fetcher(new URL(src, deps.sdvxOrigin).href, {
        method: "HEAD",
        headers: { "User-Agent": USER_AGENT },
        redirect: "manual",
        signal: AbortSignal.timeout(FETCH_LIMITS.timeoutMs),
      });
      if (response.status === 200)
        tag = layerTag(
          response.headers,
          Number(response.headers.get("content-length") ?? "0"),
        );
    } catch {
      // sdvx.in didn't answer: look again next time.
      await db
        .update(chuniBuilds)
        .set({ checkedAt: row.checkedAt })
        .where(eq(chuniBuilds.id, id));
      return "skipped";
    }
    if (tag !== row.source.tags[name]) {
      await queue(db, id, now);
      return "changed";
    }
  }
  return "same";
}

let checking = false;

/** The site's own: its database and storage, and sdvx.in (null when either is off). */
export async function siteBuildDeps(): Promise<BuildDeps | null> {
  const storage = getStorage();
  const sources = chunithmSources();
  if (!storage || !sources) return null;
  return { db: await getDb(), storage, sdvxOrigin: sources.sdvxOrigin };
}

function checkInBackground(deps: BuildDeps, id: number): void {
  if (checking) return;
  checking = true;
  void checkBuild(deps, id)
    .then((result) => {
      if (result === "changed") kickBuilds();
    })
    .catch((error: unknown) => {
      console.warn("CHUNITHM build check failed:", error);
    })
    .finally(() => {
      checking = false;
    });
}

/** Takes the next waiting build, if the hourly limit allows; null when there's none. */
async function claimNext(db: Database, now: Date): Promise<ChuniBuild | null> {
  // Builds cut off by a restart go back in the queue.
  await db
    .update(chuniBuilds)
    .set({ status: "queued" })
    .where(
      and(
        eq(chuniBuilds.status, "building"),
        lt(
          chuniBuilds.startedAt,
          new Date(now.getTime() - BUILD_LIMITS.staleMs),
        ),
      ),
    );
  const [started] = await db
    .select({ n: count() })
    .from(chuniBuilds)
    .where(gt(chuniBuilds.startedAt, new Date(now.getTime() - HOUR_MS)));
  if ((started?.n ?? 0) >= BUILD_LIMITS.perHour) return null;
  const [next] = await db
    .select({ id: chuniBuilds.id })
    .from(chuniBuilds)
    .where(eq(chuniBuilds.status, "queued"))
    .orderBy(asc(chuniBuilds.requestedAt))
    .limit(1);
  if (!next) return null;
  const [claimed] = await db
    .update(chuniBuilds)
    .set({ status: "building", startedAt: now })
    .where(and(eq(chuniBuilds.id, next.id), eq(chuniBuilds.status, "queued")))
    .returning();
  return claimed ?? null;
}

/** Builds what's waiting, one at a time, until the queue is empty or the hour is full. */
export async function runBuilds(deps: BuildDeps): Promise<number> {
  const now = deps.now ?? (() => new Date());
  let built = 0;
  for (;;) {
    const next = await claimNext(deps.db, now());
    if (!next) return built;
    if (await buildChart(deps, next)) built++;
  }
}

let running: Promise<unknown> | null = null;
let again = false;
let lastKick = 0;

/** Starts the worker unless it's running (then it looks once more when done). */
export function kickBuilds(): void {
  lastKick = Date.now();
  if (running) {
    again = true;
    return;
  }
  again = false;
  running = siteBuildDeps()
    .then((deps) => (deps ? runBuilds(deps) : 0))
    .catch((error: unknown) => {
      console.warn("CHUNITHM builds failed:", error);
    })
    .finally(() => {
      running = null;
      if (again) kickBuilds();
    });
}

/**
 * Takes a chart's tiles out of public view (withdrawn) or puts them back. The rows
 * say so too, so a build that finishes later follows.
 */
export async function setBuildsHidden(
  db: Database,
  storage: StorageDriver | null,
  chartId: number,
  hidden: boolean,
): Promise<void> {
  const rows = await db
    .select()
    .from(chuniBuilds)
    .where(eq(chuniBuilds.chartId, chartId));
  for (const row of rows) {
    if (storage)
      for (const tile of row.manifest?.tiles ?? [])
        await storage.setPublic(tile.key, !hidden);
    await db
      .update(chuniBuilds)
      .set({ hidden })
      .where(eq(chuniBuilds.id, row.id));
  }
}

/** Throws a chart's builds away (the admin's "Rebuild"): the next view builds it anew. */
export async function resetBuilds(
  db: Database,
  storage: StorageDriver | null,
  chartId: number,
): Promise<void> {
  const rows = await db
    .select()
    .from(chuniBuilds)
    .where(eq(chuniBuilds.chartId, chartId));
  for (const row of rows) if (storage) await removeTiles(storage, row.manifest);
  await db.delete(chuniBuilds).where(eq(chuniBuilds.chartId, chartId));
}

export interface BuildOverview {
  ready: number;
  queued: number;
  building: number;
  failed: number;
  bytes: number;
  lastHour: number;
}

export async function buildOverview(
  db: Database,
  now = new Date(),
): Promise<BuildOverview> {
  const rows = await db
    .select({
      status: chuniBuilds.status,
      n: count(),
      bytes: sql<number>`coalesce(sum(${chuniBuilds.bytes}), 0)::int`,
    })
    .from(chuniBuilds)
    .groupBy(chuniBuilds.status);
  const [hour] = await db
    .select({ n: count() })
    .from(chuniBuilds)
    .where(gt(chuniBuilds.startedAt, new Date(now.getTime() - HOUR_MS)));
  const of = (status: string) =>
    rows.find((row) => row.status === status)?.n ?? 0;
  return {
    ready: of("ready"),
    queued: of("queued"),
    building: of("building"),
    failed: of("failed"),
    bytes: rows.reduce((sum, row) => sum + row.bytes, 0),
    lastHour: hour?.n ?? 0,
  };
}

/**
 * From any request, every few minutes: picks up builds left waiting (after a restart,
 * or when the hourly limit held them back).
 */
export function chunithmBuildsInBackground(now = Date.now()): void {
  if (running || now - lastKick < 5 * MINUTE_MS) return;
  kickBuilds();
}
