/** The Site group: what the site is and what's on it (tools, games). Public. */
import type { ToolMeta } from "@trilleo/tool-kit";
import { GAMES, gamePath } from "../../games/registry";
import { NAV_ITEMS, SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "../../site";
import { TOOLS, toolPath } from "../../tools/registry";
import { wikiOrigin } from "../../wiki/host";
import { defineRoute } from "../registry";
import { t } from "../schema";

const absolute = (path: string) => new URL(path, SITE_URL).href;

const link = t.object({ name: t.string(), url: t.string({ format: "uri" }) });

export const getSite = defineRoute({
  method: "GET",
  path: "/v1/site",
  operationId: "getSite",
  group: "site",
  summary: "Get the site's details",
  description: "Its name and address, its sections, and its feeds.",
  auth: "public",
  cacheSeconds: 3600,
  response: t.object({
    name: t.string(),
    description: t.string(),
    url: t.string({ format: "uri" }),
    sections: t.array(link),
    feeds: t.array(link, { description: "RSS feeds." }),
    docs: t.string({ format: "uri", description: "These docs." }),
  }),
  example: {
    response: {
      name: "Trilleo Network",
      description: "Writing, tools, and experiments on the web.",
      url: "https://www.trilleo.net/",
      sections: [{ name: "Writing", url: "https://www.trilleo.net/writing/" }],
      feeds: [{ name: "Writing", url: "https://www.trilleo.net/rss.xml" }],
      docs: "https://api.trilleo.net/",
    },
  },
  handler: ({ apiOrigin }) => ({
    name: SITE_NAME,
    description: SITE_DESCRIPTION,
    url: absolute("/"),
    sections: [
      ...NAV_ITEMS.map((item) => ({
        name: item.label,
        url: absolute(item.href),
      })),
      { name: "Minecraft", url: absolute("/minecraft/") },
      { name: "Study", url: absolute("/study/") },
      { name: "Forum", url: absolute("/forum/") },
      { name: "Wiki", url: `${wikiOrigin(new URL(SITE_URL))}/` },
    ],
    feeds: [
      { name: "Writing", url: absolute("/rss.xml") },
      { name: "Forum", url: absolute("/forum/rss.xml") },
    ],
    docs: `${apiOrigin}/`,
  }),
});

const listing = t.object({
  items: t.array(
    t.object({
      slug: t.string(),
      name: t.string(),
      description: t.string(),
      status: t.enum(["planned", "in-progress", "live"], {
        description: "Planned ones have no page yet (`url` is null).",
      }),
      url: t.nullable(t.string({ format: "uri" })),
    }),
  ),
});

function listingOf(metas: readonly ToolMeta[], path: (slug: string) => string) {
  return {
    items: metas.map((meta) => ({
      slug: meta.slug,
      name: meta.name,
      description: meta.description,
      status: meta.status,
      url: meta.status === "planned" ? null : absolute(path(meta.slug)),
    })),
  };
}

export const listTools = defineRoute({
  method: "GET",
  path: "/v1/tools",
  operationId: "listTools",
  group: "site",
  summary: "List tools",
  description: "The browser tools on /tools/, in the site's order.",
  auth: "public",
  cacheSeconds: 3600,
  response: listing,
  example: {
    response: {
      items: [
        {
          slug: "qr",
          name: "QR codes",
          description: "Make QR codes for links, text and Wi-Fi.",
          status: "live",
          url: "https://www.trilleo.net/tools/qr/",
        },
      ],
    },
  },
  handler: () => listingOf(TOOLS, toolPath),
});

export const listGames = defineRoute({
  method: "GET",
  path: "/v1/games",
  operationId: "listGames",
  group: "site",
  summary: "List games",
  description: "The games on /games/, in the site's order.",
  auth: "public",
  cacheSeconds: 3600,
  response: listing,
  example: {
    response: {
      items: [
        {
          slug: "hotfix",
          name: "Hotfix",
          description: "An endless runner.",
          status: "live",
          url: "https://www.trilleo.net/games/hotfix/",
        },
      ],
    },
  },
  handler: () => listingOf(GAMES, gamePath),
});
