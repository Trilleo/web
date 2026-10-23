/**
 * Running webhooks in this server, like mail delivery: no job runner. A pass queues
 * the events that are due (each day's `cryptic.day`, posts that went public) and
 * sends what's queued. Passes start from a timer every minute and just after each UTC
 * midnight, and at once when something is queued by hand (a test, a redelivery), so
 * they don't wait for visitors. Never throws, never makes a request wait.
 */
import { posts, type Database } from "@trilleo/db";
import { addDays, dayOf } from "@trilleo/cryptic";
import { and, eq, gte, lte } from "drizzle-orm";
import { puzzleNumber, puzzleOn, publicPuzzle } from "../../cryptic/puzzles";
import { postHref } from "../../posts";
import { describe } from "../../seo";
import { SITE_URL } from "../../site";
import { deliverDue, type Send } from "./deliver";
import { anyListening, emit, purgeDeliveries } from "./store";

const DAY_MS = 24 * 60 * 60 * 1000;
const PASS_INTERVAL_MS = 60 * 1000;
const PURGE_INTERVAL_MS = 60 * 60 * 1000;
/** After midnight, so "today" is surely the new day everywhere. */
const MIDNIGHT_DELAY_MS = 5 * 1000;

async function publicOn(db: Database, day: string, today: string) {
  const puzzle = await puzzleOn(db, day);
  if (!puzzle?.day) return null;
  const withDay = { ...puzzle, day: puzzle.day };
  return publicPuzzle(withDay, await puzzleNumber(db, puzzle.day), today);
}

/** Today's `cryptic.day` (queued once per webhook, whenever a pass first sees the day). */
export async function emitCrypticDay(db: Database, now: Date): Promise<number> {
  const today = dayOf(now);
  return emit(
    db,
    "cryptic.day",
    `cryptic.day:${today}`,
    {
      date: today,
      today: await publicOn(db, today, today),
      yesterday: await publicOn(db, addDays(today, -1), today),
    },
    now,
  );
}

/** `post.published` for posts that went public in the last day (once each). */
export async function emitPublishedPosts(
  db: Database,
  now: Date,
): Promise<number> {
  const rows = await db
    .select()
    .from(posts)
    .where(
      and(
        eq(posts.status, "published"),
        lte(posts.publishedAt, now),
        gte(posts.publishedAt, new Date(now.getTime() - DAY_MS)),
      ),
    );
  let queued = 0;
  for (const post of rows) {
    queued += await emit(
      db,
      "post.published",
      `post.published:${String(post.id)}`,
      {
        post: {
          slug: post.slug,
          title: post.title,
          description: describe(post.description, post.html),
          url: new URL(postHref(post.slug), SITE_URL).href,
          tags: post.tags,
          publishedAt: (post.publishedAt ?? now).toISOString(),
        },
      },
      now,
    );
  }
  return queued;
}

let lastPurge = 0;

/** Queues what's due and sends what's queued. */
export async function webhookPass(
  db: Database,
  send: Send,
  now = new Date(),
): Promise<void> {
  if (await anyListening(db)) {
    await emitCrypticDay(db, now);
    await emitPublishedPosts(db, now);
  }
  await deliverDue(db, send, now);
  if (now.getTime() - lastPurge > PURGE_INTERVAL_MS) {
    lastPurge = now.getTime();
    await purgeDeliveries(db, now);
  }
}

let getDatabase: (() => Promise<Database>) | null = null;
let running = false;
let again = false;

function start(): void {
  if (!getDatabase) return;
  if (running) {
    again = true;
    return;
  }
  running = true;
  void getDatabase()
    .then((db) => webhookPass(db, fetch))
    .catch((error: unknown) => {
      console.warn("Webhooks failed:", error);
    })
    .finally(() => {
      running = false;
      if (again) {
        again = false;
        start();
      }
    });
}

/** After queuing something by hand: send it now. */
export function kickWebhooks(): void {
  start();
}

function scheduleMidnight(): void {
  const now = Date.now();
  const next = Math.ceil((now + 1) / DAY_MS) * DAY_MS + MIDNIGHT_DELAY_MS;
  const timer = setTimeout(() => {
    start();
    scheduleMidnight();
  }, next - now);
  // A timer alone doesn't keep the server running (or a test).
  timer.unref();
}

/** Hooks webhooks to this server: a pass every minute and at every UTC midnight. */
export function startWebhooks(getDb: () => Promise<Database>): void {
  if (getDatabase) return;
  getDatabase = getDb;
  scheduleMidnight();
  setInterval(start, PASS_INTERVAL_MS).unref();
}
