/**
 * The SkyBlock group: the shards (as /tools/skyblock/shards/ lists them) and their
 * Bazaar prices (lib/skyblock/bazaar.ts: fetched from Hypixel every 5 minutes, kept
 * hourly). Public.
 */
import { RARITIES } from "@trilleo/skyblock";
import { shardPath } from "@trilleo/tool-skyblock/meta";
import { SITE_URL } from "../../site";
import {
  PRICE_RANGES,
  currentPrices,
  priceHistory,
  type PriceRange,
} from "../../skyblock/bazaar";
import { shardData } from "../../skyblock/data";
import { ApiError } from "../errors";
import { defineRoute } from "../registry";
import { t } from "../schema";

const absolute = (path: string) => new URL(path, SITE_URL).href;
const coins = (description: string) =>
  t.nullable(t.number({ min: 0, description }));
const RANGES = Object.keys(PRICE_RANGES) as [PriceRange, ...PriceRange[]];

const shardFields = {
  id: t.string({ description: 'Hypixel\'s item ID, e.g. "SHARD_TIAMAT".' }),
  slug: t.string({ description: "Its address on the site." }),
  name: t.string(),
  rarity: t.enum(RARITIES),
  category: t.string({ description: "Forest, Water or Combat." }),
  families: t.array(t.string(), { description: "Its families, e.g. Reptile." }),
  attribute: t.nullable(
    t.string({ description: "The attribute it grants, e.g. Echo of Echoes." }),
  ),
  url: t.string({ format: "uri" }),
};

const EXAMPLE_SHARD = {
  id: "SHARD_TIAMAT",
  slug: "tiamat",
  name: "Tiamat",
  rarity: "legendary" as const,
  category: "Combat",
  families: ["Reptile", "Croco"],
  attribute: "Echo of Echoes",
  url: "https://www.trilleo.net/tools/skyblock/shards/tiamat/",
};

export const listSkyblockShards = defineRoute({
  method: "GET",
  path: "/v1/skyblock/shards",
  operationId: "listSkyblockShards",
  group: "skyblock",
  summary: "List shards",
  description:
    "Every shard, in SkyShards' order (by rarity, then number). Fusion recipes are on each shard's page on the site.",
  auth: "public",
  cacheSeconds: 3600,
  response: t.object({ items: t.array(t.object(shardFields)) }),
  example: { response: { items: [EXAMPLE_SHARD] } },
  handler: async ({ db }) => {
    const data = await shardData(db, null);
    return {
      items: data.catalog.shards.map((shard) => ({
        id: shard.id,
        slug: shard.slug,
        name: shard.name,
        rarity: shard.rarity,
        category: shard.category,
        families: shard.families,
        attribute: shard.attribute?.title ?? null,
        url: absolute(shardPath(shard.slug)),
      })),
    };
  },
});

const priceFields = {
  id: t.string({ description: "Hypixel's item ID." }),
  ask: coins(
    "The lowest sell offer: what buying instantly costs. Null when nobody's selling.",
  ),
  bid: coins(
    "The top buy order: what selling instantly gets. Null when nobody's buying.",
  ),
  boughtWeek: t.integer({
    min: 0,
    description: "Bought in the last week (Hypixel's moving week).",
  }),
  soldWeek: t.integer({ min: 0, description: "Sold in the last week." }),
};

export const getSkyblockPrices = defineRoute({
  method: "GET",
  path: "/v1/skyblock/prices",
  operationId: "getSkyblockPrices",
  group: "skyblock",
  summary: "Get shard prices",
  description:
    "Every shard on the Bazaar with its latest prices, as the site last fetched them (every 5 minutes). Shards not on the Bazaar are left out.",
  auth: "public",
  cacheSeconds: 60,
  response: t.object({
    fetchedAt: t.dateTime("When the site fetched these."),
    hypixelAt: t.dateTime("When Hypixel says the Bazaar was last updated."),
    items: t.array(t.object(priceFields)),
  }),
  errors: ["prices_unavailable"],
  example: {
    response: {
      fetchedAt: "2026-11-21T08:00:00.000Z",
      hypixelAt: "2026-11-21T07:59:52.000Z",
      items: [
        {
          id: "SHARD_TIAMAT",
          ask: 101109.4,
          bid: 50002.2,
          boughtWeek: 34818,
          soldWeek: 13380,
        },
      ],
    },
  },
  handler: async ({ db }) => {
    const current = await currentPrices(db);
    if (!current)
      throw new ApiError(
        "prices_unavailable",
        "The site hasn't got the Bazaar's prices yet.",
      );
    return {
      fetchedAt: current.fetchedAt.toISOString(),
      hypixelAt: current.hypixelAt.toISOString(),
      items: Object.entries(current.prices)
        .map(([id, price]) => ({ id, ...price }))
        .sort((a, b) => a.id.localeCompare(b.id)),
    };
  },
});

export const getSkyblockPriceHistory = defineRoute({
  method: "GET",
  path: "/v1/skyblock/shards/{slug}/prices",
  operationId: "getSkyblockPriceHistory",
  group: "skyblock",
  summary: "Get a shard's price history",
  description:
    "A shard's prices hour by hour (each hour's median of the site's fetches), oldest first, over the last 24 hours, 7, 30 or 90 days. Hours with no fetch are missing.",
  auth: "public",
  cacheSeconds: 300,
  params: t.object({ slug: t.string({ min: 1, max: 100 }) }),
  query: t.object({
    range: t.optional(
      t.enum(RANGES, {
        description: "How far back: 24h, 7d (the default), 30d or 90d.",
      }),
    ),
  }),
  response: t.object({
    id: t.string(),
    slug: t.string(),
    range: t.enum(RANGES),
    points: t.array(
      t.object({
        hour: t.dateTime("The hour's start (UTC)."),
        ask: coins("The hour's median lowest sell offer."),
        bid: coins("The hour's median top buy order."),
      }),
    ),
  }),
  errors: ["not_found"],
  example: {
    params: { slug: "tiamat" },
    query: { range: "24h" },
    response: {
      id: "SHARD_TIAMAT",
      slug: "tiamat",
      range: "24h",
      points: [
        { hour: "2026-11-21T07:00:00.000Z", ask: 101109.4, bid: 50002.2 },
      ],
    },
  },
  handler: async ({ db, params, query }) => {
    const data = await shardData(db, null);
    const shard = data.catalog.bySlugOf(params.slug);
    if (!shard) throw new ApiError("not_found", "There's no such shard.");
    const range = query.range ?? "7d";
    const points = await priceHistory(db, shard.id, range);
    return {
      id: shard.id,
      slug: shard.slug,
      range,
      points: points.map((point) => ({
        hour: point.hour.toISOString(),
        ask: point.ask,
        bid: point.bid,
      })),
    };
  },
});
