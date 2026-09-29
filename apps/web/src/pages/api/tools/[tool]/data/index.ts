import type { APIRoute } from "astro";
import { getDb } from "../../../../../lib/db";
import { handleToolData } from "../../../../../lib/tools/api";

export const prerender = false;

/** GET: the signed-in person's saved items in this tool (see lib/tools/api.ts). */
export const ALL: APIRoute = ({ request, url, locals, params }) =>
  handleToolData({
    request,
    url,
    user: locals.user,
    tool: params.tool,
    key: undefined,
    getDb,
  });
