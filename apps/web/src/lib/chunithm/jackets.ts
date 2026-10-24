/**
 * Song jackets (the artwork), copied from sdvx.in into storage as WebP so lists and
 * chart pages can show them from our own files. SEGA's image server can't be reached
 * from here. Each catalog update copies JACKETS_PER_PASS, one request at a time like
 * the rest of sdvx.in, and updates keep coming every few minutes while any are due
 * (sync.ts), so a new catalog has its jackets within hours. Opening a chart copies its
 * song's jacket at once if it's missing (build.ts). A song's own chart pages are tried
 * first, then its Ultima and World's End ones; a jacket that couldn't be copied is
 * tried again after JACKET_RETRY_DAYS.
 */
import { sdvxJacket, sdvxPathInfo, sdvxScriptOf } from "@trilleo/chunithm";
import {
  chuniCharts,
  chuniSdvxEntries,
  chuniSongs,
  type Database,
} from "@trilleo/db";
import { PUBLIC_CACHE } from "@trilleo/storage";
import type { StorageDriver } from "@trilleo/storage/server";
import {
  and,
  asc,
  countDistinct,
  eq,
  inArray,
  isNotNull,
  isNull,
  lt,
  or,
  type SQL,
} from "drizzle-orm";
import { randomBytes } from "node:crypto";
import { decodePng, isPng } from "./png";
import { FETCH_LIMITS, USER_AGENT } from "./sources";
import { forgetIndex } from "./viewer";
import { encodeWebp } from "./webp";

export const JACKETS_PER_PASS = 100;
export const JACKET_RETRY_DAYS = 1;
const JACKET_MAX_BYTES = 2 * 1024 * 1024;
export const JACKET_PREFIX = "chunithm/jackets/";

/** Songs that lack a jacket, have a page on sdvx.in, and are due a try. */
function due(now: Date): SQL | undefined {
  const retryBefore = new Date(
    now.getTime() - JACKET_RETRY_DAYS * 24 * 3600 * 1000,
  );
  return and(
    isNull(chuniSongs.jacketKey),
    isNotNull(chuniCharts.sdvxPath),
    or(
      isNull(chuniSongs.jacketCheckedAt),
      lt(chuniSongs.jacketCheckedAt, retryBefore),
    ),
  );
}

/** How many songs are due a jacket now (the catalog updates hurry while any are). */
export async function jacketsDue(db: Database, now: Date): Promise<number> {
  const [row] = await db
    .select({ n: countDistinct(chuniSongs.id) })
    .from(chuniSongs)
    .innerJoin(chuniCharts, eq(chuniCharts.songId, chuniSongs.id))
    .where(due(now));
  return row?.n ?? 0;
}

/** Songs' own chart pages ("11/…") before their Ultima and World's End ones. */
function pageOrder(path: string): number {
  const dir = sdvxPathInfo(path)?.dir ?? "";
  return /^\d{2}$/.test(dir) ? 0 : 1;
}

/**
 * Copies up to `limit` missing jackets (only `songIds`' when given), newest songs
 * first. Returns how many it copied.
 */
