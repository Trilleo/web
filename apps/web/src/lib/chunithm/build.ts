/**
 * Building a chart's picture: sdvx.in's three layers joined into one strip, cut into
 * WebP tiles and kept in storage (@trilleo/chunithm's charts.ts does the joining).
 *
 * A chart is built the first time someone asks for it (`requestBuild`, from
 * /api/chunithm/charts/…), one build at a time in this server (`runBuilds`), at most
 * BUILD_LIMITS.perHour an hour, so sdvx.in sees a trickle. One build:
 *
 * 1. Name its three layers from its ref, as sdvx.in's viewer does (@trilleo/chunithm's
 *    `sdvxImages`).
 * 2. Fetch each without following redirects (sdvx.in sends missing files to an HTML
 *    page) and check it's a WebP, under BUILD_LIMITS.maxLayerBytes. All three must be
 *    there and the same size, or the build fails and says which (except lanes that
 *    don't fit notes on the grid: those go on plain lanes, picture.ts).
 * 3. Join (findLayout, checkOverlaps, drawOver), find the measures, cut tiles from the
 *    bottom, encode, upload, make public (unless the chart is withdrawn).
 * 4. Record the manifest; remove the tiles it replaced.
 *
 * A failed build waits BUILD_LIMITS.retryDelaysMs before it's tried again; a rebuild
 * that fails keeps serving the old tiles. Layers that arrived whole are kept between
 * attempts (layers.ts), so the next one only downloads what's missing. A ready chart
 * older than checkAfterDays is compared with sdvx.in (HEAD requests) when it's next
 * viewed, and rebuilt if a layer changed; so is one built by an older BUILD_VERSION or
 * for another ref. A picture moved from sdvx.in's older site (move.ts) has empty tags:
 * its first check records them instead.
 */
import { ChartLayoutError, type ChartManifest } from "@trilleo/chunithm";
import {
  chuniBuilds,
  chuniCharts,
  type ChuniBuild,
  type ChuniBuildManifest,
  type Database,
} from "@trilleo/db";
import { PUBLIC_CACHE } from "@trilleo/storage";
import { StorageError, type StorageDriver } from "@trilleo/storage/server";
import { randomBytes, createHash } from "node:crypto";
import { and, asc, count, eq, gt, inArray, lt, sql } from "drizzle-orm";
import { copyJacketSoon } from "./jackets";
import {
  currentTag,
  dropLayer,
  forgetLayers,
  keepLayer,
  keptLayer,
  purgeOldLayers,
} from "./layers";
import {
  BUILD_VERSION,
  BuildError,
  downloadLayer,
  makePicture,
  type Layer,
  type LayerName,
  type Variant,
} from "./picture";
import { PngError } from "./png";
import { getDb } from "../db";
import { getStorage } from "../storage/config";
import { chunithmSources, FetchError } from "./sources";
import { BUILD_LIMITS } from "./limits";
import { encodeWebp } from "./webp";

export { BUILD_LIMITS };
export { BUILD_VERSION, BuildError, VARIANTS, type Variant } from "./picture";

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
        | "no-chart"
        | "no-page"
        | "withdrawn"
        | "storage"
        | "busy"
        | "too-many"
        | "human-check";
    };

