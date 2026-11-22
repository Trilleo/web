/**
 * The event timer's live data from Hypixel's keyless SkyBlock endpoints: the election
 * (mayor, minister, votes), fire sales, Bingo and news. The server fetches each on
 * its own pace (FEEDS), never browsers; @trilleo/skyblock/events' readers check every
 * answer, and the checked result replaces the feed's row in sb_feeds. The election
 * also writes the history: each election by year (sb_elections) and the running one's
 * votes by the hour (sb_election_votes). One feed isn't Hypixel's: Jacob's contest
 * crops, from the Skyblocker mod's calendar (CROPS_URL), which Hypixel's API lacks.
 *
 * Settings (optional): SKYBLOCK_FEEDS=off never fetches; SKYBLOCK_HYPIXEL_URL points
 * at another host (e2e's fake); SKYBLOCK_CROPS=off skips the crops alone and
 * SKYBLOCK_CROPS_URL points them elsewhere. FAILURES_TO_ALERT failures of one feed in a row alert
 * the admin ("skyblock-feeds"), at most every ALERT_GAP_MS.
 */
import {
  readBingo,
  readElection,
  readFireSales,
  readJacobCrops,
  readNews,
  type Bingo,
  type JacobSchedule,
  type Election,
  type FireSale,
  type NewsItem,
} from "@trilleo/skyblock/events";
import {
  sbElectionVotes,
  sbElections,
  sbFeeds,
  type Database,
} from "@trilleo/db";
import { eq, sql } from "drizzle-orm";
import { alertAdmin } from "../mail/alerts";
import { hourOf } from "./bazaar";
import { fetchJson } from "./source";

export const HYPIXEL_API = "https://api.hypixel.net";
/** The Skyblocker mod's in-game calendar: Jacob's contests with their crops. */
export const CROPS_URL = "https://hysky.de/api/calendar";
const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;

/** Each feed: where it is, how often it's fetched, and its reader. */
export const FEEDS = {
  election: {
    label: "Election",
    path: "/v2/resources/skyblock/election",
    everyMs: 5 * MINUTE_MS,
    read: readElection,
  },
  firesales: {
    label: "Fire sales",
    path: "/v2/skyblock/firesales",
    everyMs: 5 * MINUTE_MS,
    read: readFireSales,
  },
  bingo: {
    label: "Bingo",
    path: "/v2/resources/skyblock/bingo",
    everyMs: 30 * MINUTE_MS,
    read: readBingo,
  },
  news: {
    label: "News",
    path: "/v2/skyblock/news",
    everyMs: 30 * MINUTE_MS,
    read: readNews,
  },
  jacob: {
    label: "Jacob's crops",
    // Not Hypixel's: the address comes from `cropsUrl`.
    path: null,
    everyMs: 3 * HOUR_MS,
    read: readJacobCrops,
  },
} as const;
export type Feed = keyof typeof FEEDS;
export const FEED_NAMES = Object.keys(FEEDS) as Feed[];

/** How long `liveFeeds` trusts its copy before asking the database. */
export const CACHE_MS = 30 * 1000;
export const FAILURES_TO_ALERT = 6;
const ALERT_GAP_MS = 6 * HOUR_MS;

export function hypixelBase(
  env: Record<string, string | undefined> = process.env,
): string | null {
  if (env.SKYBLOCK_FEEDS === "off") return null;
  // An empty setting (as .env.example leaves it) means the default.
  const url = env.SKYBLOCK_HYPIXEL_URL?.trim();
  return (url === undefined || url === "" ? HYPIXEL_API : url).replace(
    /\/+$/,
    "",
  );
}

export function cropsUrl(
  env: Record<string, string | undefined> = process.env,
): string | null {
  if (env.SKYBLOCK_FEEDS === "off" || env.SKYBLOCK_CROPS === "off") return null;
  const url = env.SKYBLOCK_CROPS_URL?.trim();
  return url === undefined || url === "" ? CROPS_URL : url;
}

export interface FeedDeps {
  fetch?: typeof fetch;
  /** null: fetching is off. Read from the environment if left out. */
  base?: string | null;
  /** The crop calendar's address; null: skipped. Read from the environment if left out. */
  crops?: string | null;
  now?: () => Date;
  sleep?: (ms: number) => Promise<void>;
  /** Fetch these whether or not they're due ("Check now"). */
  force?: boolean;
}

