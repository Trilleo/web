import type { User } from "@trilleo/db";
import type { APIContext } from "astro";
import { authConfig, type AuthConfig } from "./config";

type GuardContext = Pick<APIContext, "locals" | "url">;

const NO_STORE = { "Cache-Control": "private, no-store" };

export function isAdmin(
  user: User | null,
  config: AuthConfig | null = authConfig(),
): boolean {
  return user !== null && (config?.adminIds.has(user.githubId) ?? false);
}

/** Off to sign in, then back to this page. */
function signInFirst(context: GuardContext): Response {
  const next = context.url.pathname + context.url.search;
  return new Response(null, {
    status: 302,
    headers: {
      ...NO_STORE,
      Location: `/sign-in?next=${encodeURIComponent(next)}`,
    },
  });
}

/**
 * Guards a server page for anyone signed in. Returns the user, or the response to
 * send instead (a sign-in redirect):
 *
 *   const user = requireUser(Astro);
 *   if (user instanceof Response) return user;
 */
export function requireUser(context: GuardContext): User | Response {
  return context.locals.user ?? signInFirst(context);
}

/**
 * Guards a server page that only admins may see. Returns the admin, or the
 * response to send instead (a sign-in redirect, or 403 for a signed-in non-admin):
 *
 *   const admin = requireAdmin(Astro);
 *   if (admin instanceof Response) return admin;
 */
export function requireAdmin(
  context: GuardContext,
  config: AuthConfig | null = authConfig(),
): User | Response {
  const { user } = context.locals;
  if (!user) return signInFirst(context);
  if (!isAdmin(user, config)) {
    return new Response("Only the site owner can see this page.", {
      status: 403,
      headers: { ...NO_STORE, "Content-Type": "text/plain; charset=utf-8" },
    });
  }
  return user;
}
