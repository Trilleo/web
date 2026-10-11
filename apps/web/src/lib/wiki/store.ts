/**
 * Wikis, pages and revisions in the database. Pages are found by key (titles.ts);
 * saving writes a new revision, renders it, and records its links and categories.
 * Deleting is soft: the history stays and the page can be restored.
 */
import {
  users,
  wikiCategories,
  wikiLinks,
  wikiLog,
  wikiMembers,
  wikiPages,
  wikiRevisions,
  wikis,
  type Database,
  type User,
  type Wiki,
  type WikiLogEntry,
  type WikiPage,
  type WikiRevision,
  type WikiRole,
} from "@trilleo/db";
import {
  and,
  asc,
  count,
  desc,
  eq,
  inArray,
  isNull,
  lt,
  or,
  sql,
} from "drizzle-orm";
import { effectiveSets } from "@trilleo/wiki";
import { normalizeUsername } from "../auth/usernames";
import { generatedPages } from "./generated";
import { itemLookup, recordItem } from "./items";
import {
  WIKI_RENDER_VERSION,
  parseRedirect,
  renderWikiPage,
  snippet,
} from "./render";
import { namespaceOf, titleKey } from "./titles";

type Tx = Parameters<Parameters<Database["transaction"]>[0]>[0];

/** What most of this module needs of a wiki: where it is, and how it renders. */
export type WikiRef = Pick<Wiki, "id" | "slug" | "source" | "componentSets">;
type Db = Database | Tx;

export const PAGE_LIMITS = {
  /** Characters of Markdown. */
  body: 200_000,
  summary: 300,
} as const;

// Wikis -----------------------------------------------------------------------

export async function getWiki(db: Db, slug: string): Promise<Wiki | undefined> {
  const [wiki] = await db
    .select()
    .from(wikis)
    .where(eq(wikis.slug, slug))
    .limit(1);
  return wiki;
}

export async function roleIn(
  db: Db,
  wikiId: number,
  userId: string | undefined,
): Promise<WikiRole | null> {
  if (!userId) return null;
  const [row] = await db
    .select({ role: wikiMembers.role })
    .from(wikiMembers)
    .where(and(eq(wikiMembers.wikiId, wikiId), eq(wikiMembers.userId, userId)))
    .limit(1);
  return row?.role ?? null;
}

export interface WikiSummary {
  wiki: Wiki;
  role: WikiRole | null;
  pages: number;
}

/**
 * The wikis someone can see listed: public ones, plus the ones they belong to (the
 * admin sees all). Unlisted and private wikis never show to anyone else.
 */
export async function listWikis(
  db: Database,
  userId: string | null,
  admin: boolean,
): Promise<WikiSummary[]> {
  const rows = await db
    .select({ wiki: wikis, role: wikiMembers.role })
    .from(wikis)
    .leftJoin(
      wikiMembers,
      and(
        eq(wikiMembers.wikiId, wikis.id),
        eq(wikiMembers.userId, userId ?? sql`null`),
      ),
    )
    .orderBy(asc(wikis.name));
  const visible = rows.filter(
    (row) => admin || row.role !== null || row.wiki.visibility === "public",
  );
  if (visible.length === 0) return [];
  const counts = await db
    .select({ wikiId: wikiPages.wikiId, pages: count() })
    .from(wikiPages)
    .where(
      and(
        inArray(
          wikiPages.wikiId,
          visible.map((row) => row.wiki.id),
        ),
        isNull(wikiPages.deletedAt),
        isNull(wikiPages.redirectTo),
      ),
    )
    .groupBy(wikiPages.wikiId);
  const byWiki = new Map(counts.map((row) => [row.wikiId, row.pages]));
  const summaries: WikiSummary[] = [];
  for (const row of visible) {
    const generated = await generatedPages(row.wiki);
    summaries.push({
      wiki: row.wiki,
      role: row.role,
      pages: (byWiki.get(row.wiki.id) ?? 0) + (generated?.pages.size ?? 0),
    });
  }
  return summaries;
}

export type WikiInput = Pick<
  Wiki,
  | "slug"
  | "name"
  | "code"
  | "description"
  | "kind"
  | "visibility"
  | "homeTitle"
  | "nav"
> & {
  /** Component sets; the ones every wiki has are added anyway (core when left out). */
  componentSets?: string[];
};

