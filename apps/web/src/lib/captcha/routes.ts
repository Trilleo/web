/**
 * What the human check guards. Each route names the pages whose POSTs it covers
 * (the only places /check/ sends anyone back to; none for JSON routes), as paths or
 * patterns for addresses with names in them, and its `steps`: actions an hour from
 * one visitor before the light check, the heavy one and the puzzle.
 */

export interface CheckRouteInfo {
  label: string;
  /** Pages whose form posts this route covers (paths, no query). */
  paths: readonly (string | RegExp)[];
  /** The pages, as the admin page shows them. */
  where: string;
  steps: readonly [number, number, number];
}

export const CHECK_ROUTES = {
  "sign-in": {
    label: "Sign-in codes",
    paths: ["/sign-in", "/sign-in/code"],
    where: "/sign-in, /sign-in/code",
    steps: [3, 6, 10],
  },
  contact: {
    label: "Contact form",
    paths: ["/contact/send"],
    where: "/contact/send",
    steps: [2, 4, 6],
  },
  // Newcomers only (no approved comment or post yet): trusted people are never asked.
  comment: {
    label: "Comments (newcomers)",
    paths: ["/comments"],
    where: "/comments",
    steps: [3, 6, 10],
  },
  "forum-post": {
    label: "Forum topics and replies (newcomers)",
    // /forum/new/ and a topic's page (/forum/<forum>/<id>-<slug>/).
    paths: ["/forum/new/", /^\/forum\/[a-z0-9-]+\/\d+(?:-[a-z0-9-]*)?\/$/],
    where: "/forum/new/, topics' replies",
    steps: [4, 8, 12],
  },
  // On the wiki's host: /<wiki>/-/edit/<Title>.
  "wiki-proposal": {
    label: "Proposed wiki edits",
    paths: [/^\/[a-z0-9-]+\/-\/edit\/[^/].*$/],
    where: "Wiki: /<wiki>/-/edit/<Title>",
    steps: [4, 8, 12],
  },
  alias: {
    label: "CHUNITHM name suggestions",
    paths: ["/tools/chunithm/alias"],
    where: "/tools/chunithm/alias",
    steps: [4, 8, 12],
  },
  // JSON routes (requireHumanJson): no pages to go back to.
  upload: {
    label: "Uploads (untrusted accounts)",
    paths: [],
    where: "/api/storage/uploads",
    steps: [10, 20, 40],
  },
  avatar: {
    label: "Profile pictures",
    paths: ["/account/avatar"],
    where: "/account/avatar",
    steps: [5, 10, 20],
  },
  "preview-fetch": {
    label: "Preview's server fetch",
    paths: [],
    where: "/api/tools/preview/fetch",
    steps: [10, 20, 30],
  },
  "chart-build": {
    label: "New CHUNITHM chart pictures",
    paths: [],
    where: "/api/chunithm/charts/…",
    steps: [5, 10, 20],
  },
} as const satisfies Record<string, CheckRouteInfo>;

export type CheckRoute = keyof typeof CHECK_ROUTES;

export function isCheckRoute(value: unknown): value is CheckRoute {
  return typeof value === "string" && Object.hasOwn(CHECK_ROUTES, value);
}

/** `to` when it's one of the route's pages on this site, else null. */
export function checkTarget(
  route: CheckRoute,
  to: string | null,
): string | null {
  if (!to?.startsWith("/") || to.startsWith("//")) return null;
  let url: URL;
  try {
    url = new URL(to, "http://x");
  } catch {
    return null;
  }
  const paths: readonly (string | RegExp)[] = CHECK_ROUTES[route].paths;
  const covered = paths.some((path) =>
    typeof path === "string" ? path === url.pathname : path.test(url.pathname),
  );
  return covered ? url.pathname + url.search : null;
}
