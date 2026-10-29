import type { APIRoute } from "astro";
import {
  PreviewLimits,
  errorResponse,
  previewFetch,
  readTarget,
} from "../../../../lib/tools/preview/fetch";
import { requireHumanJson } from "../../../../lib/captcha/gate";

export const prerender = false;

const limits = new PreviewLimits();

/**
 * POST `{ url }`: the Preview tool's fallback for links whose site won't let a
 * browser read them (lib/tools/preview/fetch.ts). Only for this site's own pages:
 * browsers always send Origin on a POST, and other sites' pages can't send this JSON
 * at all (it needs a CORS preflight, which is never answered).
 */
export const POST: APIRoute = async (context) => {
  const { request } = context;
  if (request.headers.get("origin") !== context.url.origin)
    return new Response("Cross-site requests are refused", { status: 403 });
  const url = await readTarget(request);
  if (url === null) return errorResponse("invalid-url");
  const check = await requireHumanJson(context, "preview-fetch");
  if (check) return check;
  let ip = "";
  try {
    ip = context.clientAddress;
  } catch {
    // Not available (some test setups): everyone shares one limit.
  }
  return previewFetch(url, { limits, ip, signal: request.signal });
};
