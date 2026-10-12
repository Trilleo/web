/**
 * Watchlists: someone watches a page (by key) or a whole wiki (an empty key). Pages
 * people edit or propose changes to are watched for them. Changes to what they watch
 * show on /-/watchlist and, at most once a day, in a digest email (`sendWikiDigests`,
 * from the mail delivery pass).
 */
import {
  users,
  wikiDigests,
  wikiMembers,
  wikiPages,
  wikiRevisions,
  wikiWatches,
  wikis,
  type Database,
  type User,
} from "@trilleo/db";
import type { EmailBlock } from "@trilleo/mail";
import {
  and,
  desc,
  eq,
  exists,
  gt,
  inArray,
  isNull,
  lt,
  ne,
  or,
  sql,
} from "drizzle-orm";
import { isAdmin } from "../auth/guard";
import { notifyUser } from "../mail/notify";
import { WIKI_URL } from "./host";
import { normalizeTitle } from "./titles";
import { toolHref, wikiHref } from "./wikis";

type Tx = Parameters<Parameters<Database["transaction"]>[0]>[0];
type Db = Database | Tx;

/** The key that stands for the whole wiki. */
export const WHOLE_WIKI = "";

export const WATCH_LIMITS = {
  /** Watches per account. */
  max: 1000,
} as const;

export const DIGEST = {
  /** At most one digest per this long (a day, give or take the hourly check). */
  gapMs: 23 * 60 * 60 * 1000,
  /** The first digest, or one after a quiet spell, looks back at most this far. */
  lookbackMs: 7 * 24 * 60 * 60 * 1000,
  /** The first digest covers the last day. */
  firstMs: 24 * 60 * 60 * 1000,
  /** Pages listed in one email. */
  maxPages: 50,
} as const;

export async function watch(
  db: Db,
  userId: string,
  wikiId: number,
  pageKey: string,
  now = new Date(),
): Promise<boolean> {
  const [{ total } = { total: 0 }] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(wikiWatches)
    .where(eq(wikiWatches.userId, userId));
  if (total >= WATCH_LIMITS.max) return false;
  await db
    .insert(wikiWatches)
    .values({ userId, wikiId, pageKey, createdAt: now })
    .onConflictDoNothing();
  return true;
}

export async function unwatch(
  db: Db,
  userId: string,
  wikiId: number,
  pageKey: string,
): Promise<void> {
  await db
    .delete(wikiWatches)
    .where(
      and(
        eq(wikiWatches.userId, userId),
        eq(wikiWatches.wikiId, wikiId),
        eq(wikiWatches.pageKey, pageKey),
      ),
    );
}

/** Whether someone watches this page, and whether they watch its whole wiki. */
export async function watching(
  db: Database,
  userId: string,
  wikiId: number,
  pageKey: string,
): Promise<{ page: boolean; wiki: boolean }> {
  const rows = await db
    .select({ pageKey: wikiWatches.pageKey })
    .from(wikiWatches)
    .where(
      and(
        eq(wikiWatches.userId, userId),
        eq(wikiWatches.wikiId, wikiId),
        inArray(wikiWatches.pageKey, [pageKey, WHOLE_WIKI]),
      ),
    );
  const keys = new Set(rows.map((row) => row.pageKey));
  return {
    page: pageKey !== WHOLE_WIKI && keys.has(pageKey),
    wiki: keys.has(WHOLE_WIKI),
  };
}

/** A page was renamed: its watchers follow it. */
export async function moveWatches(
  db: Db,
  wikiId: number,
  fromKey: string,
  toKey: string,
): Promise<void> {
  if (fromKey === toKey) return;
  const watchers = await db
    .select({ userId: wikiWatches.userId, createdAt: wikiWatches.createdAt })
    .from(wikiWatches)
    .where(
      and(eq(wikiWatches.wikiId, wikiId), eq(wikiWatches.pageKey, fromKey)),
    );
  if (watchers.length === 0) return;
  await db
    .insert(wikiWatches)
    .values(watchers.map((row) => ({ ...row, wikiId, pageKey: toKey })))
    .onConflictDoNothing();
  await db
    .delete(wikiWatches)
    .where(
      and(eq(wikiWatches.wikiId, wikiId), eq(wikiWatches.pageKey, fromKey)),
    );
}