/** The sets as stored: known ones, plus those every wiki has, in a stable order. */
function storedSets(sets: readonly string[] | undefined): string[] {
  return [...effectiveSets(sets ?? [])].sort();
}

async function log(
  db: Db,
  wikiId: number,
  actor: User | null,
  action: WikiLogEntry["action"],
  entry: { title?: string; detail?: string; now?: Date } = {},
): Promise<void> {
  await db.insert(wikiLog).values({
    wikiId,
    actorId: actor?.id ?? null,
    action,
    title: entry.title ?? null,
    detail: entry.detail ?? "",
    createdAt: entry.now ?? new Date(),
  });
}

export async function createWiki(
  db: Database,
  actor: User | null,
  input: WikiInput & { source?: string | null },
  now = new Date(),
): Promise<{ ok: true; wiki: Wiki } | { ok: false; error: "taken" }> {
  return db.transaction(async (tx) => {
    if (await getWiki(tx, input.slug)) return { ok: false, error: "taken" };
    const [wiki] = await tx
      .insert(wikis)
      .values({
        slug: input.slug,
        name: input.name,
        code: input.code,
        description: input.description,
        kind: input.kind,
        visibility: input.visibility,
        homeTitle: input.homeTitle,
        nav: input.nav,
        componentSets: storedSets(input.componentSets),
        source: input.source ?? null,
        createdAt: now,
        updatedAt: now,
      })
      .returning();
    if (!wiki) throw new Error("Creating the wiki returned nothing");
    await log(tx, wiki.id, actor, "create-wiki", { detail: wiki.name, now });
    return { ok: true, wiki };
  });
}

/** What settings can change; the address (slug) never does. */
const EDITABLE = [
  "name",
  "code",
  "description",
  "kind",
  "visibility",
  "homeTitle",
  "nav",
  "componentSets",
] as const satisfies readonly (keyof WikiInput)[];

export async function updateWiki(
  db: Database,
  wiki: Wiki,
  actor: User,
  input: Omit<WikiInput, "slug">,
  now = new Date(),
): Promise<Wiki> {
  const componentSets = storedSets(input.componentSets ?? wiki.componentSets);
  const [updated] = await db
    .update(wikis)
    .set({
      name: input.name,
      code: input.code,
      description: input.description,
      kind: input.kind,
      visibility: input.visibility,
      homeTitle: input.homeTitle,
      nav: input.nav,
      componentSets,
      updatedAt: now,
    })
    .where(eq(wikis.id, wiki.id))
    .returning();
  if (!updated) throw new Error("Updating the wiki returned nothing");
  const changed = EDITABLE.filter((key) =>
    key === "componentSets"
      ? JSON.stringify(componentSets) !== JSON.stringify(wiki.componentSets)
      : JSON.stringify(input[key]) !== JSON.stringify(wiki[key]),
  );
  // Pages render again (when next read) with the components they may now use.
  if (changed.includes("componentSets"))
    await db
      .update(wikiPages)
      .set({ renderVersion: 0 })
      .where(eq(wikiPages.wikiId, wiki.id));
  if (changed.length > 0)
    await log(db, wiki.id, actor, "settings", {
      detail: changed.join(", "),
      now,
    });
  return updated;
}

// Members ---------------------------------------------------------------------

export interface WikiMemberRow {
  userId: string;
  username: string;
  role: WikiRole;
  addedAt: Date;
}

export async function listMembers(
  db: Database,
  wikiId: number,
): Promise<WikiMemberRow[]> {
  return db
    .select({
      userId: wikiMembers.userId,
      username: users.username,
      role: wikiMembers.role,
      addedAt: wikiMembers.addedAt,
    })
    .from(wikiMembers)
    .innerJoin(users, eq(users.id, wikiMembers.userId))
    .where(eq(wikiMembers.wikiId, wikiId))
    .orderBy(asc(wikiMembers.role), asc(users.username));
}

export type MemberResult =
  { ok: true; username: string } | { ok: false; error: "no-user" | "blocked" };

