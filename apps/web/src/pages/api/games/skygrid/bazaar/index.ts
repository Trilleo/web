import type { APIRoute } from "astro";
import { getDb } from "../../../../../lib/db";
import { handleBazaarRead } from "../../../../../lib/games/skygrid/bazaar-api";

export const prerender = false;

/** Every product's best prices (see lib/games/skygrid/bazaar-api.ts). */
export const ALL: APIRoute = ({ request, url, locals }) =>
  handleBazaarRead({ request, url, user: locals.user, item: undefined, getDb });
