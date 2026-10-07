/**
 * /llms.txt (https://llmstxt.org): a plain Markdown map of the site for AI
 * assistants and their crawlers: what it is, then links to every public post,
 * tool and game with a line on each.
 */
import type { GameMeta, ToolMeta } from "@trilleo/tool-kit";
import { gamePath } from "./games/registry";
import { INFO_PAGES } from "./info-pages";
import { postHref } from "./posts";
import { SITE_BIO, SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "./site";
import { toolPath } from "./tools/registry";

export interface LlmsProject {
  name: string;
  summary: string;
  path: string;
  /** "Mod", "World", … */
  kind: string;
}

export interface LlmsPost {
  slug: string;
  title: string;
  description: string;
}

/** Text that can't break the Markdown list it sits in. */
function oneLine(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

/** Brackets would end the link text early. */
function linkText(text: string): string {
  return oneLine(text).replace(/[[\]]/g, "");
}

function item(name: string, path: string, note: string): string {
  const url = new URL(path, SITE_URL).href;
  const line = `- [${linkText(name)}](${url})`;
  return note ? `${line}: ${oneLine(note)}` : line;
}

export function llmsTxt(
  posts: readonly LlmsPost[],
  tools: readonly ToolMeta[],
  games: readonly GameMeta[] = [],
  projects: readonly LlmsProject[] = [],
): string {
  const live = tools.filter((tool) => tool.status !== "planned");
  const playable = games.filter((game) => game.status !== "planned");
  return [
    `# ${SITE_NAME}`,
    "",
    `> ${SITE_DESCRIPTION}`,
    "",
    SITE_BIO,
    "",
    "## Writing",
    "",
    ...(posts.length > 0
      ? posts.map((post) =>
          item(post.title, postHref(post.slug), post.description),
        )
      : ["No posts yet."]),
    "",
    "## Tools",
    "",
    ...(live.length > 0
      ? live.map((tool) =>
          item(tool.name, toolPath(tool.slug), tool.description),
        )
      : ["No tools yet."]),
    "",
    ...(playable.length > 0
      ? [
          "## Games",
          "",
          ...playable.map((game) =>
            item(game.name, gamePath(game.slug), game.description),
          ),
          "",
        ]
      : []),
    ...(projects.length > 0
      ? [
          "## Minecraft",
          "",
          item(
            "Minecraft",
            "/minecraft/",
            "Mods, plugins, worlds, builds and packs shared by their makers.",
          ),
          ...projects.map((project) =>
            item(
              project.name,
              project.path,
              `${project.kind}. ${project.summary}`,
            ),
          ),
          "",
        ]
      : []),
    "## Optional",
    "",
    item("About", "/about/", `Who runs ${SITE_NAME}, and how to get in touch.`),
    ...INFO_PAGES.map((page) => item(page.title, page.path, page.description)),
    item("RSS feed", "/rss.xml", "Every post, in full."),
    "",
  ].join("\n");
}