/** Adds someone by username, or changes their role. */
export async function setMember(
  db: Database,
  wiki: Wiki,
  actor: User,
  usernameInput: string,
  role: WikiRole,
  now = new Date(),
): Promise<MemberResult> {
  const username = normalizeUsername(usernameInput);
  const [user] = await db
    .select({
      id: users.id,
      username: users.username,
      blockedAt: users.blockedAt,
    })
    .from(users)
    .where(eq(users.username, username))
    .limit(1);
  if (!user) return { ok: false, error: "no-user" };
  if (user.blockedAt) return { ok: false, error: "blocked" };
  const before = await roleIn(db, wiki.id, user.id);
  if (before === role) return { ok: true, username: user.username };
  await db
    .insert(wikiMembers)
    .values({ wikiId: wiki.id, userId: user.id, role, addedAt: now })
    .onConflictDoUpdate({
      target: [wikiMembers.wikiId, wikiMembers.userId],
      set: { role },
    });
  await log(db, wiki.id, actor, before ? "member-changed" : "member-added", {
    detail: `@${user.username}: ${role}`,
    now,
  });
  return { ok: true, username: user.username };
}

export async function removeMember(
  db: Database,
  wiki: Wiki,
  actor: User,
  userId: string,
  now = new Date(),
): Promise<void> {
  const [removed] = await db
    .delete(wikiMembers)
    .where(and(eq(wikiMembers.wikiId, wiki.id), eq(wikiMembers.userId, userId)))
    .returning({ userId: wikiMembers.userId });
  if (!removed) return;
  const [user] = await db
    .select({ username: users.username })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  await log(db, wiki.id, actor, "member-removed", {
    detail: user ? `@${user.username}` : "",
    now,
  });
}

// Pages -----------------------------------------------------------------------

export async function findPage(
  db: Db,
  wikiId: number,
  key: string,
): Promise<WikiPage | undefined> {
  const [page] = await db
    .select()
    .from(wikiPages)
    .where(and(eq(wikiPages.wikiId, wikiId), eq(wikiPages.key, key)))
    .limit(1);
  return page;
}

export async function getRevision(
  db: Db,
  wikiId: number,
  id: number,
): Promise<WikiRevision | undefined> {
  const [revision] = await db
    .select()
    .from(wikiRevisions)
    .where(and(eq(wikiRevisions.wikiId, wikiId), eq(wikiRevisions.id, id)))
    .limit(1);
  return revision;
}

/** The revision before this one on its page, if any. */
export async function previousRevision(
  db: Db,
  revision: Pick<WikiRevision, "id" | "pageId">,
): Promise<WikiRevision | undefined> {
  const [previous] = await db
    .select()
    .from(wikiRevisions)
    .where(
      and(
        eq(wikiRevisions.pageId, revision.pageId),
        lt(wikiRevisions.id, revision.id),
      ),
    )
    .orderBy(desc(wikiRevisions.id))
    .limit(1);
  return previous;
}

async function replaceLinks(
  db: Db,
  page: Pick<WikiPage, "id" | "wikiId" | "key" | "title">,
  rendered: Awaited<ReturnType<typeof renderWikiPage>>,
): Promise<void> {
  // Only Item: pages describe items.
  await recordItem(
    db,
    page,
    namespaceOf(page.title) === "item" ? rendered.item : null,
  );
  await db.delete(wikiLinks).where(eq(wikiLinks.pageId, page.id));
  await db.delete(wikiCategories).where(eq(wikiCategories.pageId, page.id));
  if (rendered.links.length > 0)
    await db.insert(wikiLinks).values(
      rendered.links.map((link) => ({
        pageId: page.id,
        wikiId: page.wikiId,
        targetKey: link.key,
        targetTitle: link.title,
      })),
    );
  if (rendered.categories.length > 0)
    await db.insert(wikiCategories).values(
      rendered.categories.map((title) => ({
        pageId: page.id,
        wikiId: page.wikiId,
        categoryKey: titleKey(title),
        categoryTitle: title,
      })),
    );
}

/** Renders the page again if an older renderer wrote its HTML. */
export async function ensurePageRendered(
  db: Database,
  wiki: WikiRef,
  page: WikiPage,
): Promise<WikiPage> {
  if (page.renderVersion >= WIKI_RENDER_VERSION || page.revisionId === null)
    return page;
  const [revision] = await db
    .select({ body: wikiRevisions.body })
    .from(wikiRevisions)
    .where(eq(wikiRevisions.id, page.revisionId))
    .limit(1);
  if (!revision) return page;
  const rendered = await renderWikiPage(revision.body, {
    slug: wiki.slug,
    title: page.title,
    componentSets: wiki.componentSets,
    items: await itemLookup(db, wiki),
  });
  const changes = {
    html: rendered.html,
    toc: rendered.toc,
    plain: rendered.plain,
    renderVersion: WIKI_RENDER_VERSION,
  };
  await db.transaction(async (tx) => {
    await tx.update(wikiPages).set(changes).where(eq(wikiPages.id, page.id));
    if (!page.deletedAt) await replaceLinks(tx, page, rendered);
  });
  return { ...page, ...changes };
}

