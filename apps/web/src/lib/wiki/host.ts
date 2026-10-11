/**
 * wiki.trilleo.net is served by this same app: requests for the wiki's host are
 * rewritten to src/pages/wiki/ (src/middleware.ts), and /wiki/ on the main host
 * redirects there. Locally the wiki is wiki.localhost (browsers send *.localhost to
 * this machine), next to localhost.
 */
import { SITE_URL } from "../site";

/** The wiki's public address. */
export const WIKI_URL = "https://wiki.trilleo.net";

const WIKI_PREFIX = "wiki.";

/** The request came in on the wiki's host (wiki.trilleo.net, wiki.localhost). */
export function isWikiHost(url: URL): boolean {
  return url.hostname.startsWith(WIKI_PREFIX);
}

/** The main site's origin, seen from either host. */
export function mainOrigin(url: URL): string {
  if (!isWikiHost(url)) return url.origin;
  if (url.hostname === new URL(WIKI_URL).hostname) return SITE_URL;
  const main = new URL(url.origin);
  main.hostname = url.hostname.slice(WIKI_PREFIX.length);
  return main.origin;
}

/** The wiki's origin, seen from either host. */
export function wikiOrigin(url: URL): string {
  if (isWikiHost(url)) return url.origin;
  if (url.origin === SITE_URL) return WIKI_URL;
  const wiki = new URL(url.origin);
  // An IP address has no subdomains: the wiki is reached as wiki.localhost.
  const host = /^[\d.]+$/.test(url.hostname) ? "localhost" : url.hostname;
  wiki.hostname = WIKI_PREFIX + host.replace(/^www\./, "");
  return wiki.origin;
}

/** Paths on the wiki's host that aren't the wiki's: Astro's own and built assets. */
function passesThrough(pathname: string): boolean {
  return pathname.startsWith("/_");
}

/** Where a request on the wiki's host is served from, or null to leave it alone. */
export function wikiRewrite(url: URL): URL | null {
  if (passesThrough(url.pathname)) return null;
  const target = new URL(url.href);
  target.pathname = `/wiki${url.pathname}`;
  return target;
}

/** The wiki's address for a /wiki/… path asked for on the main host. */
export function wikiRedirect(url: URL): string | null {
  if (isWikiHost(url)) return null;
  if (url.pathname !== "/wiki" && !url.pathname.startsWith("/wiki/"))
    return null;
  const rest = url.pathname.slice("/wiki".length) || "/";
  return wikiOrigin(url) + rest + url.search;
}
