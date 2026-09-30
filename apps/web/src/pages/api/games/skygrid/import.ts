import type { APIRoute } from "astro";
import { getDb } from "../../../../lib/db";
import { handleSkygrid } from "../../../../lib/games/skygrid/api";

export const prerender = false;

/** Starts the account's island, or brings one from this browser (see lib/games/skygrid/api.ts). */
export const ALL: APIRoute = ({ request, url, locals }) =>
  handleSkygrid({ request, url, user: locals.user, endpoint: "import", getDb });