export type SaveResult =
  | { ok: true; page: WikiPage; revision: WikiRevision; created: boolean }
  | { ok: false; error: "conflict"; current: WikiRevision }
  | { ok: false; error: "unchanged" | "generated" | "too-long" | "protected" };

export interface SaveInput {
  wiki: WikiRef;
  /** Null for built-in pages (seed.ts). */
  actor: User | null;
  title: string;
  body: string;
  summary: string;
  minor: boolean;
  /** The revision the edit started from; null for a new page. */
  baseRevisionId: number | null;
  /** Whether the editor may change protected pages (an owner). */
  canEditProtected: boolean;
  now?: Date;
}

/**
 * Saves a new revision. Refused when someone else saved since the editor opened it
 * (`conflict`, with the current text, so nothing typed is lost), when nothing
 * changed, or when the title belongs to a generated page.
 */
export async function savePage(
  db: Database,
  input: SaveInput,
): Promise<SaveResult> {
  const now = input.now ?? new Date();
  const body = input.body.replace(/\r\n?/g, "\n");
  if (body.length > PAGE_LIMITS.body) return { ok: false, error: "too-long" };
  const key = titleKey(input.title);
  const generated = await generatedPages(input.wiki);
  if (generated?.pages.has(key)) return { ok: false, error: "generated" };
  const rendered = await renderWikiPage(body, {
    slug: input.wiki.slug,
    title: input.title,
    componentSets: input.wiki.componentSets,
    items: await itemLookup(db, input.wiki),
  });

  return db.transaction(async (tx): Promise<SaveResult> => {
    let [page] = await tx
      .select()
      .from(wikiPages)
      .where(and(eq(wikiPages.wikiId, input.wiki.id), eq(wikiPages.key, key)))
      .for("update");
    if (page?.protection === "owners" && !input.canEditProtected)
      return { ok: false, error: "protected" };
    const created = page?.deletedAt !== null;
    if (page && page.revisionId !== null) {
      const current = await getRevision(tx, input.wiki.id, page.revisionId);
      if (!page.deletedAt && current) {
        if (page.revisionId !== input.baseRevisionId)
          return { ok: false, error: "conflict", current };
        if (current.body === body) return { ok: false, error: "unchanged" };
      }
    }
    if (!page) {
      [page] = await tx
        .insert(wikiPages)
        .values({
          wikiId: input.wiki.id,
          key,
          title: input.title,
          createdAt: now,
        })
        .returning();
      if (!page) throw new Error("Creating the page returned nothing");
    }
    const [revision] = await tx
      .insert(wikiRevisions)
      .values({
        wikiId: input.wiki.id,
        pageId: page.id,
        authorId: input.actor?.id ?? null,
        title: page.title,
        body,
        summary: input.summary.trim().slice(0, PAGE_LIMITS.summary),
        minor: input.minor && !created,
        bytes: Buffer.byteLength(body, "utf8"),
        createdAt: now,
      })
      .returning();
    if (!revision) throw new Error("Saving the revision returned nothing");
    const [saved] = await tx
      .update(wikiPages)
      .set({
        revisionId: revision.id,
        redirectTo: parseRedirect(body),
        html: rendered.html,
        toc: rendered.toc,
        plain: rendered.plain,
        renderVersion: WIKI_RENDER_VERSION,
        deletedAt: null,
        updatedAt: now,
      })
      .where(eq(wikiPages.id, page.id))
      .returning();
    if (!saved) throw new Error("Updating the page returned nothing");
    await replaceLinks(tx, saved, rendered);
    return { ok: true, page: saved, revision, created };
  });
}

export type MoveResult =
  | { ok: true; page: WikiPage }
  | { ok: false; error: "exists" | "generated" | "same" };

