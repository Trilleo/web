import type { APIRoute } from "astro";
import { openApiDocument } from "../../lib/api/docs/openapi";
import { docContext } from "../../lib/api/docs/render";
import { ROUTES } from "../../lib/api/routes";

export const prerender = false;

/** The API as OpenAPI 3.1 (api.trilleo.net/openapi.json). */
export const GET: APIRoute = ({ url }) =>
  new Response(
    JSON.stringify(openApiDocument(docContext(url), ROUTES), null, 2),
    {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "public, max-age=300",
        "Access-Control-Allow-Origin": "*",
      },
    },
  );
