import type { APIRoute } from "astro";
import { getDb } from "../../../../lib/db";
import { apiOrigin } from "../../../../lib/api/host";
import { answerApi } from "../../../../lib/minecraft/api";

export const prerender = false;

/** Any site may read the API (it's public data), but only with GET. */
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

/** When these addresses were superseded by the API's /v1/minecraft/ (RFC 9745). */
const DEPRECATED_AT = Date.UTC(2026, 9, 23) / 1000;

/**
 * The Minecraft platform's old public JSON API (see lib/minecraft/api.ts). It still
 * answers, but says it's deprecated and where its successor is.
 */
export const GET: APIRoute = async ({ params, url }) => {
  const answer = await answerApi(await getDb(), params.path ?? "", url);
  const successor = `${apiOrigin(url)}/v1/minecraft/${params.path ?? "projects"}`;
  return Response.json(answer.body, {
    status: answer.status,
    headers: {
      ...CORS,
      Deprecation: `@${String(DEPRECATED_AT)}`,
      Link: `<${successor}>; rel="successor-version", <${apiOrigin(url)}/reference/minecraft/>; rel="deprecation"`,
      "Cache-Control":
        answer.status === 200 ? "public, max-age=300" : "public, max-age=60",
      "X-Robots-Tag": "noindex",
    },
  });
};

export const OPTIONS: APIRoute = () =>
  new Response(null, {
    status: 204,
    headers: { ...CORS, "Access-Control-Max-Age": "86400" },
  });