/** Renames a page, optionally leaving a redirect at the old title. */
export async function movePage(
  db: Database,
  input: {
    wiki: WikiRef;
    actor: User;
    page: WikiPage;
    to: string;
    redirect: boolean;
    reason: string;
    now?: Date;
  },
): Promise<MoveResult> {
  const now = input.now ?? new Date();
  const key = titleKey(input.to);
  const from = input.page.title;
  if (input.to === from) return { ok: false, error: "same" };
  const generated = await generatedPages(input.wiki);
  if (generated?.pages.has(key)) return { ok: false, error: "generated" };
  const moved = await db.transaction(async (tx) => {
    const existing = await findPage(tx, input.wiki.id, key);
    if (existing && existing.id !== input.page.id) return null;
    const [page] = await tx
      .update(wikiPages)
      // Rendered again when next read: an infobox's title is the page's.
      .set({ key, title: input.to, renderVersion: 0, updatedAt: now })
      .where(eq(wikiPages.id, input.page.id))
      .returning();
    await log(tx, input.wiki.id, input.actor, "move", {
      title: from,
      detail: `→ ${input.to}${input.reason ? `: ${input.reason}` : ""}`,
      now,
    });
    return page ?? null;
  });
  if (!moved) return { ok: false, error: "exists" };
  // At once, not when next read: an Item: page's item is found by its title.
  await ensurePageRendered(db, input.wiki, moved);
  // A change of case only keeps the same key: there's nothing to redirect from.
  if (input.redirect && titleKey(from) !== key) {
    await savePage(db, {
      wiki: input.wiki,
      actor: input.actor,
      title: from,
      body: `#REDIRECT [[${input.to}]]\n`,
      summary: `Moved to [[${input.to}]]`,
      minor: false,
      baseRevisionId: null,
      canEditProtected: true,
      now,
    });
  }
  return { ok: true, page: moved };
}

export async function deletePage(
  db: Database,
  wiki: Pick<Wiki, "id">,
  actor: User,
  page: WikiPage,
  reason: string,
  now = new Date(),
): Promise<void> {
  await db.transaction(async (tx) => {
    await tx
      .update(wikiPages)
      .set({ deletedAt: now, updatedAt: now })
      .where(eq(wikiPages.id, page.id));
    await tx.delete(wikiLinks).where(eq(wikiLinks.pageId, page.id));
    await tx.delete(wikiCategories).where(eq(wikiCategories.pageId, page.id));
    await recordItem(tx, page, null, now);
    await log(tx, wiki.id, actor, "delete", {
      title: page.title,
      detail: reason,
      now,
    });
  });
}

export async function restorePage(
  db: Database,
  wiki: WikiRef,
  actor: User,
  page: WikiPage,
  now = new Date(),
): Promise<void> {
  const [revision] =
    page.revisionId === null
      ? []
      : await db
          .select({ body: wikiRevisions.body })
          .from(wikiRevisions)
          .where(eq(wikiRevisions.id, page.revisionId))
          .limit(1);
  const rendered = await renderWikiPage(revision?.body ?? "", {
    slug: wiki.slug,
    title: page.title,
    componentSets: wiki.componentSets,
    items: await itemLookup(db, wiki),
  });
  await db.transaction(async (tx) => {
    await tx
      .update(wikiPages)
      .set({
        deletedAt: null,
        html: rendered.html,
        toc: rendered.toc,
        plain: rendered.plain,
        renderVersion: WIKI_RENDER_VERSION,
        updatedAt: now,
      })
      .where(eq(wikiPages.id, page.id));
    await replaceLinks(tx, page, rendered);
    await log(tx, wiki.id, actor, "restore", { title: page.title, now });
  });
}

export async function protectPage(
  db: Database,
  wiki: Pick<Wiki, "id">,
  actor: User,
  page: WikiPage,
  protection: WikiPage["protection"],
  now = new Date(),
): Promise<void> {
  if (page.protection === protection) return;
  await db
    .update(wikiPages)
    .set({ protection })
    .where(eq(wikiPages.id, page.id));
  await log(db, wiki.id, actor, "protect", {
    title: page.title,
    detail: protection === "owners" ? "Owners only" : "Members",
    now,
  });
}

// Lists -----------------------------------------------------------------------

export interface RevisionRow {
  id: number;
  pageId: number;
  title: string;
  summary: string;
  minor: boolean;
  bytes: number;
  /** The previous revision's size; null for the first. */
  previousBytes: number | null;
  createdAt: Date;
  author: string | null;
}

