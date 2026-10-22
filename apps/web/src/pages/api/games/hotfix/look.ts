import type { APIRoute } from "astro";
import { getDb } from "../../../../lib/db";
import { handleHotfix } from "../../../../lib/games/hotfix/api";

export const prerender = false;

/** See lib/games/hotfix/api.ts. */
export const ALL: APIRoute = ({ request, url, locals }) =>
  handleHotfix({ request, url, user: locals.user, endpoint: "look", getDb });