export interface BuildDeps {
  db: Database;
  storage: StorageDriver;
  fetch?: typeof fetch;
  sdvxOrigin: string;
  now?: () => Date;
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
    ...(manifest.plainLanes ? { plainLanes: true as const } : {}),
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

let lastAsked = 0;

/** When a chart's picture was last asked for (epoch ms; 0: not since this server started). */
export function chartsLastAsked(): number {
  return lastAsked;
}

/** For tests: as if no one had asked. */
export function resetLastAsked(): void {
  lastAsked = 0;
}

/** Whether a ready build should be made again (newer code, or another ref now). */
function outdated(row: ChuniBuild, sdvxRef: string): boolean {
  return row.version !== BUILD_VERSION || row.source?.ref !== sdvxRef;
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
  /** Asked before a new build is queued (the human check): false refuses it. */
  admit?: () => Promise<boolean>,
): Promise<BuildState> {
  const { db, storage } = deps;
  const now = (deps.now ?? (() => new Date()))();
  // Someone's looking at charts: the background builder (prebuild.ts) waits.
  lastAsked = Math.max(lastAsked, now.getTime());
  const [chart] = await db
    .select({
      id: chuniCharts.id,
      songId: chuniCharts.songId,
      sdvxRef: chuniCharts.sdvxRef,
      withdrawnAt: chuniCharts.withdrawnAt,
    })
    .from(chuniCharts)
    .where(eq(chuniCharts.id, chartId));
  if (!chart) return { status: "unavailable", reason: "no-chart" };
  // Someone's looking at it: make sure its song has its jacket (if it's missing).
  copyJacketSoon(deps, chart.songId);
  if (chart.withdrawnAt) return { status: "unavailable", reason: "withdrawn" };
  if (!chart.sdvxRef) return { status: "unavailable", reason: "no-page" };
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
    if (!waiting && outdated(row, chart.sdvxRef)) await queue(db, row.id, now);
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
  if (admit && !(await admit()))
    return { status: "unavailable", reason: "human-check" };
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
  const uploaded: string[] = [];
  // Layers kept for the next attempt (or reused from the last), by name.
  const kept: LayerName[] = [];
  try {
    const [chart] = await db
      .select()
      .from(chuniCharts)
      .where(eq(chuniCharts.id, build.chartId));
    if (!chart?.sdvxRef)
      throw new BuildError("The chart has no chart on sdvx.in.");
    const folder = `${TILE_PREFIX}${String(build.chartId)}/${build.variant}-${randomBytes(6).toString("hex")}`;
    const tiles: ChuniBuildManifest["tiles"] = [];
    let bytes = 0;
    const picture = await makePicture(
      {
        fetch: deps.fetch ?? fetch,
        sdvxOrigin: deps.sdvxOrigin,
        encode: encodeWebp,
        layer: (url, name) => fetchLayer(deps, build.chartId, url, name, kept),
        broken: async (layer, name) => {
          // Broken bytes stay broken: don't keep them for the next try.
          await dropLayer(deps, layer.url);
          if (kept.includes(name)) kept.splice(kept.indexOf(name), 1);
        },
      },
      chart.sdvxRef,
      variantOf(build.variant),
      async (tile) => {
        const key = `${folder}/${String(tile.index)}.webp`;
        await storage.put(key, tile.bytes, {
          contentType: "image/webp",
          contentDisposition: "inline",
          cacheControl: PUBLIC_CACHE,
        });
        uploaded.push(key);
        if (!chart.withdrawnAt) await storage.setPublic(key, true);
        tiles.push({ key, height: tile.height });
        bytes += tile.bytes.length;
      },
    );
    const manifest: ChuniBuildManifest = { ...picture.manifest, tiles };
    const at = now();
    await db
      .update(chuniBuilds)
      .set({
        status: "ready",
        version: BUILD_VERSION,
        attempts: 0,
        error: null,
        nextAttemptAt: null,
        source: picture.source,
        manifest,
        bytes,
        hidden: chart.withdrawnAt !== null,
        builtAt: at,
        checkedAt: at,
      })
      .where(eq(chuniBuilds.id, build.id));
    await removeTiles(storage, build.manifest);
    await forgetLayers(deps, build.chartId, build.id, {
      own: [picture.urls.obj],
      shared: [picture.urls.bg, picture.urls.bar],
    });
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
        error: describe(error) + keptNote(kept),
        nextAttemptAt: new Date(now().getTime() + delay),
        checkedAt: now(),
      })
      .where(eq(chuniBuilds.id, build.id));
    if (!(
      error instanceof BuildError ||
      error instanceof ChartLayoutError ||
      error instanceof PngError ||
      error instanceof FetchError ||
      error instanceof StorageError
    ))
      console.warn(
        `CHUNITHM chart ${String(build.chartId)} build failed:`,
        error,
      );
    return false;
  }
}

/** A row's variant (only ever one of VARIANTS). */
function variantOf(value: string): Variant {
  return value === "mirror" ? "mirror" : "normal";
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
  if (error instanceof StorageError)
    return `The picture couldn't be saved to storage (${error.message}).`;
  // Kept for the admin page, which lists failures with their reasons.
  return `Something went wrong while building it (${error instanceof Error ? error.message : String(error)}).`;
}