const previousBytes = sql<
  number | null
>`(select p.bytes from wiki_revisions p where p.page_id = ${wikiRevisions.pageId} and p.id < ${wikiRevisions.id} order by p.id desc limit 1)`;

const revisionColumns = {
  id: wikiRevisions.id,
  pageId: wikiRevisions.pageId,
  title: wikiPages.title,
  summary: wikiRevisions.summary,
  minor: wikiRevisions.minor,
  bytes: wikiRevisions.bytes,
  previousBytes,
  createdAt: wikiRevisions.createdAt,
  author: users.username,
};

function toRevisionRow(row: {
  previousBytes: unknown;
  [key: string]: unknown;
}): RevisionRow {
  const value = row.previousBytes;
  return {
    ...(row as unknown as RevisionRow),
    previousBytes: value === null || value === undefined ? null : Number(value),
  };
}

/** A page's revisions, newest first. */
export async function pageHistory(
  db: Database,
  pageId: number,
  limit = 100,
): Promise<RevisionRow[]> {
  const rows = await db
    .select(revisionColumns)
    .from(wikiRevisions)
    .innerJoin(wikiPages, eq(wikiPages.id, wikiRevisions.pageId))
    .leftJoin(users, eq(users.id, wikiRevisions.authorId))
    .where(eq(wikiRevisions.pageId, pageId))
    .orderBy(desc(wikiRevisions.id))
    .limit(limit);
  return rows.map(toRevisionRow);
}

/** The wiki's latest edits, newest first (pages since deleted included). */
export async function recentChanges(
  db: Database,
  wikiId: number,
  limit = 100,
): Promise<RevisionRow[]> {
  const rows = await db
    .select(revisionColumns)
    .from(wikiRevisions)
    .innerJoin(wikiPages, eq(wikiPages.id, wikiRevisions.pageId))
    .leftJoin(users, eq(users.id, wikiRevisions.authorId))
    .where(eq(wikiRevisions.wikiId, wikiId))
    .orderBy(desc(wikiRevisions.id))
    .limit(limit);
  return rows.map(toRevisionRow);
}

export interface LogRow {
  id: number;
  action: WikiLogEntry["action"];
  title: string | null;
  detail: string;
  createdAt: Date;
  actor: string | null;
}

export async function wikiLogEntries(
  db: Database,
  wikiId: number,
  limit = 100,
): Promise<LogRow[]> {
  return db
    .select({
      id: wikiLog.id,
      action: wikiLog.action,
      title: wikiLog.title,
      detail: wikiLog.detail,
      createdAt: wikiLog.createdAt,
      actor: users.username,
    })
    .from(wikiLog)
    .leftJoin(users, eq(users.id, wikiLog.actorId))
    .where(eq(wikiLog.wikiId, wikiId))
    .orderBy(desc(wikiLog.id))
    .limit(limit);
}

export interface PageListing {
  title: string;
  redirectTo: string | null;
  generated: boolean;
}

/** Every page, written and generated, by title. */
export async function allPages(
  db: Database,
  wiki: WikiRef,
): Promise<PageListing[]> {
  const rows = await db
    .select({ title: wikiPages.title, redirectTo: wikiPages.redirectTo })
    .from(wikiPages)
    .where(and(eq(wikiPages.wikiId, wiki.id), isNull(wikiPages.deletedAt)));
  const listing: PageListing[] = rows.map((row) => ({
    ...row,
    generated: false,
  }));
  const generated = await generatedPages(wiki);
  for (const page of generated?.pages.values() ?? [])
    listing.push({ title: page.title, redirectTo: null, generated: true });
  return listing.sort((a, b) =>
    a.title.localeCompare(b.title, "en", { sensitivity: "base" }),
  );
}

/** Which of these keys are pages (written or generated) in the wiki. */
export async function existingKeys(
  db: Database,
  wiki: WikiRef,
  keys: readonly string[],
): Promise<Set<string>> {
  const found = new Set<string>();
  if (keys.length === 0) return found;
  const generated = await generatedPages(wiki);
  const rest: string[] = [];
  for (const key of keys) {
    if (generated?.pages.has(key)) found.add(key);
    else rest.push(key);
  }
  if (rest.length > 0) {
    const rows = await db
      .select({ key: wikiPages.key })
      .from(wikiPages)
      .where(
        and(
          eq(wikiPages.wikiId, wiki.id),
          inArray(wikiPages.key, rest),
          isNull(wikiPages.deletedAt),
        ),
      );
    for (const row of rows) found.add(row.key);
  }
  return found;
}

