/**
 * The Minecraft group: the platform's public projects, as on /minecraft/ (lib/minecraft/
 * api.ts builds the answers; its old /api/minecraft/v1/ addresses still work, marked
 * deprecated). Public: no key needed.
 */
import { SORTS } from "../../minecraft/store";
import {
  latestJson,
  projectJson,
  projectTypeOf,
  projectsJson,
} from "../../minecraft/api";
import { PROJECT_TYPES } from "../../minecraft/catalog";
import { PER_PAGE } from "../../minecraft/public";
import { ApiError } from "../errors";
import { defineRoute } from "../registry";
import { t } from "../schema";

const TYPES = PROJECT_TYPES.map((info) => info.segment);

const author = t.object({
  login: t.string({ description: "Their username on the site." }),
  name: t.nullable(
    t.string({ description: "Their name, if their profile is public." }),
  ),
  url: t.string({ format: "uri", description: "Their creations on the site." }),
});

const cardFields = {
  slug: t.string(),
  type: t.string({
    description: `What it is: ${TYPES.map((v) => `"${v}"`).join(", ")}.`,
  }),
  name: t.string(),
  summary: t.string({ description: "One line." }),
  url: t.string({ format: "uri" }),
  edition: t.string({ description: '"java", "bedrock" or "both".' }),
  downloads: t.integer({ description: "All-time downloads." }),
  tags: t.array(t.string()),
  published: t.nullable(t.dateTime("When it first had a release out.")),
  updated: t.nullable(t.dateTime("When its newest release came out.")),
};

const projectCard = t.object({
  ...cardFields,
  author: t.string({ description: "The creator's username." }),
  gameVersions: t.array(t.string(), {
    description: "Minecraft versions any release supports.",
  }),
  loaders: t.array(t.string(), {
    description: "Mod loaders or server software (fabric, paper, …).",
  }),
  imageUrl: t.nullable(
    t.string({ format: "uri", description: "Its cover picture." }),
  ),
});

const release = t.object({
  version: t.string({ description: "The release's own version, e.g. 1.4.0." }),
  title: t.nullable(t.string()),
  channel: t.string({ description: '"release", "beta" or "alpha".' }),
  url: t.string({ format: "uri" }),
  gameVersions: t.array(t.string()),
  loaders: t.array(t.string()),
  released: t.nullable(t.dateTime()),
  changelog: t.string({ description: "Markdown, as written." }),
  files: t.array(
    t.object({
      name: t.string(),
      size: t.integer({ description: "Bytes." }),
      sha256: t.nullable(t.string()),
      primary: t.boolean({
        description: "The main file (the one Download gives).",
      }),
      url: t.string({
        format: "uri",
        description: "Downloads it (a redirect; counts the download).",
      }),
    }),
  ),
  dependencies: t.array(
    t.object({
      kind: t.string({
        description: '"required", "optional", "incompatible" or "embedded".',
      }),
      name: t.string(),
      project: t.nullable(
        t.string({ description: "Its slug, when it's a project here." }),
      ),
      url: t.nullable(t.string({ format: "uri" })),
    }),
  ),
});

const EXAMPLE_RELEASE = {
  version: "1.4.0",
  title: "Autumn update",
  channel: "release",
  url: "https://www.trilleo.net/minecraft/plugins/townymenu/releases/1.4.0/",
  gameVersions: ["1.21.1", "1.21.4"],
  loaders: ["paper"],
  released: "2026-10-20T09:00:00.000Z",
  changelog: "- New town settings menu",
  files: [
    {
      name: "TownyMenu-1.4.0.jar",
      size: 183402,
      sha256: "5f2b…",
      primary: true,
      url: "https://www.trilleo.net/d/Fh3kq0/",
    },
  ],
  dependencies: [
    {
      kind: "required",
      name: "Towny",
      project: null,
      url: "https://townyadvanced.github.io/",
    },
  ],
};

