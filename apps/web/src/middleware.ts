import { defineMiddleware } from "astro:middleware";
import {
  clearSessionCookie,
  readSessionToken,
  setSessionCookie,
} from "./lib/auth/cookies";
import { validateSession } from "./lib/auth/sessions";
import { getDb } from "./lib/db";
import { announceInBackground } from "./lib/indexnow";
import { deliverInBackground, startMailDelivery } from "./lib/mail/delivery";
import {
  crossOriginForbidden,
  isForbiddenCrossOrigin,
} from "./lib/origin-check";
import { storageDeps } from "./lib/storage/deps";
import { maintainInBackground } from "./lib/storage/maintenance";

// Queued mail and admin alerts start a delivery pass in this server.
startMailDelivery();

/**
 * Looks up the signed-in user for server-rendered requests (Astro.locals.user).
 * Pre-built pages are the same for everyone, so they skip this.
 */
export const onRequest = defineMiddleware(async (context, next) => {
  context.locals.user = null;
  context.locals.session = null;
  if (context.isPrerendered) return next();
  // Cross-site form posts are refused (Astro's check, with one exception).
  if (isForbiddenCrossOrigin(context.request, context.url))
    return crossOriginForbidden(context.request);
  // Scheduled posts go live without anyone saving them: any request may notice
  // (at most every few minutes, in the background, only with IndexNow set up).
  announceInBackground(getDb);
  // Unfinished uploads, stuck processing, bytes past their retention (same idea).
  maintainInBackground(storageDeps);
  // Mail retries that came due, and admin alerts that waited out their gap.
  deliverInBackground();

  const { cookies, url } = context;
  const token = readSessionToken(cookies, url);
  if (token) {
    const result = await validateSession(await getDb(), token);
    if (result) {
      context.locals.user = result.user;
      context.locals.session = result.session;
      if (result.renewed) {
        setSessionCookie(cookies, url, token, result.session.expiresAt);
      }
    } else {
      clearSessionCookie(cookies, url);
    }
  }
  return next();
});