/** Links (from written and generated pages) to pages nobody has written yet. */
export async function wantedPages(
  db: Database,
  wiki: WikiRef,
): Promise<{ title: string; links: number }[]> {
  const counts = new Map<string, { title: string; links: number }>();
  const rows = await db
    .select({
      key: wikiLinks.targetKey,
      title: sql<string>`min(${wikiLinks.targetTitle})`,
      links: count(),
    })
    .from(wikiLinks)
    .where(eq(wikiLinks.wikiId, wiki.id))
    .groupBy(wikiLinks.targetKey);
  for (const row of rows)
    counts.set(row.key, { title: row.title, links: row.links });
  const generated = await generatedPages(wiki);
  for (const page of generated?.pages.values() ?? []) {
    for (const link of page.rendered.links) {
      const entry = counts.get(link.key) ?? { title: link.title, links: 0 };
      entry.links += 1;
      counts.set(link.key, entry);
    }
  }
  const existing = await existingKeys(db, wiki, [...counts.keys()]);
  return [...counts]
    .filter(([key]) => !existing.has(key))
    .map(([, entry]) => entry)
    .sort((a, b) => b.links - a.links || a.title.localeCompare(b.title));
}

/** Pages that link here (written and generated). */
export async function backlinks(
  db: Database,
  wiki: WikiRef,
  key: string,
): Promise<string[]> {
  const rows = await db
    .select({ title: wikiPages.title })
    .from(wikiLinks)
    .innerJoin(wikiPages, eq(wikiPages.id, wikiLinks.pageId))
    .where(
      and(
        eq(wikiLinks.wikiId, wiki.id),
        eq(wikiLinks.targetKey, key),
        isNull(wikiPages.deletedAt),
      ),
    );
  const titles = rows.map((row) => row.title);
  const generated = await generatedPages(wiki);
  for (const page of generated?.pages.values() ?? []) {
    if (page.rendered.links.some((link) => link.key === key))
      titles.push(page.title);
  }
  return [...new Set(titles)].sort((a, b) => a.localeCompare(b, "en"));
}

/** The pages in a category (by the category page's key). */
export async function categoryMembers(
  db: Database,
  wiki: WikiRef,
  categoryKey: string,
): Promise<string[]> {
  const rows = await db
    .select({ title: wikiPages.title })
    .from(wikiCategories)
    .innerJoin(wikiPages, eq(wikiPages.id, wikiCategories.pageId))
    .where(
      and(
        eq(wikiCategories.wikiId, wiki.id),
        eq(wikiCategories.categoryKey, categoryKey),
        isNull(wikiPages.deletedAt),
      ),
    );
  const titles = rows.map((row) => row.title);
  const generated = await generatedPages(wiki);
  for (const page of generated?.pages.values() ?? []) {
    if (
      page.rendered.categories.some((title) => titleKey(title) === categoryKey)
    )
      titles.push(page.title);
  }
  return [...new Set(titles)].sort((a, b) =>
    a.localeCompare(b, "en", { sensitivity: "base" }),
  );
}

/** Every category in use, with how many pages are in it. */
export async function allCategories(
  db: Database,
  wiki: WikiRef,
): Promise<{ title: string; pages: number }[]> {
  const counts = new Map<string, { title: string; pages: number }>();
  const rows = await db
    .select({
      key: wikiCategories.categoryKey,
      title: sql<string>`min(${wikiCategories.categoryTitle})`,
      pages: count(),
    })
    .from(wikiCategories)
    .where(eq(wikiCategories.wikiId, wiki.id))
    .groupBy(wikiCategories.categoryKey);
  for (const row of rows)
    counts.set(row.key, { title: row.title, pages: row.pages });
  const generated = await generatedPages(wiki);
  for (const page of generated?.pages.values() ?? []) {
    for (const title of page.rendered.categories) {
      const key = titleKey(title);
      const entry = counts.get(key) ?? { title, pages: 0 };
      entry.pages += 1;
      counts.set(key, entry);
    }
  }
  return [...counts.values()].sort((a, b) =>
    a.title.localeCompare(b.title, "en"),
  );
}

export interface SearchHit {
  title: string;
  snippet: string;
  generated: boolean;
}