const EXAMPLE_CARD = {
  slug: "townymenu",
  type: "plugins",
  name: "TownyMenu",
  summary: "Chest menus for Towny.",
  url: "https://www.trilleo.net/minecraft/plugins/townymenu/",
  edition: "java",
  author: "trilleo",
  downloads: 1204,
  gameVersions: ["1.21.1", "1.21.4"],
  loaders: ["paper"],
  tags: ["towny", "gui"],
  imageUrl: "https://files.trilleo.net/t/abc.webp",
  published: "2026-09-01T10:00:00.000Z",
  updated: "2026-10-20T09:00:00.000Z",
};

function pageCursor(page: number): string {
  return Buffer.from(`page:${String(page)}`).toString("base64url");
}

function readPageCursor(cursor: string): number {
  const text = Buffer.from(cursor, "base64url").toString();
  const page = Number(text.startsWith("page:") ? text.slice(5) : "");
  if (!Number.isSafeInteger(page) || page < 1 || page > 1000)
    throw new ApiError(
      "invalid_input",
      "That cursor isn't one this route gave.",
      {
        problems: [
          { path: "cursor", message: "That cursor isn't one this route gave." },
        ],
      },
    );
  return page;
}

export const listMinecraftProjects = defineRoute({
  method: "GET",
  path: "/v1/minecraft/projects",
  operationId: "listMinecraftProjects",
  group: "minecraft",
  summary: "List projects",
  description: `Projects listed on the platform, ${String(PER_PAGE)} a page, filtered and sorted as on /minecraft/browse/. Unlisted projects answer by slug but aren't here.`,
  auth: "public",
  cacheSeconds: 300,
  query: t.object({
    q: t.optional(
      t.string({
        max: 100,
        description: "Words in the name, summary or tags.",
      }),
    ),
    type: t.optional(t.enum(TYPES, { description: "Only this kind." })),
    version: t.optional(
      t.string({
        max: 16,
        pattern: /^[0-9a-z.]{1,16}$/i,
        patternHint: "a Minecraft version like 1.21.4",
        description: "Supports this Minecraft version.",
      }),
    ),
    loader: t.optional(
      t.string({
        max: 20,
        pattern: /^[a-z]{1,20}$/,
        patternHint: "a loader like fabric",
        description: "Runs on this loader.",
      }),
    ),
    edition: t.optional(
      t.enum(["java", "bedrock"], { description: "For this edition." }),
    ),
    tag: t.optional(
      t.string({
        max: 24,
        pattern: /^[a-z0-9-]{1,24}$/,
        patternHint: "a tag like gui",
        description: "Has this tag.",
      }),
    ),
    sort: t.optional(
      t.enum(SORTS, {
        description: 'Order (default "relevance" with q, otherwise "updated").',
      }),
    ),
    cursor: t.optional(
      t.string({ max: 100, description: "`nextCursor` from the page before." }),
    ),
  }),
  response: t.object({
    items: t.array(projectCard),
    total: t.integer({ description: "How many match, on every page." }),
    nextCursor: t.nullable(t.string()),
  }),
  example: {
    query: { type: "plugins", version: "1.21.4" },
    response: { items: [EXAMPLE_CARD], total: 1, nextCursor: null },
  },
  handler: async ({ db, query }) => {
    const page = query.cursor ? readPageCursor(query.cursor) : 1;
    const type = query.type
      ? (projectTypeOf(query.type) ?? undefined)
      : undefined;
    const answer = await projectsJson(
      db,
      {
        q: query.q?.trim() ?? "",
        version: query.version ?? "",
        loader: query.loader ?? "",
        edition: query.edition ?? "",
        tag: query.tag ?? "",
        sort: query.sort ?? "",
        page,
      },
      type,
    );
    return {
      items: answer.projects,
      total: answer.total,
      nextCursor:
        page * (answer.perPage ?? PER_PAGE) < answer.total
          ? pageCursor(page + 1)
          : null,
    };
  },
});

const slugParams = t.object({
  slug: t.string({ min: 1, max: 100, description: "The project's slug." }),
});

