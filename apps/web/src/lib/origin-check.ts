/**
 * The same-origin check on state-changing requests: Astro's own check
 * (astro/dist/core/app/origin-check.js), done in our middleware instead so one kind
 * of request can be let through: one-click unsubscribes (RFC 8058). Mail providers
 * POST those from their own servers, with no Origin header. The link's secret token
 * is what authorises them, and all they can do is switch notifications off.
 */

const FORM_CONTENT_TYPES = [
  "application/x-www-form-urlencoded",
  "multipart/form-data",
  "text/plain",
];
const SAFE_METHODS = ["GET", "HEAD", "OPTIONS"];

/** Paths that take cross-site form posts. Keep this list short. */
export const CROSS_SITE_POST_PATHS = ["/mail/unsubscribe/"] as const;

export function isCrossSiteExempt(pathname: string): boolean {
  return CROSS_SITE_POST_PATHS.some((prefix) => pathname.startsWith(prefix));
}

/** Whether to refuse the request: a cross-site (or origin-less) form post or write. */
export function isForbiddenCrossOrigin(request: Request, url: URL): boolean {
  if (SAFE_METHODS.includes(request.method)) return false;
  if (isCrossSiteExempt(url.pathname)) return false;
  const sameOrigin = request.headers.get("origin") === url.origin;
  const contentType = request.headers.get("content-type");
  if (contentType !== null) {
    const lower = contentType.toLowerCase();
    const formLike = FORM_CONTENT_TYPES.some((type) => lower.includes(type));
    return formLike && !sameOrigin;
  }
  return !sameOrigin;
}

export function crossOriginForbidden(request: Request): Response {
  return new Response(
    `Cross-site ${request.method} form submissions are forbidden`,
    { status: 403 },
  );
}
