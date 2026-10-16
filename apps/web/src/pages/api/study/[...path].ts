import type { APIRoute } from "astro";
import { getDb } from "../../../lib/db";
import { handleStudy } from "../../../lib/study/api";

export const prerender = false;

/** Study records for signed-in people (see lib/study/api.ts). */
export const ALL: APIRoute = ({ request, url, locals, params }) =>
  handleStudy({
    request,
    url,
    user: locals.user,
    path: params.path ?? "",
    getDb,
  });
