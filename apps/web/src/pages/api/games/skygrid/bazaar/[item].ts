import type { APIRoute } from "astro";
import { getDb } from "../../../../../lib/db";
import { handleBazaarRead } from "../../../../../lib/games/skygrid/bazaar-api";

export const prerender = false;

/** One product's book and history, or your orders (see lib/games/skygrid/bazaar-api.ts). */
export const ALL: APIRoute = ({ request, url, locals, params }) =>
  handleBazaarRead({
    request,
    url,
    user: locals.user,
    item: params.item,
    getDb,
  });