export interface FeedResult {
  feed: Feed;
  ok: boolean;
  error?: string;
}

/** Fetches every feed that's due (or all, with `force`). */
export async function refreshFeeds(
  db: Database,
  deps: FeedDeps = {},
): Promise<FeedResult[]> {
  const base = deps.base === undefined ? hypixelBase() : deps.base;
  if (!base) return [];
  const now = deps.now ?? (() => new Date());
  const crops = deps.crops === undefined ? cropsUrl() : deps.crops;
  const rows = new Map(
    (await db.select().from(sbFeeds)).map((row) => [row.feed, row]),
  );
  const results: FeedResult[] = [];
  for (const feed of FEED_NAMES) {
    const row = rows.get(feed);
    const last = Math.max(
      row?.fetchedAt?.getTime() ?? 0,
      row?.lastErrorAt?.getTime() ?? 0,
    );
    if (!deps.force && now().getTime() - last < FEEDS[feed].everyMs) continue;
    const path = FEEDS[feed].path;
    const url = path === null ? crops : `${base}${path}`;
    if (url === null) continue;
    results.push(await refreshFeed(db, feed, url, deps, now));
  }
  if (results.some((result) => result.ok)) forgetFeeds();
  return results;
}

async function refreshFeed(
  db: Database,
  feed: Feed,
  url: string,
  deps: FeedDeps,
  now: () => Date,
): Promise<FeedResult> {
  let data: unknown;
  try {
    const body = await fetchJson(
      deps.fetch ?? fetch,
      url,
      deps.sleep ? { sleep: deps.sleep } : {},
    );
    data = FEEDS[feed].read(body);
  } catch (error) {
    const message = (
      error instanceof Error ? error.message : String(error)
    ).slice(0, 500);
    await recordFailure(db, feed, message, now());
    return { feed, ok: false, error: message };
  }
  const fetchedAt = now();
  await db
    .insert(sbFeeds)
    .values({ feed, fetchedAt, data, failures: 0 })
    .onConflictDoUpdate({
      target: sbFeeds.feed,
      set: { fetchedAt, data, failures: 0 },
    });
  if (feed === "election")
    await recordElection(db, data as Election, fetchedAt);
  return { feed, ok: true };
}

let lastAlertAt = 0;

async function recordFailure(
  db: Database,
  feed: Feed,
  message: string,
  now: Date,
): Promise<void> {
  console.warn(`SkyBlock ${feed}:`, message);
  const [row] = await db
    .insert(sbFeeds)
    .values({ feed, failures: 1, lastError: message, lastErrorAt: now })
    .onConflictDoUpdate({
      target: sbFeeds.feed,
      set: {
        failures: sql`${sbFeeds.failures} + 1`,
        lastError: message,
        lastErrorAt: now,
      },
    })
    .returning({ failures: sbFeeds.failures });
  const failures = row?.failures ?? 1;
  if (
    failures >= FAILURES_TO_ALERT &&
    now.getTime() - lastAlertAt >= ALERT_GAP_MS
  ) {
    lastAlertAt = now.getTime();
    await alertAdmin(
      db,
      {
        kind: "skyblock-feeds",
        summary: `SkyBlock: the ${FEEDS[feed].label.toLowerCase()} feed hasn't loaded ${String(failures)} times in a row: ${message}`,
        path: "/admin/skyblock/",
      },
      now,
    );
  }
}

/**
 * The election's history: the round the mayor won, closed, with who won and the
 * minister; the running round with its votes so far, and its votes for this hour.
 */
