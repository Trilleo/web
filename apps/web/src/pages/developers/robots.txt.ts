import type { APIRoute } from "astro";

export const prerender = false;

/** The API host's robots.txt: the docs yes, the API itself no. */
export const GET: APIRoute = () =>
  new Response(["User-agent: *", "Allow: /", "Disallow: /v1/", ""].join("\n"), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
