import type { APIRoute } from "astro";
import { listPublicPosts } from "../lib/blog/store";
import { getDb } from "../lib/db";
import { llmsTxt } from "../lib/llms";
import { GAMES } from "../lib/games/registry";
import { TOOLS } from "../lib/tools/registry";
import { typeInfo } from "../lib/minecraft/catalog";
import { projectPath } from "../lib/minecraft/paths";
import { listedProjectPaths } from "../lib/minecraft/store";

export const prerender = false;

export const GET: APIRoute = async () => {
  const posts = await listPublicPosts(await getDb());
  const projects = await listedProjectPaths(await getDb());
  const text = llmsTxt(
    posts.map((post) => ({
      slug: post.id,
      title: post.data.title,
      description: post.data.description,
    })),
    TOOLS,
    GAMES,
    projects.map((project) => ({
      name: project.name,
      summary: project.summary,
      path: projectPath(project),
      kind: typeInfo(project.type).label,
    })),
  );
  return new Response(text, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Cache-Control": "public, max-age=300",
    },
  });
};