export async function recordElection(
  db: Database,
  election: Election,
  now: Date,
): Promise<void> {
  const elected = election.elected;
  await db
    .insert(sbElections)
    .values({
      year: elected.year,
      candidates: elected.candidates,
      mayorKey: election.mayor.key,
      ministerKey: election.minister?.key ?? null,
      closed: true,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: sbElections.year,
      set: {
        candidates: elected.candidates,
        mayorKey: election.mayor.key,
        ministerKey: election.minister?.key ?? null,
        closed: true,
        updatedAt: now,
      },
    });
  const running = election.running;
  if (!running || running.year === elected.year) return;
  await db
    .insert(sbElections)
    .values({
      year: running.year,
      candidates: running.candidates,
      closed: false,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: sbElections.year,
      set: { candidates: running.candidates, updatedAt: now },
      // A closed round keeps its final count.
      setWhere: eq(sbElections.closed, false),
    });
  const votes = Object.fromEntries(
    running.candidates.map((candidate) => [candidate.key, candidate.votes]),
  );
  await db
    .insert(sbElectionVotes)
    .values({ year: running.year, hour: hourOf(now), votes })
    .onConflictDoUpdate({
      target: [sbElectionVotes.year, sbElectionVotes.hour],
      set: { votes },
    });
}

export interface LiveFeeds {
  election: Election | null;
  /** Only those still running or to come. */
  fireSales: FireSale[];
  bingo: Bingo | null;
  news: NewsItem[];
  /** Jacob's contests and their crops, when the crop calendar has loaded. */
  jacob: JacobSchedule | null;
  fetchedAt: Record<Feed, Date | null>;
}

let cached: { value: LiveFeeds; at: number } | null = null;

export function forgetFeeds(): void {
  cached = null;
}

/** What the feeds last said, from memory when fresh. */
export async function liveFeeds(
  db: Database,
  now = Date.now(),
): Promise<LiveFeeds> {
  if (cached && now - cached.at < CACHE_MS)
    return withoutEnded(cached.value, now);
  const rows = new Map(
    (await db.select().from(sbFeeds)).map((row) => [row.feed, row]),
  );
  // Written by refreshFeed from the readers' checked output.
  const data = (feed: Feed): unknown => rows.get(feed)?.data ?? null;
  const value: LiveFeeds = {
    election: data("election") as Election | null,
    fireSales: (data("firesales") as FireSale[] | null) ?? [],
    bingo: data("bingo") as Bingo | null,
    news: (data("news") as NewsItem[] | null) ?? [],
    jacob: data("jacob") as JacobSchedule | null,
    fetchedAt: Object.fromEntries(
      FEED_NAMES.map((feed) => [feed, rows.get(feed)?.fetchedAt ?? null]),
    ) as Record<Feed, Date | null>,
  };
  cached = { value, at: now };
  return withoutEnded(value, now);
}

function withoutEnded(value: LiveFeeds, now: number): LiveFeeds {
  return {
    ...value,
    fireSales: value.fireSales.filter((sale) => sale.end > now),
  };
}

export interface FeedStatus {
  feed: Feed;
  label: string;
  fetchedAt: Date | null;
  failures: number;
  lastError: string | null;
  lastErrorAt: Date | null;
}

/** Each feed's last fetch and failures, for the admin page. */
export async function feedStatus(db: Database): Promise<FeedStatus[]> {
  const rows = new Map(
    (await db.select().from(sbFeeds)).map((row) => [row.feed, row]),
  );
  return FEED_NAMES.map((feed) => {
    const row = rows.get(feed);
    return {
      feed,
      label: FEEDS[feed].label,
      fetchedAt: row?.fetchedAt ?? null,
      failures: row?.failures ?? 0,
      lastError: row?.lastError ?? null,
      lastErrorAt: row?.lastErrorAt ?? null,
    };
  });
}

let running: Promise<unknown> | null = null;
let lastStart = 0;
let ticking = false;

/** A pass if one may be due (never with SKYBLOCK_FEEDS=off), at most every minute. */
export function feedsInBackground(
  getDb: () => Promise<Database>,
  now = Date.now(),
): void {
  if (running || !hypixelBase() || now - lastStart < MINUTE_MS) return;
  lastStart = now;
  running = getDb()
    .then((db) => refreshFeeds(db))
    .catch((error: unknown) => {
      console.warn("SkyBlock feeds failed:", error);
    })
    .finally(() => {
      running = null;
    });
}

/** Checks every minute from the first server-rendered request (like the other timers). */
export function startSkyblockFeeds(getDb: () => Promise<Database>): void {
  if (ticking || !hypixelBase()) return;
  ticking = true;
  const tick = () => {
    feedsInBackground(getDb);
  };
  setTimeout(tick, 5000).unref();
  setInterval(tick, MINUTE_MS).unref();
}
