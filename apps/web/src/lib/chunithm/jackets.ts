/**
 * Song jackets (the artwork), copied from sdvx.in into storage as WebP so lists and
 * chart pages can show them. SEGA's own image server can't be reached from here.
 * A few are copied at the end of each catalog update (JACKETS_PER_PASS), one request
 * at a time like the rest of sdvx.in; a song whose jacket couldn't be copied is tried
 * again after JACKET_RETRY_DAYS.
 */
import { sdvxJacket, sdvxScriptOf } from "@trilleo/chunithm";
import {
  chuniCharts,
  chuniSdvxEntries,
  chuniSongs,
  type Database,
} from "@trilleo/db";
import { PUBLIC_CACHE } from "@trilleo/storage";
import type { StorageDriver } from "@trilleo/storage/server";
import { and, asc, eq, inArray, isNotNull, isNull, lt, or } from "drizzle-orm";
import { randomBytes } from "node:crypto";
import { decodePng, isPng } from "./png";
import { FETCH_LIMITS, USER_AGENT } from "./sources";
import { encodeWebp } from "./webp";

export const JACKETS_PER_PASS = 40;
export const JACKET_RETRY_DAYS = 7;
const JACKET_MAX_BYTES = 2 * 1024 * 1024;
export const JACKET_PREFIX = "chunithm/jackets/";

/** Copies up to `limit` missing jackets. Returns how many it copied. */
export async function copyJackets(
  db: Database,
  storage: StorageDriver,
  options: {
    fetch?: typeof fetch;
    sdvxOrigin: string;
    now: Date;
    limit?: number;
    sleep?: (ms: number) => Promise<void>;
  },
): Promise<number> {
  const fetcher = options.fetch ?? fetch;
  const retryBefore = new Date(
    options.now.getTime() - JACKET_RETRY_DAYS * 24 * 3600 * 1000,
  );
  // Songs without a jacket that have a page on sdvx.in.
  const songs = await db
    .selectDistinct({
      id: chuniSongs.id,
      path: chuniCharts.sdvxPath,
      addedOn: chuniSongs.addedOn,
    })
    .from(chuniSongs)
    .innerJoin(chuniCharts, eq(chuniCharts.songId, chuniSongs.id))
    .where(
      and(
        isNull(chuniSongs.jacketKey),
        isNotNull(chuniCharts.sdvxPath),
        or(
          isNull(chuniSongs.jacketCheckedAt),
          lt(chuniSongs.jacketCheckedAt, retryBefore),
        ),
      ),
    )
    .orderBy(asc(chuniSongs.id));
  const firstPath = new Map<number, { path: string; addedOn: string }>();
  for (const row of songs)
    if (row.path && !firstPath.has(row.id))
      firstPath.set(row.id, { path: row.path, addedOn: row.addedOn ?? "" });
  // Newest songs first (by the day they came; World's End IDs run higher than
  // anything else's, so the ID alone won't do): the ones people look for.
  const wanted = [...firstPath]
    .sort(([a, x], [b, y]) => y.addedOn.localeCompare(x.addedOn) || b - a)
    .slice(0, options.limit ?? JACKETS_PER_PASS)
    .map(([id, { path }]) => [id, path] as const);
  if (wanted.length === 0) return 0;

  const scripts = new Map(
    wanted.flatMap(([id, path]) => {
      const script = sdvxScriptOf(path);
      return script ? [[id, script] as const] : [];
    }),
  );
  const entries = await db
    .select({
      script: chuniSdvxEntries.script,
      details: chuniSdvxEntries.details,
    })
    .from(chuniSdvxEntries)
    .where(inArray(chuniSdvxEntries.script, [...new Set(scripts.values())]));
  const detailsOf = new Map(entries.map((row) => [row.script, row.details]));

  let copied = 0;
  for (const [id] of wanted) {
    const script = scripts.get(id);
    const src = script
      ? sdvxJacket(detailsOf.get(script) ?? null, script)
      : null;
    let key: string | null = null;
    if (src) {
      try {
        const response = await fetcher(new URL(src, options.sdvxOrigin).href, {
          headers: { "User-Agent": USER_AGENT, Accept: "image/png" },
          redirect: "manual",
          signal: AbortSignal.timeout(FETCH_LIMITS.timeoutMs),
        });
        if (response.status === 200) {
          const bytes = new Uint8Array(await response.arrayBuffer());
          if (bytes.byteLength <= JACKET_MAX_BYTES && isPng(bytes)) {
            const webp = await encodeWebp(await decodePng(bytes));
            key = `${JACKET_PREFIX}${String(id)}-${randomBytes(4).toString("hex")}.webp`;
            await storage.put(key, webp, {
              contentType: "image/webp",
              contentDisposition: "inline",
              cacheControl: PUBLIC_CACHE,
            });
            await storage.setPublic(key, true);
            copied++;
          }
        } else await response.body?.cancel();
      } catch {
        // Not there, or not a PNG we can read: tried again later.
        key = null;
      }
      await (
        options.sleep ?? ((ms: number) => new Promise((r) => setTimeout(r, ms)))
      )(500);
    }
    await db
      .update(chuniSongs)
      .set({ jacketKey: key, jacketCheckedAt: options.now })
      .where(eq(chuniSongs.id, id));
  }
  return copied;
}
