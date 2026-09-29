import type { User } from "@trilleo/db";
import type { APIContext } from "astro";
import { authConfig, type AuthConfig } from "./config";

export function isAdmin(user: User | null, config: AuthConfig | null): boolean {
  return user !== null && (config?.adminIds.has(user.githubId) ?? false);
}

/**
 * Guards a server page that only admins may see. Returns the admin, or the
 * response to send instead (a sign-in redirect, or 403 for a signed-in non-admin):
 *
 *   const admin = requireAdmin(Astro);
 *   if (admin instanceof Response) return admin;
 */
export function requireAdmin(
  context: Pick<APIContext, "locals" | "url">,
  config: AuthConfig | null = authConfig(),
): User | Response {
  const { user } = context.locals;
  const headers = { "Cache-Control": "private, no-store" };
  if (!user) {
    const next = context.url.pathname + context.url.search;
    return new Response(null, {
      status: 302,
      headers: {
        ...headers,
        Location: `/sign-in?next=${encodeURIComponent(next)}`,
      },
    });
  }
  if (!isAdmin(user, config)) {
    return new Response("Only the site owner can see this page.", {
      status: 403,
      headers: { ...headers, "Content-Type": "text/plain; charset=utf-8" },
    });
  }
  return user;
}