export const SEARCH_LIMIT = 50;

/**
 * Full-text search in one wiki (titles weigh most), plus a plain match over its
 * generated pages. An exact title comes first.
 */
export async function searchPages(
  db: Database,
  wiki: WikiRef,
  query: string,
): Promise<SearchHit[]> {
  const q = query.trim().slice(0, 200);
  if (q === "") return [];
  const tsquery = sql`websearch_to_tsquery('english', ${q})`;
  const document = sql`setweight(to_tsvector('english', ${wikiPages.title}), 'A') || setweight(to_tsvector('english', ${wikiPages.plain}), 'C')`;
  const rows = await db
    .select({ title: wikiPages.title, plain: wikiPages.plain })
    .from(wikiPages)
    .where(
      and(
        eq(wikiPages.wikiId, wiki.id),
        isNull(wikiPages.deletedAt),
        isNull(wikiPages.redirectTo),
        or(
          sql`${document} @@ ${tsquery}`,
          sql`lower(${wikiPages.title}) like ${`%${q.toLowerCase().replace(/[\\%_]/g, "\\$&")}%`}`,
        ),
      ),
    )
    .orderBy(desc(sql`ts_rank(${document}, ${tsquery})`), asc(wikiPages.title))
    .limit(SEARCH_LIMIT);
  const hits: SearchHit[] = rows.map((row) => ({
    title: row.title,
    snippet: snippet(row.plain),
    generated: false,
  }));
  const generated = await generatedPages(wiki);
  const needle = q.toLowerCase();
  const words = needle.split(/\s+/).filter(Boolean);
  for (const page of generated?.pages.values() ?? []) {
    const title = page.title.toLowerCase();
    const text = page.rendered.plain.toLowerCase();
    if (
      title.includes(needle) ||
      words.every((word) => text.includes(word) || title.includes(word))
    )
      hits.push({
        title: page.title,
        snippet: snippet(page.rendered.plain),
        generated: true,
      });
  }
  const exact = titleKey(q);
  return hits
    .sort((a, b) => {
      const aExact = titleKey(a.title) === exact ? 0 : 1;
      const bExact = titleKey(b.title) === exact ? 0 : 1;
      const aTitle = a.title.toLowerCase().includes(needle) ? 0 : 1;
      const bTitle = b.title.toLowerCase().includes(needle) ? 0 : 1;
      return aExact - bExact || aTitle - bTitle;
    })
    .slice(0, SEARCH_LIMIT);
}

/** A written page's categories (titles), by name. */
export async function pageCategories(
  db: Database,
  pageId: number,
): Promise<string[]> {
  const rows = await db
    .select({ title: wikiCategories.categoryTitle })
    .from(wikiCategories)
    .where(eq(wikiCategories.pageId, pageId));
  return rows.map((row) => row.title).sort((a, b) => a.localeCompare(b, "en"));
}

export async function getPageById(
  db: Db,
  wikiId: number,
  id: number,
): Promise<WikiPage | undefined> {
  const [page] = await db
    .select()
    .from(wikiPages)
    .where(and(eq(wikiPages.wikiId, wikiId), eq(wikiPages.id, id)))
    .limit(1);
  return page;
}

/** For the account export: the wikis someone belongs to, and every edit they made. */
export async function wikiExport(db: Database, userId: string) {
  const memberships = await db
    .select({
      wiki: wikis.slug,
      name: wikis.name,
      role: wikiMembers.role,
      addedAt: wikiMembers.addedAt,
    })
    .from(wikiMembers)
    .innerJoin(wikis, eq(wikis.id, wikiMembers.wikiId))
    .where(eq(wikiMembers.userId, userId));
  const edits = await db
    .select({
      wiki: wikis.slug,
      page: wikiPages.title,
      revision: wikiRevisions.id,
      summary: wikiRevisions.summary,
      minor: wikiRevisions.minor,
      savedAt: wikiRevisions.createdAt,
      text: wikiRevisions.body,
    })
    .from(wikiRevisions)
    .innerJoin(wikis, eq(wikis.id, wikiRevisions.wikiId))
    .innerJoin(wikiPages, eq(wikiPages.id, wikiRevisions.pageId))
    .where(eq(wikiRevisions.authorId, userId))
    .orderBy(asc(wikiRevisions.id));
  return { memberships, edits };
}
