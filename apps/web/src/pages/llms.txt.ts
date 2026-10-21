import type { APIRoute } from "astro";
import { listPublicPosts } from "../lib/blog/store";
import { getDb } from "../lib/db";
import { llmsTxt } from "../lib/llms";
import { GAMES } from "../lib/games/registry";
import { TOOLS } from "../lib/tools/registry";
import { typeInfo } from "../lib/minecraft/catalog";
import { projectPath } from "../lib/minecraft/paths";
import { listedProjectPaths } from "../lib/minecraft/store";
import { studyPath } from "@trilleo/study";
import { studySubjects } from "../lib/study/content";
import { forumPath } from "@trilleo/forum";
import { loadTree } from "../lib/forum/store";

export const prerender = false;

export const GET: APIRoute = async () => {
  const posts = await listPublicPosts(await getDb());
  const projects = await listedProjectPaths(await getDb());
  // Forums visitors can see (categories hold no topics of their own).
  const forums = (await loadTree(await getDb()))
    .visible(null)
    .flat()
    .filter((node) => node.forum.kind === "forum");
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
    studySubjects().map((subject) => ({
      title: subject.title,
      summary: subject.summary,
      path: studyPath(subject.slug),
    })),
    forums.map((node) => ({
      name: node.forum.name,
      description: node.forum.description,
      path: forumPath(node.forum),
    })),
  );
  return new Response(text, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Cache-Control": "public, max-age=300",
    },
  });
};
