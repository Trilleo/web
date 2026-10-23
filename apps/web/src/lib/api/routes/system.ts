/** The System group: the API's state, and who a key belongs to. */
import { defineRoute } from "../registry";
import { t } from "../schema";
import { API_SCOPES } from "../scopes";
import { usageSummary } from "../usage";

export const API_VERSION = "v1";

export const getStatus = defineRoute({
  method: "GET",
  path: "/v1/status",
  operationId: "getStatus",
  group: "system",
  summary: "Check that the API is up",
  description:
    "Answers without touching anything else, so it works as a health check. Needs no key.",
  auth: "public",
  cacheSeconds: 0,
  response: t.object({
    ok: t.boolean({ description: "Always true when you get an answer." }),
    version: t.string({ description: 'The API version: "v1".' }),
    time: t.dateTime("The server's clock."),
    docs: t.string({ description: "Where the docs are.", format: "uri" }),
  }),
  example: {
    response: {
      ok: true,
      version: "v1",
      time: "2026-10-23T08:00:00.000Z",
      docs: "https://api.trilleo.net/",
    },
  },
  handler: ({ now, apiOrigin }) => ({
    ok: true,
    version: API_VERSION,
    time: now.toISOString(),
    docs: `${apiOrigin}/`,
  }),
});

const scopeList = t.array(
  t.enum(Object.keys(API_SCOPES) as (keyof typeof API_SCOPES)[]),
  { description: "What this key may do (see Authentication)." },
);

export const getMe = defineRoute({
  method: "GET",
  path: "/v1/me",
  operationId: "getMe",
  group: "system",
  summary: "Get the calling app and key",
  description:
    "Which app and key the request was made with, the key's scopes and its rate limit. A good first call to check that a key works.",
  auth: "key",
  response: t.object({
    app: t.object({
      id: t.integer({ description: "The app's number." }),
      name: t.string(),
      description: t.string(),
    }),
    key: t.object({
      id: t.integer(),
      name: t.string({ description: "The label it was given." }),
      prefix: t.string({
        description: "Its first characters, as the control panel shows them.",
      }),
      createdAt: t.dateTime(),
      expiresAt: t.nullable(t.dateTime("When it stops working, if ever.")),
    }),
    scopes: scopeList,
    rateLimit: t.object({
      limit: t.integer({ description: "Requests per minute." }),
      remaining: t.integer({ description: "Requests left right now." }),
      reset: t.integer({ description: "Seconds until the bucket is full." }),
    }),
  }),
  example: {
    response: {
      app: { id: 1, name: "Discord bot", description: "The server's bot." },
      key: {
        id: 3,
        name: "Production",
        prefix: "trl_a1B2c3",
        createdAt: "2026-10-23T08:00:00.000Z",
        expiresAt: null,
      },
      scopes: ["usage:read"],
      rateLimit: { limit: 120, remaining: 119, reset: 1 },
    },
  },
  handler: ({ caller, rate }) => {
    if (!caller) throw new Error("getMe needs a key.");
    return {
      app: {
        id: caller.app.id,
        name: caller.app.name,
        description: caller.app.description,
      },
      key: {
        id: caller.key.id,
        name: caller.key.name,
        prefix: caller.key.prefix,
        createdAt: caller.key.createdAt.toISOString(),
        expiresAt: caller.key.expiresAt?.toISOString() ?? null,
      },
      scopes: caller.scopes,
      rateLimit: {
        limit: rate.limit,
        remaining: rate.remaining,
        reset: rate.reset,
      },
    };
  },
});

export const getMyUsage = defineRoute({
  method: "GET",
  path: "/v1/me/usage",
  operationId: "getMyUsage",
  group: "system",
  summary: "Get the app's request counts",
  description:
    "Requests made with any of the app's keys, per UTC day (oldest first, days without requests as 0) and per route. Counts are updated as requests happen.",
  auth: "key",
  scope: "usage:read",
  query: t.object({
    days: t.optional(
      t.integer({
        min: 1,
        max: 90,
        description: "How many days, up to today. Default 30.",
      }),
    ),
  }),
  response: t.object({
    requests: t.integer({ description: "Total over the period." }),
    errors: t.integer({
      description: "Of those, answers with a 4xx or 5xx status.",
    }),
    days: t.array(
      t.object({
        day: t.date(),
        requests: t.integer(),
        errors: t.integer(),
      }),
    ),
    routes: t.array(
      t.object({
        route: t.string({ description: 'Method and path, e.g. "GET /v1/me".' }),
        requests: t.integer(),
        errors: t.integer(),
        averageMs: t.integer({ description: "Average time to answer." }),
      }),
    ),
  }),
  example: {
    query: { days: 2 },
    response: {
      requests: 14,
      errors: 1,
      days: [
        { day: "2026-10-22", requests: 9, errors: 0 },
        { day: "2026-10-23", requests: 5, errors: 1 },
      ],
      routes: [{ route: "GET /v1/me", requests: 14, errors: 1, averageMs: 4 }],
    },
  },
  handler: async ({ db, caller, query, now }) => {
    if (!caller) throw new Error("getMyUsage needs a key.");
    return usageSummary(db, { appId: caller.app.id }, query.days ?? 30, now);
  },
});
