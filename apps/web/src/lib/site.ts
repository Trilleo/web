export const SITE_NAME = "Trilleo Network";
// Canonical origin: trilleo.net redirects here (see deploy/Caddyfile).
export const SITE_URL = "https://www.trilleo.net";
export const SITE_DESCRIPTION = "Writing, tools, and experiments on the web.";
export const SITE_BIO =
  "Trilleo's corner of the web: Minecraft creations, code, and learning resources, plus small tools you can use in the browser. Sign in with GitHub to join the conversation in the comments.";
export const GITHUB_URL = "https://github.com/Trilleo";

/** Account pages: kept out of search (robots.txt) and the sitemap. Prefixes. */
export const PRIVATE_PATHS = [
  "/account",
  "/admin",
  "/api/",
  "/auth/",
  "/comments",
  "/sign-in",
] as const;

export function isPrivatePath(pathname: string): boolean {
  return PRIVATE_PATHS.some((prefix) => pathname.startsWith(prefix));
}

export interface NavItem {
  number: string;
  label: string;
  href: string;
}

/** Main navigation. Numbers match the home page's section headers. */
export const NAV_ITEMS: readonly NavItem[] = [
  { number: "01", label: "Writing", href: "/writing/" },
  { number: "02", label: "Tools", href: "/tools/" },
  { number: "03", label: "About", href: "/about/" },
];

/** Document title: "Page · Trilleo Network", or just the site name when no page title is given. */
export function formatTitle(page?: string): string {
  const trimmed = page?.trim();
  return trimmed ? `${trimmed} · ${SITE_NAME}` : SITE_NAME;
}

/**
 * A `view-transition-name` for something that appears on two pages (a post's title
 * in a list and on its page), so it morphs across the navigation. Names must be
 * valid CSS identifiers and unique on a page.
 */
export function transitionName(prefix: string, id: string): string {
  const safe = id
    .toLowerCase()
    // Letters from any script are fine in CSS identifiers; everything else isn't.
    .replace(/[^\p{L}\p{N}_-]+/gu, "-")
    .replace(/^-+|-+$/g, "");
  return `${prefix}-${safe || "item"}`;
}
