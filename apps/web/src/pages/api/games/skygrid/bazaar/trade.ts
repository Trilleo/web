import type { APIRoute } from "astro";
import { getDb } from "../../../../../lib/db";
import { handleBazaarTrade } from "../../../../../lib/games/skygrid/bazaar-api";

export const prerender = false;

/** Buy, sell, cancel or claim (see lib/games/skygrid/bazaar-api.ts). */
export const ALL: APIRoute = ({ request, url, locals }) =>
  handleBazaarTrade({ request, url, user: locals.user, getDb });
