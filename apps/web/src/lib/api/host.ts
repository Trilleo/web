/**
 * api.trilleo.net is served by this same app, like the wiki: its /v1/… requests go
 * to the dispatcher (src/pages/api/v1/[...path].ts) and everything else to the docs
 * (src/pages/developers/). /developers/ on the main host redirects there. Locally the
 * API is api.localhost (browsers send *.localhost to this machine), next to localhost.
 */
import { SITE_URL } from "../site";

/** The API's public address. */
export const API_URL = "https://api.trilleo.net";

const API_PREFIX = "api.";

/** The request came in on the API's host (api.trilleo.net, api.localhost). */
export function isApiHost(url: URL): boolean {
  return url.hostname.startsWith(API_PREFIX);
}

/** The API's origin, seen from any host. */
export function apiOrigin(url: URL): string {
  if (isApiHost(url)) return url.origin;
  if (url.origin === SITE_URL) return API_URL;
  const api = new URL(url.origin);
  // An IP address has no subdomains: the API is reached as api.localhost.
  const host = /^[\d.]+$/.test(url.hostname) ? "localhost" : url.hostname;
  api.hostname = API_PREFIX + host.replace(/^(www|wiki)\./, "");
  return api.origin;
}

/** The main site's origin, seen from the API's host. */
export function siteOrigin(url: URL): string {
  if (!isApiHost(url)) return url.origin;
  if (url.hostname === new URL(API_URL).hostname) return SITE_URL;
  const main = new URL(url.origin);
  main.hostname = url.hostname.slice(API_PREFIX.length);
  return main.origin;
}

/** Where a request on the API's host is served from, or null to leave it alone. */
export function apiRewrite(url: URL): URL | null {
  // Astro's own and built assets (the docs' styles), as they are.
  if (url.pathname.startsWith("/_")) return null;
  const target = new URL(url.href);
  target.pathname =
    url.pathname === "/v1" || url.pathname.startsWith("/v1/")
      ? `/api${url.pathname}`
      : `/developers${url.pathname}`;
  return target;
}

/** The API's address for a /developers/… path asked for on another host. */
export function apiRedirect(url: URL): string | null {
  if (isApiHost(url)) return null;
  if (
    url.pathname !== "/developers" &&
    !url.pathname.startsWith("/developers/")
  )
    return null;
  const rest = url.pathname.slice("/developers".length) || "/";
  return apiOrigin(url) + rest + url.search;
}

/** A docs page's path on the API host, from its path under src/pages/developers/. */
export function publicDocsPath(url: URL): string {
  return url.pathname.replace(/^\/developers/, "") || "/";
}
