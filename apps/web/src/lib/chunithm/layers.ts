/**
 * Keeping sdvx.in's layers between build attempts: a layer that arrived whole is
 * saved as a private object (LAYER_PREFIX) and recorded in chuni_layers, so when the
 * build fails later (the next layer cut off, a chart that doesn't line up, storage
 * refusing a tile) its next attempt only downloads what's missing. Notes layers run
 * to 15 MB and come slowly from the mainland; storage is next door.
 *
 * Before a kept copy is used, sdvx.in is asked for the layer's tag (a HEAD request,
 * no body, the same tag `checkBuild` compares): a different tag, no answer, or a copy
 * that isn't the PNG it was means downloading again. Half-finished downloads aren't
 * kept: each attempt resumes those itself (sources.ts `download`).
 *
 * A chart's layers go once it builds (`forgetLayers`; lanes and measure numbers stay
 * while its other variant still needs them), and anything left after LAYER_KEEP_DAYS
 * goes from the builds' background tick (`purgeOldLayers`). Keeping is best effort:
 * storage refusing it is logged and the build goes on.
 */
import { chuniBuilds, chuniLayers, type Database } from "@trilleo/db";
import type { StorageDriver } from "@trilleo/storage/server";
import { createHash } from "node:crypto";
import { and, count, eq, inArray, isNull, lt, ne, sql } from "drizzle-orm";
import { isPng } from "./png";
import { FETCH_LIMITS, USER_AGENT } from "./sources";

/** Where kept layers go in storage (private, never served). */
export const LAYER_PREFIX = "chunithm/layers/";
/** Kept layers left over (a chart that keeps failing) go after this long. */
export const LAYER_KEEP_DAYS = 14;

const DAY_MS = 24 * 60 * 60 * 1000;

export interface LayerDeps {
  db: Database;
  storage: StorageDriver;
  fetch?: typeof fetch;
  now?: () => Date;
}

/** A layer's tag: sdvx.in's ETag (or Last-Modified) and size, changed when it's redrawn. */
export function layerTag(headers: Headers, size: number): string {
  return `${headers.get("etag") ?? headers.get("last-modified") ?? ""}|${String(size)}`;
}

/**
 * The layer's tag as sdvx.in has it now (HEAD): null when it's gone (any answer but
 * 200). Throws when sdvx.in doesn't answer.
 */
export async function currentTag(
  fetcher: typeof fetch,
  url: string,
): Promise<string | null> {
  const response = await fetcher(url, {
    method: "HEAD",
    headers: { "User-Agent": USER_AGENT },
    redirect: "manual",
    signal: AbortSignal.timeout(FETCH_LIMITS.timeoutMs),
  });
  if (response.status !== 200) return null;
  return layerTag(
    response.headers,
    Number(response.headers.get("content-length") ?? "0"),
  );
}

function storageKey(url: string): string {
  return `${LAYER_PREFIX}${createHash("sha256").update(url).digest("hex")}.png`;
}

/**
 * The kept copy of the layer at `url`, if there is one and sdvx.in still has the same
 * layer; null otherwise (then download it). A copy that's gone bad is removed.
 */
export async function keptLayer(
  deps: LayerDeps,
  url: string,
): Promise<{ bytes: Uint8Array; tag: string } | null> {
  const { db, storage } = deps;
  const [row] = await db
    .select()
    .from(chuniLayers)
    .where(eq(chuniLayers.url, url));
  if (!row) return null;
  let tag: string | null;
  try {
    tag = await currentTag(deps.fetch ?? fetch, url);
  } catch {
    // No answer: the download says what's wrong; the copy may still do next time.
    return null;
  }
  if (tag !== row.tag) {
    await removeLayer(deps, row);
    return null;
  }
  let bytes: Uint8Array;
  try {
    bytes = new Uint8Array(
      await new Response(await storage.read(row.key)).arrayBuffer(),
    );
  } catch {
    await removeLayer(deps, row);
    return null;
  }
  if (bytes.byteLength !== row.bytes || !isPng(bytes)) {
    await removeLayer(deps, row);
    return null;
  }
  return { bytes, tag };
}

/** Keeps a layer that arrived whole, for the chart's next attempt. Never throws. */
export async function keepLayer(
  deps: LayerDeps,
  chartId: number,
  url: string,
  bytes: Uint8Array,
  tag: string,
): Promise<boolean> {
  const { db, storage } = deps;
  const key = storageKey(url);
  const savedAt = (deps.now ?? (() => new Date()))();
  try {
    await storage.put(key, bytes, {
      contentType: "application/octet-stream",
      contentDisposition: "attachment",
      cacheControl: "private, no-store",
    });
    const row = { chartId, key, tag, bytes: bytes.byteLength, savedAt };
    await db
      .insert(chuniLayers)
      .values({ url, ...row })
      .onConflictDoUpdate({ target: chuniLayers.url, set: row });
    return true;
  } catch (error) {
    console.warn(`Couldn't keep the CHUNITHM layer ${url}:`, error);
    return false;
  }
}

/** Removes a kept layer (a copy that turned out broken, say). */
export async function dropLayer(deps: LayerDeps, url: string): Promise<void> {
  const [row] = await deps.db
    .select()
    .from(chuniLayers)
    .where(eq(chuniLayers.url, url));
  if (row) await removeLayer(deps, row);
}

async function removeLayer(
  deps: LayerDeps,
  row: { url: string; key: string },
): Promise<void> {
  await deps.storage.remove(row.key).catch((error: unknown) => {
    console.warn(`Couldn't remove ${row.key}:`, error);
  });
  await deps.db.delete(chuniLayers).where(eq(chuniLayers.url, row.url));
}

/**
 * After a chart builds: removes the layers it was built from. `shared` (lanes and
 * measure numbers) stay while another build of the chart has no picture yet.
 */
export async function forgetLayers(
  deps: LayerDeps,
  chartId: number,
  buildId: number,
  layers: { own: string[]; shared: string[] },
): Promise<void> {
  const [waiting] = await deps.db
    .select({ n: count() })
    .from(chuniBuilds)
    .where(
      and(
        eq(chuniBuilds.chartId, chartId),
        ne(chuniBuilds.id, buildId),
        isNull(chuniBuilds.manifest),
      ),
    );
  const urls = [...layers.own, ...((waiting?.n ?? 0) > 0 ? [] : layers.shared)];
  if (urls.length === 0) return;
  const rows = await deps.db
    .select()
    .from(chuniLayers)
    .where(inArray(chuniLayers.url, urls));
  for (const row of rows) await removeLayer(deps, row);
}

/** Removes kept layers older than LAYER_KEEP_DAYS; says how many. */
export async function purgeOldLayers(
  deps: LayerDeps,
  now: Date,
): Promise<number> {
  const rows = await deps.db
    .select()
    .from(chuniLayers)
    .where(
      lt(
        chuniLayers.savedAt,
        new Date(now.getTime() - LAYER_KEEP_DAYS * DAY_MS),
      ),
    );
  for (const row of rows) await removeLayer(deps, row);
  return rows.length;
}

/** How many layers are kept and their size, for the admin page. */
export async function keptLayers(
  db: Database,
): Promise<{ count: number; bytes: number }> {
  const [row] = await db
    .select({
      count: count(),
      bytes: sql<number>`coalesce(sum(${chuniLayers.bytes}), 0)::int`,
    })
    .from(chuniLayers);
  return { count: row?.count ?? 0, bytes: row?.bytes ?? 0 };
}