export async function copyJackets(
  db: Database,
  storage: StorageDriver,
  options: {
    fetch?: typeof fetch;
    sdvxOrigin: string;
    now: Date;
    limit?: number;
    songIds?: number[];
    sleep?: (ms: number) => Promise<void>;
  },
): Promise<number> {
  const fetcher = options.fetch ?? fetch;
  const sleep =
    options.sleep ?? ((ms: number) => new Promise((r) => setTimeout(r, ms)));
  const rows = await db
    .selectDistinct({
      id: chuniSongs.id,
      path: chuniCharts.sdvxPath,
      addedOn: chuniSongs.addedOn,
    })
    .from(chuniSongs)
    .innerJoin(chuniCharts, eq(chuniCharts.songId, chuniSongs.id))
    .where(
      and(
        due(options.now),
        options.songIds ? inArray(chuniSongs.id, options.songIds) : undefined,
      ),
    )
    .orderBy(asc(chuniSongs.id));
  const songs = new Map<number, { paths: string[]; addedOn: string }>();
  for (const row of rows) {
    if (!row.path) continue;
    const song = songs.get(row.id) ?? { paths: [], addedOn: row.addedOn ?? "" };
    song.paths.push(row.path);
    songs.set(row.id, song);
  }
  // Newest songs first (by the day they came; World's End IDs run higher than
  // anything else's, so the ID alone won't do): the ones people look for.
  const wanted = [...songs]
    .sort(([a, x], [b, y]) => y.addedOn.localeCompare(x.addedOn) || b - a)
    .slice(0, options.limit ?? JACKETS_PER_PASS);
  if (wanted.length === 0) return 0;

  const scripts = new Set(
    wanted.flatMap(([, song]) =>
      song.paths.flatMap((path) => sdvxScriptOf(path) ?? []),
    ),
  );
  const entries = await db
    .select({
      script: chuniSdvxEntries.script,
      details: chuniSdvxEntries.details,
    })
    .from(chuniSdvxEntries)
    .where(inArray(chuniSdvxEntries.script, [...scripts]));
  const detailsOf = new Map(entries.map((row) => [row.script, row.details]));

  let copied = 0;
  for (const [id, song] of wanted) {
    // Every place sdvx.in may keep this song's jacket, its own pages first.
    const sources = [
      ...new Set(
        [...song.paths]
          .sort((a, b) => pageOrder(a) - pageOrder(b))
          .flatMap((path) => {
            const script = sdvxScriptOf(path);
            const src = script
              ? sdvxJacket(detailsOf.get(script) ?? null, script)
              : null;
            return src ? [src] : [];
          }),
      ),
    ];
    let key: string | null = null;
    for (const src of sources) {
      key = await copyOne(storage, fetcher, options.sdvxOrigin, id, src);
      await sleep(500);
      if (key) break;
    }
    if (key) copied++;
    await db
      .update(chuniSongs)
      .set({ jacketKey: key, jacketCheckedAt: options.now })
      .where(eq(chuniSongs.id, id));
  }
  // Lists show jackets from the index: build it afresh with these.
  if (copied > 0) forgetIndex();
  return copied;
}

/** One jacket from sdvx.in into storage; its key, or null if it couldn't be. */
async function copyOne(
  storage: StorageDriver,
  fetcher: typeof fetch,
  origin: string,
  songId: number,
  src: string,
): Promise<string | null> {
  try {
    const response = await fetcher(new URL(src, origin).href, {
      headers: { "User-Agent": USER_AGENT, Accept: "image/png" },
      redirect: "manual",
      signal: AbortSignal.timeout(FETCH_LIMITS.timeoutMs),
    });
    if (response.status !== 200) {
      await response.body?.cancel();
      return null;
    }
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (bytes.byteLength > JACKET_MAX_BYTES || !isPng(bytes)) return null;
    const webp = await encodeWebp(await decodePng(bytes));
    const key = `${JACKET_PREFIX}${String(songId)}-${randomBytes(4).toString("hex")}.webp`;
    await storage.put(key, webp, {
      contentType: "image/webp",
      contentDisposition: "inline",
      cacheControl: PUBLIC_CACHE,
    });
    await storage.setPublic(key, true);
    return key;
  } catch {
    // Not there, or not a PNG we can read: tried again later.
    return null;
  }
}

const copying = new Set<number>();

/**
 * Copies one song's jacket in the background if it's missing and due (someone just
 * opened one of its charts). At most one copy per song at a time in this server.
 */
export function copyJacketSoon(
  deps: {
    db: Database;
    storage: StorageDriver;
    sdvxOrigin: string;
    fetch?: typeof fetch;
    now?: () => Date;
  },
  songId: number,
): void {
  if (copying.has(songId)) return;
  copying.add(songId);
  void copyJackets(deps.db, deps.storage, {
    ...(deps.fetch ? { fetch: deps.fetch } : {}),
    sdvxOrigin: deps.sdvxOrigin,
    now: (deps.now ?? (() => new Date()))(),
    songIds: [songId],
    limit: 1,
    sleep: () => Promise.resolve(),
  })
    .catch((error: unknown) => {
      console.warn(`CHUNITHM jacket for song ${String(songId)} failed:`, error);
    })
    .finally(() => {
      copying.delete(songId);
    });
}

let batch: Promise<unknown> | null = null;

/** Whether a batch started by the admin is copying now. */
export function jacketBatchRunning(): boolean {
  return batch !== null;
}

/** The admin's "Copy jackets now": one batch in the background, unless one is running. */
export function startJacketBatch(deps: {
  db: Database;
  storage: StorageDriver;
  sdvxOrigin: string;
}): boolean {
  if (batch) return false;
  batch = copyJackets(deps.db, deps.storage, {
    sdvxOrigin: deps.sdvxOrigin,
    now: new Date(),
  })
    .catch((error: unknown) => {
      console.warn("CHUNITHM jackets failed:", error);
    })
    .finally(() => {
      batch = null;
    });
  return true;
}
