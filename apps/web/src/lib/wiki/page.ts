/**
 * What every wiki page starts with: the database, the wiki (by the slug in the
 * address), who's asking and what they may do.
 */
import type { Database, User, Wiki } from "@trilleo/db";
import type { AstroGlobal } from "astro";
import { isAdmin } from "../auth/guard";
import { getDb } from "../db";
import { wikiAccess, type WikiAccess } from "./access";
import { noStoreRedirect } from "../auth/redirect";
import { isWikiHost, mainOrigin } from "./host";
import { ensureBuiltInWikis } from "./seed";
import { getWiki, roleIn } from "./store";
import { RESERVED_WIKI_SLUGS } from "./wikis";

export interface WikiContext {
  db: Database;
  wiki: Wiki;
  user: User | null;
  access: WikiAccess;
}

type Context = Pick<AstroGlobal, "locals" | "url">;

/** The database, with the built-in wikis in place. */
export async function wikiDb(): Promise<Database> {
  const db = await getDb();
  await ensureBuiltInWikis(db);
  return db;
}

/** The wiki and access, or null when it doesn't exist or this person can't read it. */
export async function openWiki(
  context: Context,
  slug: string | undefined,
): Promise<WikiContext | null> {
  if (!slug) return null;
  const db = await wikiDb();
  const wiki = await getWiki(db, slug);
  if (!wiki) return null;
  const { user } = context.locals;
  const access = wikiAccess(wiki, {
    signedIn: user !== null,
    role: await roleIn(db, wiki.id, user?.id),
    admin: isAdmin(user),
  });
  // A private wiki is no different from a missing one to anyone outside it.
  if (!access.read) return null;
  return { db, wiki, user, access };
}

/** The path as the visitor sees it (the wiki host's pages live under /wiki/). */
export function publicPath(url: URL): string {
  const path =
    isWikiHost(url) &&
    (url.pathname === "/wiki" || url.pathname.startsWith("/wiki/"))
      ? url.pathname.slice("/wiki".length) || "/"
      : url.pathname;
  return path + url.search;
}

/** Wikis people shouldn't find through search engines. */
export function isHidden(wiki: Pick<Wiki, "visibility">): boolean {
  return wiki.visibility !== "public";
}

/** Everything on the wiki depends on who's asking: browsers keep nothing. */
export function privateHeaders(context: Pick<AstroGlobal, "response">): void {
  context.response.headers.set("Cache-Control", "private, no-store");
}

/**
 * A path on the wiki's host that belongs to the main site (/about/, /tools/…):
 * there's no wiki there, so off to the main site. Caddy does the same for files.
 */
export function mainSiteRedirect(
  context: Context,
  slug: string | undefined,
): Response | null {
  if (!slug || !RESERVED_WIKI_SLUGS.has(slug)) return null;
  return noStoreRedirect(
    `${mainOrigin(context.url)}${publicPath(context.url)}`,
    301,
  );
}

/**
 * The wiki's slug for an endpoint (a .ts route). Endpoints reached through the
 * middleware's rewrite get no params from Astro, and still see the visitor's path
 * (/<slug>/-/…), so it's read from there; pages can use Astro.params.wiki.
 */
export function wikiSlugOf(
  context: Pick<AstroGlobal, "params" | "url">,
): string | undefined {
  if (context.params.wiki) return context.params.wiki;
  const path = publicPath(context.url).split("?")[0] ?? "";
  return /^\/([^/]+)\//.exec(path)?.[1];
}
