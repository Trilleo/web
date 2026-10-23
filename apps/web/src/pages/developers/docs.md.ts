import type { APIRoute } from "astro";
import { docsMarkdown } from "../../lib/api/docs/pages";
import { docContext } from "../../lib/api/docs/render";
import { ROUTES } from "../../lib/api/routes";

export const prerender = false;

/** All of the API's docs in one Markdown file (api.trilleo.net/docs.md). */
export const GET: APIRoute = ({ url }) =>
  new Response(docsMarkdown(docContext(url), ROUTES), {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Cache-Control": "public, max-age=300",
      "Access-Control-Allow-Origin": "*",
    },
  });
