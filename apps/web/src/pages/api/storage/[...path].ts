import type { APIRoute } from "astro";
import { handleStorageApi } from "../../../lib/storage/api";
import { requesterOf, storageDeps } from "../../../lib/storage/deps";

export const prerender = false;

/** The storage API: uploads and file status (see lib/storage/api.ts). */
export const ALL: APIRoute = ({ request, url, locals, params }) =>
  handleStorageApi({
    request,
    url,
    requester: requesterOf(locals.user),
    path: params.path ?? "",
    deps: storageDeps,
  });
