import { defineMiddleware } from "astro:middleware";
import {
  clearSessionCookie,
  readSessionToken,
  setSessionCookie,
} from "./lib/auth/cookies";
import { validateSession } from "./lib/auth/sessions";
import { getDb } from "./lib/db";

/**
 * Looks up the signed-in user for server-rendered requests (Astro.locals.user).
 * Pre-built pages are the same for everyone, so they skip this.
 */
export const onRequest = defineMiddleware(async (context, next) => {
  context.locals.user = null;
  context.locals.session = null;
  if (context.isPrerendered) return next();

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
