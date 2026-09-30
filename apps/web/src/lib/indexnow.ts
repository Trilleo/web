/**
 * IndexNow (https://www.indexnow.org): tells Bing, Yandex, Seznam and others the
 * moment a post's address changes, instead of waiting for them to recrawl. Google
 * doesn't take part; it reads the sitemaps.
 *
 * The key (INDEXNOW_KEY) is published at /<key>.txt, which proves the pings come
 * from the site's owner. Without a key nothing is sent, so dev and e2e stay quiet.
 * Pings never hold up a request and failures are only logged: a post that wasn't
 * announced is tried again on the next chance (see announcePosts).
 */
import { posts, type Database } from "@trilleo/db";
import { and, eq, inArray, isNull, lt, lte, or } from "drizzle-orm";
import { postHref } from "./posts";
import { SITE_URL } from "./site";

export const INDEXNOW_ENDPOINT = "https://api.indexnow.org/indexnow";

/** What IndexNow accepts as a key: 8–128 letters, digits and dashes. */
const KEY_PATTERN = /^[A-Za-z0-9-]{8,128}$/;

/** The configured key, or undefined when IndexNow is off (or the key is invalid). */
export function indexNowKey(
  env: Record<string, string | undefined> = process.env,
): string | undefined {
  const key = env.INDEXNOW_KEY?.trim();
  return key && KEY_PATTERN.test(key) ? key : undefined;
}

export interface IndexNowOptions {
  key: string;
  /** For tests. */
  fetch?: typeof fetch;
  site?: string;
}

/** Sends addresses (paths or absolute URLs on this site). Returns whether it worked. */
export async function submitUrls(
  paths: readonly string[],
  { key, fetch: send = fetch, site = SITE_URL }: IndexNowOptions,
): Promise<boolean> {
  const urls = [...new Set(paths.map((path) => new URL(path, site).href))];
  if (urls.length === 0) return true;
  const origin = new URL(site);
  try {
    const response = await send(INDEXNOW_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({
        host: origin.host,
        key,
        keyLocation: new URL(`/${key}.txt`, origin).href,
        urlList: urls,
      }),
      signal: AbortSignal.timeout(10_000),
    });
    // 200 and 202 (accepted, key check pending) are both fine.
    if (response.ok) return true;
    console.warn(`IndexNow refused the ping: ${String(response.status)}`);
    return false;
  } catch (error) {
    console.warn("IndexNow ping failed:", error);
    return false;
  }
}

/**
 * Announces public posts saved (or gone live) since they were last announced, plus
 * any `extra` addresses (a post's old address, or one that went offline), and marks
 * the posts done. Scheduled posts are picked up here once their time has come.
 */
export async function announcePosts(
  db: Database,
  options: IndexNowOptions & { extra?: readonly string[]; now?: Date },
): Promise<boolean> {
  const now = options.now ?? new Date();
  const pending = await db
    .select({ id: posts.id, slug: posts.slug })
    .from(posts)
    .where(
      and(
        eq(posts.status, "published"),
        lte(posts.publishedAt, now),
        or(
          isNull(posts.indexNowAt),
          lt(posts.indexNowAt, posts.savedAt),
          lt(posts.indexNowAt, posts.publishedAt),
        ),
      ),
    );
  const extra = options.extra ?? [];
  if (pending.length === 0 && extra.length === 0) return true;

  // The index lists every post, so it changes with them.
  const paths = [
    ...pending.map((post) => postHref(post.slug)),
    ...extra,
    "/writing/",
  ];
  const sent = await submitUrls(paths, options);
  if (sent && pending.length > 0) {
    await db
      .update(posts)
      .set({ indexNowAt: now })
      .where(
        inArray(
          posts.id,
          pending.map((post) => post.id),
        ),
      );
  }
  return sent;
}

/** How often requests may look for posts to announce (scheduled ones going live). */
export const CHECK_INTERVAL_MS = 10 * 60_000;

let lastCheck = 0;
let running: Promise<unknown> | undefined;

/**
 * Announces in the background, if IndexNow is configured. With `extra` (after an
 * edit), it runs at once; without, at most every CHECK_INTERVAL_MS, so any request
 * can call it cheaply to catch scheduled posts.
 */
export function announceInBackground(
  getDb: () => Promise<Database>,
  extra?: readonly string[],
): void {
  const key = indexNowKey();
  if (!key) return;
  const now = Date.now();
  if (!extra && (running || now - lastCheck < CHECK_INTERVAL_MS)) return;
  lastCheck = now;
  const previous = running ?? Promise.resolve();
  // One at a time, so two edits can't announce (and mark) the same post twice.
  const task = previous
    .then(async () => announcePosts(await getDb(), { key, extra }))
    .catch((error: unknown) => {
      console.warn("IndexNow announcement failed:", error);
    })
    .finally(() => {
      if (running === task) running = undefined;
    });
  running = task;
}
