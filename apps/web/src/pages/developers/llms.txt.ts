import type { APIRoute } from "astro";
import { llmsTxt } from "../../lib/api/docs/pages";
import { docContext } from "../../lib/api/docs/render";
import { ROUTES } from "../../lib/api/routes";

export const prerender = false;

/** An index of the API's docs for AI assistants (api.trilleo.net/llms.txt). */
export const GET: APIRoute = ({ url }) =>
  new Response(llmsTxt(docContext(url), ROUTES), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=300",
    },
  });