/**
 * A layer: the copy kept from an earlier attempt if sdvx.in still has the same one,
 * otherwise downloaded (and kept). Adds its name to `kept` when it's kept.
 */
async function fetchLayer(
  deps: BuildDeps,
  chartId: number,
  url: string,
  name: LayerName,
  kept: LayerName[],
): Promise<Layer> {
  const reused = await keptLayer(deps, url);
  if (reused) {
    kept.push(name);
    return { url, ...reused };
  }
  const layer = await downloadLayer(deps.fetch ?? fetch, url, name);
  if (await keepLayer(deps, chartId, url, layer.bytes, layer.tag))
    kept.push(name);
  return layer;
}

/** " Lanes and notes are kept…": what the next attempt won't download again. */
function keptNote(kept: LayerName[]): string {
  if (kept.length === 0) return "";
  if (kept.length === 3)
    return " All three layers are kept, so the next try downloads them only if sdvx.in has changed them.";
  const names =
    kept.length === 1
      ? (kept[0] ?? "")
      : `${kept.slice(0, -1).join(", ")} and ${kept.at(-1) ?? ""}`;
  const layers = kept.length === 1 ? "layer is" : "layers are";
  return ` The ${names} ${layers} kept, so the next try downloads only the rest.`;
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
 * vanished layer queues a rebuild. An empty tag (a picture moved from the older site)
 * is filled in instead. Records when it looked.
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
  const tags = { ...row.source.tags };
  for (const [name, src] of layers) {
    let tag: string | null;
    try {
      tag = await currentTag(fetcher, new URL(src, deps.sdvxOrigin).href);
    } catch {
      // sdvx.in didn't answer: look again next time.
      await db
        .update(chuniBuilds)
        .set({ checkedAt: row.checkedAt })
        .where(eq(chuniBuilds.id, id));
      return "skipped";
    }
    if (tag !== null && tags[name] === "") tags[name] = tag;
    else if (tag !== tags[name]) {
      await queue(db, id, now);
      return "changed";
    }
  }
  if (layers.some(([name]) => row.source?.tags[name] !== tags[name]))
    await db
      .update(chuniBuilds)
      .set({ source: { ...row.source, tags } })
      .where(eq(chuniBuilds.id, id));
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
  if ((await buildsThisHour(db, now)) >= BUILD_LIMITS.perHour) return null;
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

let slot: Promise<unknown> = Promise.resolve();

/**
 * Builds one chart once the build before it (a visitor's or the background
 * builder's) is done: one build at a time per server, since each holds three
 * decoded layers in memory.
 */
export function buildInTurn(
  deps: BuildDeps,
  build: ChuniBuild,
): Promise<boolean> {
  const run = slot.then(() => buildChart(deps, build));
  slot = run.catch(() => undefined);
  return run;
}

/** Builds whose `startedAt` falls in the last hour (BUILD_LIMITS.perHour counts them). */
export async function buildsThisHour(db: Database, now: Date): Promise<number> {
  const [started] = await db
    .select({ n: count() })
    .from(chuniBuilds)
    .where(gt(chuniBuilds.startedAt, new Date(now.getTime() - HOUR_MS)));
  return started?.n ?? 0;
}

/** Builds what's waiting, one at a time, until the queue is empty or the hour is full. */
export async function runBuilds(deps: BuildDeps): Promise<number> {
  const now = deps.now ?? (() => new Date());
  let built = 0;
  for (;;) {
    const next = await claimNext(deps.db, now());
    if (!next) return built;
    if (await buildInTurn(deps, next)) built++;
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
  purgeLayersSoon(now);
  if (running || now - lastKick < 5 * MINUTE_MS) return;
  kickBuilds();
}

let lastPurge = 0;

/** At most hourly: removes layers kept longer than LAYER_KEEP_DAYS (layers.ts). */
function purgeLayersSoon(now: number): void {
  if (now - lastPurge < HOUR_MS) return;
  lastPurge = now;
  void siteBuildDeps()
    .then((deps) => (deps ? purgeOldLayers(deps, new Date(now)) : 0))
    .catch((error: unknown) => {
      console.warn("Removing old CHUNITHM layers failed:", error);
    });
}