export interface WatchRow {
  wiki: string;
  wikiName: string;
  /** Null for the whole wiki. */
  title: string | null;
  pageKey: string;
  createdAt: Date;
}

/** Everything someone watches, by wiki (the whole wiki first), then title. */
export async function listWatches(
  db: Database,
  userId: string,
): Promise<WatchRow[]> {
  const rows = await db
    .select({
      wiki: wikis.slug,
      wikiId: wikis.id,
      wikiName: wikis.name,
      pageKey: wikiWatches.pageKey,
      title: wikiPages.title,
      createdAt: wikiWatches.createdAt,
    })
    .from(wikiWatches)
    .innerJoin(wikis, eq(wikis.id, wikiWatches.wikiId))
    .leftJoin(
      wikiPages,
      and(
        eq(wikiPages.wikiId, wikiWatches.wikiId),
        eq(wikiPages.key, wikiWatches.pageKey),
      ),
    )
    .where(eq(wikiWatches.userId, userId));
  return rows
    .map((row) => ({
      wiki: row.wiki,
      wikiName: row.wikiName,
      pageKey: row.pageKey,
      createdAt: row.createdAt,
      // A page nobody has written yet (or a generated one) shows by its key.
      title:
        row.pageKey === WHOLE_WIKI
          ? null
          : (row.title ?? normalizeTitle(row.pageKey) ?? row.pageKey),
    }))
    .sort(
      (a, b) =>
        a.wikiName.localeCompare(b.wikiName, "en") ||
        (a.title === null ? -1 : b.title === null ? 1 : 0) ||
        (a.title ?? "").localeCompare(b.title ?? "", "en"),
    );
}

export interface WatchedChange {
  wiki: string;
  wikiName: string;
  title: string;
  revisionId: number;
  summary: string;
  minor: boolean;
  createdAt: Date;
  author: string | null;
}

/**
 * Edits to what someone watches since they started watching, newest first: never
 * their own, and only in wikis they can still read (a private wiki stops showing once they leave it).
 */
export async function watchedChanges(
  db: Database,
  user: Pick<User, "id" | "email" | "githubId">,
  options: { since?: Date; limit?: number } = {},
): Promise<WatchedChange[]> {
  const watched = exists(
    db
      .select({ one: sql`1` })
      .from(wikiWatches)
      .where(
        and(
          eq(wikiWatches.userId, user.id),
          eq(wikiWatches.wikiId, wikiRevisions.wikiId),
          // Only what changed after they started watching.
          lt(wikiWatches.createdAt, wikiRevisions.createdAt),
          or(
            eq(wikiWatches.pageKey, WHOLE_WIKI),
            eq(wikiWatches.pageKey, wikiPages.key),
          ),
        ),
      ),
  );
  const readable = isAdmin(user)
    ? undefined
    : or(
        ne(wikis.visibility, "private"),
        exists(
          db
            .select({ one: sql`1` })
            .from(wikiMembers)
            .where(
              and(
                eq(wikiMembers.wikiId, wikis.id),
                eq(wikiMembers.userId, user.id),
              ),
            ),
        ),
      );
  return db
    .select({
      wiki: wikis.slug,
      wikiName: wikis.name,
      title: wikiPages.title,
      revisionId: wikiRevisions.id,
      summary: wikiRevisions.summary,
      minor: wikiRevisions.minor,
      createdAt: wikiRevisions.createdAt,
      author: users.username,
    })
    .from(wikiRevisions)
    .innerJoin(wikiPages, eq(wikiPages.id, wikiRevisions.pageId))
    .innerJoin(wikis, eq(wikis.id, wikiRevisions.wikiId))
    .leftJoin(users, eq(users.id, wikiRevisions.authorId))
    .where(
      and(
        watched,
        readable,
        or(isNull(wikiRevisions.authorId), ne(wikiRevisions.authorId, user.id)),
        options.since ? gt(wikiRevisions.createdAt, options.since) : undefined,
      ),
    )
    .orderBy(desc(wikiRevisions.id))
    .limit(options.limit ?? 200);
}

