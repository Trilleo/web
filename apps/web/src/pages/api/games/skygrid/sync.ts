import type { APIRoute } from "astro";
import { getDb } from "../../../../lib/db";
import { handleSkygrid } from "../../../../lib/games/skygrid/api";

export const prerender = false;

/** Replays the player's actions on their saved island (see lib/games/skygrid/api.ts). */
export const ALL: APIRoute = ({ request, url, locals }) =>
  handleSkygrid({ request, url, user: locals.user, endpoint: "sync", getDb });
