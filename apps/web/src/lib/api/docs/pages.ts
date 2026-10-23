/**
 * The docs' pages, in order: the overview, the guides, then one reference page per
 * group. Each is Markdown, written for the origin it's read from; the HTML pages
 * (src/pages/developers/), /docs.md and /llms.txt are all made from this list.
 */
import { API_GROUPS, usedGroups, type Route } from "../registry";
import type { DocContext } from "./context";
import {
  authenticationMarkdown,
  changelogMarkdown,
  conventionsMarkdown,
  errorsMarkdown,
  overviewMarkdown,
  rateLimitsMarkdown,
  versioningMarkdown,
} from "./guides";
import { groupMarkdown } from "./reference";

export interface DocPage {
  /** Its path on the API's host: "/", "/docs/errors/", "/reference/system/". */
  path: string;
  title: string;
  /** One sentence (the meta description, and llms.txt). */
  description: string;
  section: "start" | "guide" | "reference";
  markdown: (context: DocContext, routes: readonly Route[]) => string;
}

export const API_NAME = "Trilleo Network API";

const GUIDES: readonly DocPage[] = [
  {
    path: "/docs/authentication/",
    title: "Authentication",
    description:
      "API keys, the apps they belong to, scopes, and keeping keys safe.",
    section: "guide",
    markdown: (context) => authenticationMarkdown(context),
  },
  {
    path: "/docs/conventions/",
    title: "Conventions",
    description:
      "How requests and answers look on every route: JSON, dates, lists, caching, CORS.",
    section: "guide",
    markdown: (context) => conventionsMarkdown(context),
  },
  {
    path: "/docs/errors/",
    title: "Errors",
    description: "The one shape every error has, and every error code.",
    section: "guide",
    markdown: (context) => errorsMarkdown(context),
  },
  {
    path: "/docs/rate-limits/",
    title: "Rate limits",
    description:
      "How many requests a key or visitor may make, and the headers that say so.",
    section: "guide",
    markdown: () => rateLimitsMarkdown(),
  },
  {
    path: "/docs/versioning/",
    title: "Versioning",
    description: "What may change within v1, and how a client hears about it.",
    section: "guide",
    markdown: (context) => versioningMarkdown(context),
  },
  {
    path: "/docs/changelog/",
    title: "Changelog",
    description: "Every change to the API, newest first.",
    section: "guide",
    markdown: () => changelogMarkdown(),
  },
];

/** Every page, for these routes (groups without routes have no page). */
export function docPages(routes: readonly Route[]): DocPage[] {
  const groups = usedGroups(routes);
  return [
    {
      path: "/",
      title: API_NAME,
      description:
        "A JSON API for programs that work with Trilleo Network: bots, scripts and other sites.",
      section: "start",
      markdown: (context, all) => overviewMarkdown(context, all),
    },
    ...GUIDES,
    ...groups.map((group): DocPage => ({
      path: `/reference/${group}/`,
      title: API_GROUPS[group].title,
      description: API_GROUPS[group].intro,
      section: "reference",
      markdown: (context, all) => groupMarkdown(group, all, context),
    })),
  ];
}

export function findDocPage(
  routes: readonly Route[],
  path: string,
): DocPage | undefined {
  const wanted = path.endsWith("/") ? path : `${path}/`;
  return docPages(routes).find((page) => page.path === wanted);
}

/** One more `#` on each heading, outside code blocks. */
export function shiftHeadings(markdown: string): string {
  let fenced = false;
  return markdown
    .split("\n")
    .map((line) => {
      if (line.startsWith("```")) fenced = !fenced;
      return !fenced && /^#{1,5} /.test(line) ? `#${line}` : line;
    })
    .join("\n");
}

/**
 * All the docs in one Markdown file (/docs.md): what an AI agent or a person working
 * on a client needs, without following links.
 */
export function docsMarkdown(
  context: DocContext,
  routes: readonly Route[],
): string {
  const pages = docPages(routes);
  const contents = pages
    .map((page) => `- [${page.title}](${context.api}${page.path})`)
    .join("\n");
  const intro = `# ${API_NAME}

> The whole documentation of ${context.api}/v1/ in one file. It's written from the API's own code each time it's asked for, so it describes the API as it is now. The same pages are at ${context.api}/, and an OpenAPI 3.1 description is at ${context.api}/openapi.json.

## Contents

${contents}`;
  const body = pages.map((page) => {
    const text = page.markdown(context, routes);
    return page.section === "start"
      ? `## Overview\n\n${shiftHeadings(text)}`
      : `## ${page.section === "reference" ? `Reference: ${page.title}` : page.title}\n\n${page.description}\n\n${shiftHeadings(text)}`;
  });
  return `${[intro, ...body].join("\n\n---\n\n")}\n`;
}

/** /llms.txt: what the docs are and where each page is. */
export function llmsTxt(context: DocContext, routes: readonly Route[]): string {
  const pages = docPages(routes);
  const line = (page: DocPage) =>
    `- [${page.title}](${context.api}${page.path}): ${page.description}`;
  return `# ${API_NAME}

> A JSON API at ${context.api}/v1/ for programs that work with ${context.site}. Read ${context.api}/docs.md for all of the documentation in one file.

## Docs

- [Everything in one file](${context.api}/docs.md): every page below, in Markdown.
- [OpenAPI](${context.api}/openapi.json): OpenAPI 3.1 description of every route.
${pages
  .filter((page) => page.section !== "reference")
  .map(line)
  .join("\n")}

## Reference

${pages
  .filter((page) => page.section === "reference")
  .map(line)
  .join("\n")}
`;
}
