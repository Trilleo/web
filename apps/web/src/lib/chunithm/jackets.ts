/**
 * Song jackets (the artwork), copied from sdvx.in into storage as WebP so lists and
 * chart pages can show them from our own files. SEGA's image server can't be reached
 * from here. Each catalog update copies JACKETS_PER_PASS, one request at a time like
 * the rest of sdvx.in, and updates keep coming every few minutes while any are due
 * (sync.ts), so a new catalog has its jackets within hours. Opening a chart copies its
 * song's jacket at once if it's missing (build.ts). sdvx.in keeps a jacket per song in
 * its list (/chunithm/<folder>/jacket/<id>.png, World's End under end/): the song's
 * own is tried first, then its World's End entry's; a jacket that couldn't be copied is
 * tried again after JACKET_RETRY_DAYS. The tool's lists ask for the missing jackets of
 * the songs they show (`wantJackets`, from POST /api/chunithm/jackets).
 */
import { sdvxJacketSources, type RgbaImage } from "@trilleo/chunithm";
import { chuniCharts, chuniSongs, type Database } from "@trilleo/db";
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
import { JACKET_DOWNLOAD, download } from "./sources";
import { forgetIndex } from "./viewer";
import { encodeWebp } from "./webp";

export const JACKETS_PER_PASS = 100;
export const JACKET_RETRY_DAYS = 1;
/** Newer jackets on sdvx.in are up to 1000px and 2.5 MB. */
const JACKET_MAX_BYTES = 8 * 1024 * 1024;
/** Jackets are kept at most this wide: pages show them at 300px. */
export const JACKET_SIDE = 300;
export const JACKET_PREFIX = "chunithm/jackets/";

/**
 * Songs that lack a jacket, have a page on sdvx.in, and are due a try (one that
 * failed waits JACKET_RETRY_DAYS, unless `retryFailed`: the admin asked).
 */
function due(now: Date, retryFailed = false): SQL | undefined {
  const retryBefore = new Date(
    now.getTime() - JACKET_RETRY_DAYS * 24 * 3600 * 1000,
  );
  return and(
    isNull(chuniSongs.jacketKey),
    isNotNull(chuniCharts.sdvxRef),
    retryFailed
      ? undefined
      : or(
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
    /** Try songs that failed lately too, without waiting JACKET_RETRY_DAYS. */
    retryFailed?: boolean;
    /** Stop starting new copies after this time (epoch ms): the pass's limit. */
    deadline?: number;
    sleep?: (ms: number) => Promise<void>;
  },
): Promise<number> {
  const fetcher = options.fetch ?? fetch;
  const sleep =
    options.sleep ?? ((ms: number) => new Promise((r) => setTimeout(r, ms)));
  const rows = await db
    .selectDistinct({
      id: chuniSongs.id,
      ref: chuniCharts.sdvxRef,
      addedOn: chuniSongs.addedOn,
    })
    .from(chuniSongs)
    .innerJoin(chuniCharts, eq(chuniCharts.songId, chuniSongs.id))
    .where(
      and(
        due(options.now, options.retryFailed),
        options.songIds ? inArray(chuniSongs.id, options.songIds) : undefined,
      ),
    )
    .orderBy(asc(chuniSongs.id));
  const songs = new Map<number, { refs: string[]; addedOn: string }>();
  for (const row of rows) {
    if (!row.ref) continue;
    const song = songs.get(row.id) ?? { refs: [], addedOn: row.addedOn ?? "" };
    song.refs.push(row.ref);
    songs.set(row.id, song);
  }
  // Newest songs first (by the day they came; World's End IDs run higher than
  // anything else's, so the ID alone won't do): the ones people look for.
  const wanted = [...songs]
    .sort(([a, x], [b, y]) => y.addedOn.localeCompare(x.addedOn) || b - a)
    .slice(0, options.limit ?? JACKETS_PER_PASS);
  if (wanted.length === 0) return 0;

  let copied = 0;
  for (const [id, song] of wanted) {
    if (options.deadline !== undefined && Date.now() > options.deadline) break;
    const sources = sdvxJacketSources(song.refs);
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
    const file = await download(
      fetcher,
      new URL(src, origin).href,
      "image/png",
      {
        ...JACKET_DOWNLOAD,
        maxBytes: JACKET_MAX_BYTES,
      },
    );
    if (file.status !== 200 || !isPng(file.bytes)) {
      console.warn(
        `CHUNITHM jacket ${src} for song ${String(songId)}: HTTP ${String(file.status)}${file.status === 200 ? ", not a PNG" : ""}`,
      );
      return null;
    }
    const webp = await encodeWebp(
      shrinkTo(await decodePng(file.bytes), JACKET_SIDE),
    );
    const key = `${JACKET_PREFIX}${String(songId)}-${randomBytes(4).toString("hex")}.webp`;
    await storage.put(key, webp, {
      contentType: "image/webp",
      contentDisposition: "inline",
      cacheControl: PUBLIC_CACHE,
    });
    await storage.setPublic(key, true);
    return key;
  } catch (error) {
    // Not there, too slow, or not a PNG we can read: tried again later.
    console.warn(
      `CHUNITHM jacket ${src} for song ${String(songId)}:`,
      error instanceof Error ? error.message : error,
    );
    return null;
  }
}

/**
 * An image at most `side` pixels wide and high: each new pixel the average of the
 * block of old ones it covers. Smaller ones are left alone (never enlarged).
 */
export function shrinkTo(image: RgbaImage, side: number): RgbaImage {
  const { width, height, data } = image;
  if (width <= side && height <= side) return image;
  const scale = Math.max(width, height) / side;
  const w = Math.max(1, Math.round(width / scale));
  const h = Math.max(1, Math.round(height / scale));
  const out = new Uint8Array(w * h * 4);
  for (let y = 0; y < h; y++) {
    const y0 = Math.floor((y * height) / h);
    const y1 = Math.max(y0 + 1, Math.floor(((y + 1) * height) / h));
    for (let x = 0; x < w; x++) {
      const x0 = Math.floor((x * width) / w);
      const x1 = Math.max(x0 + 1, Math.floor(((x + 1) * width) / w));
      let r = 0;
      let g = 0;
      let b = 0;
      let a = 0;
      for (let sy = y0; sy < y1; sy++)
        for (let sx = x0; sx < x1; sx++) {
          const i = (sy * width + sx) * 4;
          // Weighted by alpha, so clear pixels don't darken the edges.
          const alpha = data[i + 3] ?? 0;
          r += (data[i] ?? 0) * alpha;
          g += (data[i + 1] ?? 0) * alpha;
          b += (data[i + 2] ?? 0) * alpha;
          a += alpha;
        }
      const o = (y * w + x) * 4;
      const n = (y1 - y0) * (x1 - x0);
      if (a > 0) {
        out[o] = Math.round(r / a);
        out[o + 1] = Math.round(g / a);
        out[o + 2] = Math.round(b / a);
      }
      out[o + 3] = Math.round(a / n);
    }
  }
  return { width: w, height: h, data: out };
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
  fetch?: typeof fetch;
}): boolean {
  if (batch) return false;
  batch = copyJackets(deps.db, deps.storage, {
    ...(deps.fetch ? { fetch: deps.fetch } : {}),
    sdvxOrigin: deps.sdvxOrigin,
    now: new Date(),
    // Asked for by hand: the ones that failed lately too.
    retryFailed: true,
  })
    .catch((error: unknown) => {
      console.warn("CHUNITHM jackets failed:", error);
    })
    .finally(() => {
      batch = null;
    });
  return true;
}

