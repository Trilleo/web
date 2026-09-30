import type { APIRoute } from "astro";
import { listPublicPosts } from "../lib/blog/store";
import { getDb } from "../lib/db";
import { llmsTxt } from "../lib/llms";
import { TOOLS } from "../lib/tools/registry";

export const prerender = false;

export const GET: APIRoute = async () => {
  const posts = await listPublicPosts(await getDb());
  const text = llmsTxt(
    posts.map((post) => ({
      slug: post.id,
      title: post.data.title,
      description: post.data.description,
    })),
    TOOLS,
  );
  return new Response(text, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Cache-Control": "public, max-age=300",
    },
  });
};
