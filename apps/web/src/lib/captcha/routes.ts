/**
 * What the human check guards. Each route names the pages whose POSTs it covers
 * (the only places /check/ sends anyone back to) and its `steps`: actions an hour
 * from one visitor before the light check, the heavy one and the puzzle.
 */

export interface CheckRouteInfo {
  label: string;
  /** Pages whose form posts this route covers (paths, no query). */
  paths: readonly string[];
  steps: readonly [number, number, number];
}

export const CHECK_ROUTES = {
  "sign-in": {
    label: "Sign-in codes",
    paths: ["/sign-in", "/sign-in/code"],
    steps: [3, 6, 10],
  },
  contact: {
    label: "Contact form",
    paths: ["/contact/send"],
    steps: [2, 4, 6],
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
  const paths: readonly string[] = CHECK_ROUTES[route].paths;
  return paths.includes(url.pathname) ? url.pathname + url.search : null;
}