export const getMinecraftProject = defineRoute({
  method: "GET",
  path: "/v1/minecraft/projects/{slug}",
  operationId: "getMinecraftProject",
  group: "minecraft",
  summary: "Get a project",
  description:
    "One project with its description, gallery and every published release, newest first. Hidden and draft projects are `404 not_found`.",
  auth: "public",
  cacheSeconds: 300,
  params: slugParams,
  response: t.object({
    ...cardFields,
    description: t.string({ description: "Markdown, as written." }),
    editionName: t.string({ description: 'For people: "Java Edition", …' }),
    author,
    license: t.object({
      id: t.string({ description: 'An SPDX-like id, or "custom".' }),
      name: t.string(),
      url: t.nullable(t.string({ format: "uri" })),
      text: t.nullable(t.string({ description: "A custom licence's text." })),
    }),
    links: t.array(
      t.object({
        kind: t.string({ description: "source, issues, wiki, discord, …" }),
        url: t.string({ format: "uri" }),
      }),
    ),
    archived: t.boolean({ description: "No longer worked on." }),
    gallery: t.array(
      t.object({
        caption: t.string(),
        url: t.nullable(t.string({ format: "uri" })),
      }),
    ),
    releases: t.array(release),
  }),
  errors: ["not_found"],
  example: {
    params: { slug: "townymenu" },
    response: {
      slug: EXAMPLE_CARD.slug,
      type: EXAMPLE_CARD.type,
      name: EXAMPLE_CARD.name,
      summary: EXAMPLE_CARD.summary,
      url: EXAMPLE_CARD.url,
      edition: "java",
      downloads: 1204,
      tags: ["towny", "gui"],
      published: EXAMPLE_CARD.published,
      updated: EXAMPLE_CARD.updated,
      description: "Menus for every Towny command.",
      editionName: "Java Edition",
      author: {
        login: "trilleo",
        name: "Trilleo",
        url: "https://www.trilleo.net/minecraft/creators/trilleo/",
      },
      license: {
        id: "MIT",
        name: "MIT License",
        url: "https://opensource.org/license/mit",
        text: null,
      },
      links: [{ kind: "source", url: "https://github.com/Trilleo/TownyMenu" }],
      archived: false,
      gallery: [
        { caption: "The town menu", url: "https://files.trilleo.net/abc.webp" },
      ],
      releases: [EXAMPLE_RELEASE],
    },
  },
  handler: async ({ db, params }) => {
    const project = await projectJson(db, params.slug);
    if (!project) throw new ApiError("not_found", "There's no such project.");
    return project;
  },
});

export const getMinecraftLatest = defineRoute({
  method: "GET",
  path: "/v1/minecraft/projects/{slug}/latest",
  operationId: "getMinecraftLatest",
  group: "minecraft",
  summary: "Get the release to download",
  description:
    "The newest release that fits, as the project's Download button picks it: stable releases first unless a channel is given. `404 not_found` when nothing fits.",
  auth: "public",
  cacheSeconds: 300,
  params: slugParams,
  query: t.object({
    version: t.optional(
      t.string({ max: 16, description: "For this Minecraft version." }),
    ),
    loader: t.optional(t.string({ max: 20, description: "For this loader." })),
    channel: t.optional(
      t.enum(["release", "beta", "alpha"], {
        description: "At least this stable.",
      }),
    ),
  }),
  response: release,
  errors: ["not_found"],
  example: {
    params: { slug: "townymenu" },
    query: { version: "1.21.4", loader: "paper" },
    response: EXAMPLE_RELEASE,
  },
  handler: async ({ db, params, query }) => {
    const latest = await latestJson(db, params.slug, {
      ...(query.version ? { version: query.version } : {}),
      ...(query.loader ? { loader: query.loader } : {}),
      ...(query.channel ? { channel: query.channel } : {}),
    });
    if (!latest) throw new ApiError("not_found", "No release fits.");
    return latest;
  },
});
