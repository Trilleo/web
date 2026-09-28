export const SITE_NAME = "Trilleo";
// Canonical origin: trilleo.net redirects here (see deploy/Caddyfile).
export const SITE_URL = "https://www.trilleo.net";
export const SITE_DESCRIPTION = "Writing, tools, and experiments on the web.";
// TODO: replace with your own short bio.
export const SITE_BIO = "[Short bio — who you are and what you work on.]";
export const GITHUB_URL = "https://github.com/Trilleo";

export interface NavItem {
  number: string;
  label: string;
  href: string;
}

/** Main navigation. Numbers match the home page's section headers. */
export const NAV_ITEMS: readonly NavItem[] = [
  { number: "01", label: "Writing", href: "/writing/" },
  { number: "02", label: "Tools", href: "/#tools" },
  { number: "03", label: "About", href: "/#colophon" },
];

/** Document title: "Page · Trilleo", or just the site name when no page title is given. */
export function formatTitle(page?: string): string {
  const trimmed = page?.trim();
  return trimmed ? `${trimmed} · ${SITE_NAME}` : SITE_NAME;
}
