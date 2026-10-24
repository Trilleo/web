import { defineMiddleware } from "astro:middleware";
import { apiRedirect, apiRewrite, isApiHost } from "./lib/api/host";
import { startWebhooks } from "./lib/api/webhooks/run";
import {
  clearSessionCookie,
  readSessionToken,
  setSessionCookie,
} from "./lib/auth/cookies";
import { noStoreRedirect } from "./lib/auth/redirect";
import { validateSession } from "./lib/auth/sessions";
import { emailSetupRedirect } from "./lib/auth/setup";
import { chunithmSyncInBackground } from "./lib/chunithm/sync";
import { crypticQueueInBackground } from "./lib/cryptic/queue";
import { getDb } from "./lib/db";
import { announceInBackground } from "./lib/indexnow";
import { deliverInBackground, startMailDelivery } from "./lib/mail/delivery";
import {
  crossOriginForbidden,
  isForbiddenCrossOrigin,
} from "./lib/origin-check";
import { storageDeps } from "./lib/storage/deps";
import { maintainInBackground } from "./lib/storage/maintenance";
import {
  isWikiHost,
  mainOrigin,
  wikiRedirect,
  wikiRewrite,
} from "./lib/wiki/host";

// Queued mail and admin alerts start a delivery pass in this server.
startMailDelivery();
// Webhooks: a pass every minute, and one just after each UTC midnight (the cryptic).
startWebhooks(getDb);

/** Work any request may start (each at most every few minutes, in the background). */
function backgroundWork(): void {
  // Scheduled posts go live without anyone saving them: any request may notice
  // (only with IndexNow set up).
  announceInBackground(getDb);
  // Unfinished uploads, stuck processing, bytes past their retention (same idea).
  maintainInBackground(storageDeps);
  // Mail retries that came due, and admin alerts that waited out their gap.
  deliverInBackground();
  // The daily cryptic running short of puzzles (an admin alert, hourly at most).
  crypticQueueInBackground(getDb);
  // The CHUNITHM catalog: SEGA's list, otoge-db and sdvx.in (every few hours).
  chunithmSyncInBackground(getDb);
}

/**
 * Looks up the signed-in user for server-rendered requests (Astro.locals.user).
 * Pre-built pages are the same for everyone, so they skip this. Requests for the
 * wiki's host (wiki.trilleo.net) are served from src/pages/wiki/ (lib/wiki/host.ts).
 * The API's host (api.trilleo.net) has no sessions: keys say who's calling, so it
 * skips all of this (lib/api/host.ts).
 */
export const onRequest = defineMiddleware(async (context, next) => {
  context.locals.user = null;
  context.locals.session = null;
  if (isApiHost(context.url)) {
    backgroundWork();
    const rewrite = apiRewrite(context.url);
    return rewrite ? next(rewrite) : next();
  }
  const api = apiRedirect(context.url);
  if (api) return noStoreRedirect(api, 301);
  const wikiHost = isWikiHost(context.url);
  if (!wikiHost) {
    const wiki = wikiRedirect(context.url);
    if (wiki) return noStoreRedirect(wiki, 301);
    if (context.isPrerendered) return next();
  }
  // Cross-site form posts are refused (Astro's check, with one exception).
  if (isForbiddenCrossOrigin(context.request, context.url))
    return crossOriginForbidden(context.request);
  backgroundWork();

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
  // Accounts from before email sign-in add an address before anything else.
  const setup = emailSetupRedirect(
    context.locals.user,
    context.request.method,
    wikiHost ? new URL("/account/", url) : url,
  );
  if (setup)
    return noStoreRedirect(
      wikiHost ? `${mainOrigin(url)}/account/email/?setup=1` : setup,
    );
  const rewrite = wikiHost ? wikiRewrite(url) : null;
  return rewrite ? next(rewrite) : next();
});
