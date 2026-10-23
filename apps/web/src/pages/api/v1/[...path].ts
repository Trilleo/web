import type { APIRoute } from "astro";
import { getDb } from "../../../lib/db";
import { dispatch } from "../../../lib/api/dispatch";
import { apiOrigin, siteOrigin } from "../../../lib/api/host";
import { RateLimiter } from "../../../lib/api/rate-limit";
import { ROUTES } from "../../../lib/api/routes";

export const prerender = false;

const limiter = new RateLimiter();

/**
 * The API (lib/api/): api.trilleo.net/v1/… is rewritten here by the middleware, and
 * the site's own /api/v1/… comes straight here.
 */
export const ALL: APIRoute = (context) => {
  let clientIp: string | null = null;
  try {
    clientIp = context.clientAddress;
  } catch {
    // Not available (some test setups): everyone without a key shares one limit.
  }
  return dispatch(context.request, context.url, {
    getDb,
    limiter,
    routes: ROUTES,
    clientIp,
    apiOrigin: apiOrigin(context.url),
    siteOrigin: siteOrigin(context.url),
  });
};