/** Jackets asked for by the tool's lists (`wantJackets`). */
export const LIST_JACKETS = {
  /** Songs one request may ask for (a page of results). */
  perRequest: 60,
  /** Songs waiting at most; asks beyond it are dropped (a later list asks again). */
  queued: 300,
};

const wanted = new Set<number>();
let listWorker: Promise<void> | null = null;

/**
 * Copies the missing jackets of songs a list is showing, in the background: one
 * worker per server, one song at a time like every sdvx.in request, newest asks
 * last. Songs that have a jacket, or failed lately, are skipped by `copyJackets`.
 * Returns how many were taken.
 */
export function wantJackets(
  deps: {
    db: Database;
    storage: StorageDriver;
    sdvxOrigin: string;
    fetch?: typeof fetch;
  },
  songIds: number[],
): number {
  let taken = 0;
  for (const id of songIds.slice(0, LIST_JACKETS.perRequest)) {
    if (wanted.size >= LIST_JACKETS.queued) break;
    if (!wanted.has(id) && !copying.has(id)) taken++;
    wanted.add(id);
  }
  listWorker ??= (async () => {
    while (wanted.size > 0) {
      const ids = [...wanted].slice(0, LIST_JACKETS.perRequest);
      for (const id of ids) copying.add(id);
      try {
        await copyJackets(deps.db, deps.storage, {
          ...(deps.fetch ? { fetch: deps.fetch } : {}),
          sdvxOrigin: deps.sdvxOrigin,
          now: new Date(),
          songIds: ids,
          limit: ids.length,
        });
      } catch (error) {
        console.warn("CHUNITHM jackets for a list failed:", error);
      } finally {
        for (const id of ids) {
          wanted.delete(id);
          copying.delete(id);
        }
      }
    }
  })().finally(() => {
    listWorker = null;
  });
  return taken;
}

/** For tests: wait until the list worker is idle. */
export async function listJacketsIdle(): Promise<void> {
  while (listWorker) await listWorker;
}
