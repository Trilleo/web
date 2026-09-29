export const DEFAULT_NEXT = "/admin";

const PLACEHOLDER_ORIGIN = "https://placeholder.invalid";

/**
 * Where to go after signing in: a path on this site, or DEFAULT_NEXT. Anything that
 * could leave the site (`https://…`, `//host`, `/\host`, …) is refused, so the
 * sign-in flow can't be used to bounce visitors elsewhere.
 */
export function safeNextPath(value: string | null | undefined): string {
  if (
    !value?.startsWith("/") ||
    value.startsWith("//") ||
    value.includes("\\")
  ) {
    return DEFAULT_NEXT;
  }
  try {
    // URL parsing also drops tabs and newlines, which could turn "/\t/x" into "//x".
    const url = new URL(value, PLACEHOLDER_ORIGIN);
    if (url.origin !== PLACEHOLDER_ORIGIN) return DEFAULT_NEXT;
    return url.pathname + url.search + url.hash;
  } catch {
    return DEFAULT_NEXT;
  }
}

/** The page a response should send the visitor to, never cached. */
export function noStoreRedirect(location: string, status = 302): Response {
  return new Response(null, {
    status,
    headers: { Location: location, "Cache-Control": "private, no-store" },
  });
}
