import type { APIRoute } from "astro";
import { getDb } from "../../../../lib/db";
import { answerApi } from "../../../../lib/minecraft/api";

export const prerender = false;

/** Any site may read the API (it's public data), but only with GET. */
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

/** The Minecraft platform's public, read-only JSON API (see lib/minecraft/api.ts). */
export const GET: APIRoute = async ({ params, url }) => {
  const answer = await answerApi(await getDb(), params.path ?? "", url);
  return Response.json(answer.body, {
    status: answer.status,
    headers: {
      ...CORS,
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
