export const SITE_NAME = "Trilleo";

/** Document title: "Page · Trilleo", or just the site name when no page title is given. */
export function formatTitle(page?: string): string {
  const trimmed = page?.trim();
  return trimmed ? `${trimmed} · ${SITE_NAME}` : SITE_NAME;
}
