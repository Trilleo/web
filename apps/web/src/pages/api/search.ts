import type { APIRoute } from "astro";
import { searchPosts } from "../../lib/blog/store";
import { getDb } from "../../lib/db";
import { postHref } from "../../lib/posts";

export const prerender = false;

/** GET /api/search?q=…: public posts matching the query, for the search box. */
export const GET: APIRoute = async ({ url }) => {
  const query = url.searchParams.get("q") ?? "";
  const results = await searchPosts(await getDb(), query);
  return Response.json(
    {
      results: results.map((result) => ({
        url: postHref(result.slug),
        title: result.title,
        excerpt: result.excerpt,
      })),
    },
    { headers: { "Cache-Control": "public, max-age=60" } },
  );
};