interface PageEntry {
  title: string;
  edits: number;
  authors: Set<string>;
}

/** The digest's text: one list per wiki, a line per page. */
export function digestBlocks(changes: readonly WatchedChange[]): {
  blocks: EmailBlock[];
  pages: number;
} {
  const byWiki = new Map<
    string,
    { name: string; pages: Map<string, PageEntry> }
  >();
  for (const change of changes) {
    const wiki = byWiki.get(change.wiki) ?? {
      name: change.wikiName,
      pages: new Map<string, PageEntry>(),
    };
    byWiki.set(change.wiki, wiki);
    const page: PageEntry = wiki.pages.get(change.title) ?? {
      title: change.title,
      edits: 0,
      authors: new Set<string>(),
    };
    wiki.pages.set(change.title, page);
    page.edits += 1;
    page.authors.add(change.author ? `@${change.author}` : "someone");
  }
  const blocks: EmailBlock[] = [];
  let pages = 0;
  for (const [slug, wiki] of byWiki) {
    if (pages >= DIGEST.maxPages) break;
    const items = [...wiki.pages.values()]
      .slice(0, DIGEST.maxPages - pages)
      .map((page) => ({
        text: `${page.title}: ${page.edits === 1 ? "an edit" : `${String(page.edits)} edits`} by ${[...page.authors].join(", ")}`,
        href: `${WIKI_URL}${toolHref({ slug }, "history", page.title)}`,
      }));
    pages += items.length;
    blocks.push(
      { type: "text", text: `${wiki.name}:` },
      { type: "list", items },
    );
  }
  return { blocks, pages };
}

/**
 * Sends the watchlist digests that are due: one email per person whose last one went
 * out more than DIGEST.gapMs ago and whose watched pages changed since (by others).
 * Nothing changed, nothing sent. Returns how many were queued.
 */
export async function sendWikiDigests(
  db: Database,
  now = new Date(),
): Promise<number> {
  const due = await db
    .selectDistinct({ userId: wikiWatches.userId, sentAt: wikiDigests.sentAt })
    .from(wikiWatches)
    .leftJoin(wikiDigests, eq(wikiDigests.userId, wikiWatches.userId))
    .where(
      or(
        isNull(wikiDigests.sentAt),
        lt(wikiDigests.sentAt, new Date(now.getTime() - DIGEST.gapMs)),
      ),
    );
  let sent = 0;
  for (const { userId, sentAt } of due) {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    if (!user) continue;
    const floor = now.getTime() - DIGEST.lookbackMs;
    const since = new Date(
      Math.max(sentAt?.getTime() ?? now.getTime() - DIGEST.firstMs, floor),
    );
    const changes = await watchedChanges(db, user, { since, limit: 500 });
    if (changes.length === 0) continue;
    const { blocks, pages } = digestBlocks(changes);
    const queued = await notifyUser(
      db,
      user,
      "wiki-digest",
      {
        subject:
          pages === 1
            ? "A page you watch changed"
            : `${String(pages)} pages you watch changed`,
        body: {
          label: "Wiki",
          title: "Your watchlist",
          preheader: `Changes since ${since.toUTCString()}`,
          blocks: [
            {
              type: "text",
              text: "Pages you watch were edited by others since your last digest:",
            },
            ...blocks,
            {
              type: "button",
              label: "Open your watchlist",
              href: `${WIKI_URL}/-/watchlist`,
            },
          ],
        },
        ref: `wiki-digest:${user.id}`,
      },
      now,
    );
    await db
      .insert(wikiDigests)
      .values({ userId, sentAt: now })
      .onConflictDoUpdate({ target: wikiDigests.userId, set: { sentAt: now } });
    if (queued) sent += 1;
  }
  return sent;
}

/** For the account export. */
export async function watchExport(db: Database, userId: string) {
  return (await listWatches(db, userId)).map((row) => ({
    wiki: row.wiki,
    page: row.title,
    since: row.createdAt,
  }));
}

/** The address of a watched page, for lists. */
export function watchHref(row: Pick<WatchRow, "wiki" | "title">): string {
  return row.title === null
    ? wikiHref({ slug: row.wiki })
    : wikiHref({ slug: row.wiki }, row.title);
}
