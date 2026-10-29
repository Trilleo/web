import type { APIRoute } from "astro";
import { requireHumanJson } from "../../../lib/captcha/gate";
import { handleStorageApi } from "../../../lib/storage/api";
import { requesterOf, storageDeps } from "../../../lib/storage/deps";

export const prerender = false;

/** The storage API: uploads and file status (see lib/storage/api.ts). */
export const ALL: APIRoute = (context) =>
  handleStorageApi({
    request: context.request,
    url: context.url,
    requester: requesterOf(context.locals.user),
    path: context.params.path ?? "",
    deps: storageDeps,
    humanCheck: () => requireHumanJson(context, "upload"),
  });
