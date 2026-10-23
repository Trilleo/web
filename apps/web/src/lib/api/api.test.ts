import {
  apiErrors,
  apiUsage,
  openDatabase,
  type DatabaseHandle,
} from "@trilleo/db";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { dispatch, type DispatchDeps } from "./dispatch";
import {
  docPages,
  docsMarkdown,
  findDocPage,
  llmsTxt,
  shiftHeadings,
} from "./docs/pages";
import { openApiDocument } from "./docs/openapi";
import { routeErrors } from "./docs/reference";
import { ERROR_CODES } from "./errors";
import {
  apiOrigin,
  apiRedirect,
  apiRewrite,
  isApiHost,
  siteOrigin,
} from "./host";
import {
  authenticate,
  checkAppInput,
  createApp,
  createKey,
  deleteApp,
  generateKey,
  hashKey,
  listApps,
  looksLikeKey,
  revokeKey,
  setAppDisabled,
} from "./keys";
import { API_LIMITS } from "./limits";
import { RateLimiter } from "./rate-limit";
import { API_GROUPS, defineRoute, matchPath, type Route } from "./registry";
import { ROUTES } from "./routes";
import { check, fieldRows, t } from "./schema";
import { effectiveScopes } from "./scopes";
import { purgeUsage, recentErrors, usageSummary } from "./usage";

/** An answer's body: each test reads the fields it expects. */
interface Body {
  error: {
    code: string;
    message: string;
    details?: unknown;
    requestId: string;
  };
  routes: { route: string; requests: number }[];
  [field: string]: unknown;
}

const T0 = new Date("2026-10-23T08:00:00.000Z");
const API = "https://api.trilleo.net";
const SITE = "https://www.trilleo.net";

describe("schemas", () => {
  const body = t.object({
    name: t.string({ min: 1, max: 5 }),
    count: t.optional(t.integer({ min: 1, max: 9 })),
    kind: t.enum(["a", "b"]),
    tags: t.optional(t.array(t.string(), { max: 2 })),
    when: t.optional(t.date()),
    flag: t.optional(t.boolean()),
  });

  it("checks values and ignores fields it doesn't know", () => {
    expect(check(body, { name: "x", kind: "a", extra: 1 })).toEqual({
      ok: true,
      value: { name: "x", kind: "a" },
    });
  });

  it("collects every problem, with its path", () => {
    const result = check(body, {
      name: "",
      count: 1.5,
      kind: "c",
      tags: ["a", 2],
      when: "23/10",
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.problems.map((p) => p.path)).toEqual([
      "name",
      "count",
      "kind",
      "tags[1]",
      "when",
    ]);
    expect(result.problems[0]?.message).toBe("`name` can't be empty.");
  });

  it("reads numbers and booleans from text only when told to", () => {
    expect(
      check(body, { name: "x", kind: "a", count: "3", flag: "true" }, true),
    ).toEqual({
      ok: true,
      value: { name: "x", kind: "a", count: 3, flag: true },
    });
    expect(check(body, { name: "x", kind: "a", count: "3" }).ok).toBe(false);
    // An empty query parameter counts as left out.
    expect(check(body, { name: "x", kind: "a", count: "" }, true).ok).toBe(
      true,
    );
  });

  it("requires fields that aren't optional", () => {
    const result = check(body, { kind: "a" });
    expect(result.ok ? [] : result.problems).toEqual([
      { path: "name", message: "`name` is required." },
    ]);
  });

  it("describes itself as JSON Schema and as table rows", () => {
    const answer = t.object({
      at: t.nullable(t.dateTime("When.")),
      items: t.array(t.object({ id: t.integer() })),
    });
    expect(answer.json()).toEqual({
      type: "object",
      properties: {
        at: {
          type: ["string", "null"],
          format: "date-time",
          examples: ["2026-10-23T08:00:00.000Z"],
          description: "When.",
        },
        items: {
          type: "array",
          items: {
            type: "object",
            properties: { id: { type: "integer" } },
            required: ["id"],
          },
        },
      },
      required: ["at", "items"],
    });
    expect(fieldRows(answer).map((row) => `${row.name}: ${row.type}`)).toEqual([
      "at: string (date-time) or null",
      "items: array of object",
      "items[].id: integer",
    ]);
  });
});

describe("rate limits", () => {
  it("allows a burst up to the limit, then refills steadily", () => {
    const limiter = new RateLimiter();
    const at = T0.getTime();
    for (let i = 0; i < 3; i++) expect(limiter.take("k", 3, at).ok).toBe(true);
    const refused = limiter.take("k", 3, at);
    expect(refused).toMatchObject({ ok: false, remaining: 0, reset: 20 });
    // One request back every 20 s at 3 a minute.
    expect(limiter.take("k", 3, at + 20_000).ok).toBe(true);
    expect(limiter.take("k", 3, at + 20_000).ok).toBe(false);
    // Buckets are separate.
    expect(limiter.take("other", 3, at).remaining).toBe(2);
    // Idle ones are forgotten.
    limiter.take("third", 3, at + 200_000);
    expect(limiter.size).toBe(1);
  });
});

describe("scopes", () => {
  it("are the key's own, within the app's, and only ones the code knows", () => {
    expect(effectiveScopes(["usage:read", "gone:old"], null)).toEqual([
      "usage:read",
    ]);
    expect(effectiveScopes(["usage:read"], [])).toEqual([]);
    expect(effectiveScopes([], ["usage:read"])).toEqual([]);
  });
});

describe("hosts", () => {
  it("knows the API's host and rewrites its paths", () => {
    expect(isApiHost(new URL("https://api.trilleo.net/v1/me"))).toBe(true);
    expect(isApiHost(new URL("https://www.trilleo.net/api/v1/me"))).toBe(false);
    expect(apiRewrite(new URL("https://api.trilleo.net/v1/me?x=1"))?.href).toBe(
      "https://api.trilleo.net/api/v1/me?x=1",
    );
    expect(
      apiRewrite(new URL("https://api.trilleo.net/docs/errors/"))?.pathname,
    ).toBe("/developers/docs/errors/");
    expect(apiRewrite(new URL("https://api.trilleo.net/"))?.pathname).toBe(
      "/developers/",
    );
    expect(
      apiRewrite(new URL("https://api.trilleo.net/_astro/a.css")),
    ).toBeNull();
  });

  it("finds each origin from the other", () => {
    expect(apiOrigin(new URL(`${SITE}/admin/api/`))).toBe(API);
    expect(siteOrigin(new URL(`${API}/v1/me`))).toBe(SITE);
    expect(apiOrigin(new URL("http://127.0.0.1:4329/"))).toBe(
      "http://api.localhost:4329",
    );
    expect(apiOrigin(new URL("http://localhost:4321/"))).toBe(
      "http://api.localhost:4321",
    );
    expect(siteOrigin(new URL("http://api.localhost:4321/"))).toBe(
      "http://localhost:4321",
    );
  });

  it("sends /developers/ on the site to the API's host", () => {
    expect(apiRedirect(new URL(`${SITE}/developers/docs/errors/?a=1`))).toBe(
      `${API}/docs/errors/?a=1`,
    );
    expect(apiRedirect(new URL(`${SITE}/developersx`))).toBeNull();
    expect(apiRedirect(new URL(`${API}/developers/`))).toBeNull();
  });
});

describe("keys", () => {
  it("are random, recognisable, and stored only as hashes", () => {
    const key = generateKey();
    expect(looksLikeKey(key)).toBe(true);
    expect(generateKey()).not.toBe(key);
    expect(hashKey(key)).toMatch(/^[0-9a-f]{64}$/);
    expect(looksLikeKey("trl_short")).toBe(false);
  });

  it("checks the app form", () => {
    const base = {
      name: " Bot ",
      description: "",
      scopes: ["usage:read", "nope"],
      rateLimit: 10,
    };
    expect(checkAppInput(base)).toEqual({
      ok: true,
      value: {
        name: "Bot",
        description: "",
        scopes: ["usage:read"],
        rateLimit: 10,
      },
    });
    expect(checkAppInput({ ...base, name: " " })).toEqual({
      ok: false,
      problem: "name",
    });
    expect(
      checkAppInput({ ...base, rateLimit: API_LIMITS.maxPerMinute + 1 }),
    ).toEqual({
      ok: false,
      problem: "rateLimit",
    });
  });
});

/** Every route the docs promise: examples fit their own schemas, and each is written up. */
describe("the route list", () => {
  it("has unique ids and operation ids, and known groups", () => {
    expect(new Set(ROUTES.map((route) => route.id)).size).toBe(ROUTES.length);
    expect(new Set(ROUTES.map((route) => route.operationId)).size).toBe(
      ROUTES.length,
    );
    for (const route of ROUTES) {
      expect(Object.keys(API_GROUPS)).toContain(route.group);
      expect(route.path).toMatch(/^\/v1\//);
      expect(route.summary).not.toMatch(/\.$/);
    }
  });

  it.each(ROUTES.map((route) => [route.id, route] as const))(
    "%s: examples fit its schemas",
    (_id, route) => {
      expect(check(route.response, route.example.response)).toMatchObject({
        ok: true,
      });
      if (route.params) {
        expect(route.example.params).toBeDefined();
        expect(check(route.params, route.example.params, true)).toMatchObject({
          ok: true,
        });
      }
      if (route.body) {
        expect(route.example.body).toBeDefined();
        expect(check(route.body, route.example.body)).toMatchObject({
          ok: true,
        });
      }
      if (route.query && route.example.query)
        expect(check(route.query, route.example.query, true)).toMatchObject({
          ok: true,
        });
      for (const code of routeErrors(route))
        expect(ERROR_CODES[code]).toBeDefined();
    },
  );
});

describe("docs", () => {
  const context = { api: API, site: SITE };

  it("give every route a section, on its group's page and in docs.md", () => {
    const all = docsMarkdown(context, ROUTES);
    for (const route of ROUTES) {
      const page = findDocPage(ROUTES, `/reference/${route.group}/`);
      expect(page).toBeDefined();
      expect(page?.markdown(context, ROUTES)).toContain(
        `\`${route.method} ${route.path}\``,
      );
      expect(all).toContain(`### ${route.summary}`);
    }
    for (const code of Object.keys(ERROR_CODES))
      expect(all).toContain(`\`${code}\``);
    expect(all).toContain(`${API}/v1/me`);
    expect(all.startsWith("# Trilleo Network API")).toBe(true);
  });

  it("link only to pages that exist", () => {
    const paths = new Set(docPages(ROUTES).map((page) => page.path));
    const extra = new Set(["/docs.md", "/openapi.json", "/llms.txt"]);
    for (const page of docPages(ROUTES)) {
      const text = page.markdown(context, ROUTES);
      for (const match of text.matchAll(
        /\]\((https:\/\/api\.trilleo\.net[^)#\s]*)/g,
      )) {
        const path = new URL(match[1] ?? "").pathname;
        expect(
          paths.has(path) || extra.has(path),
          `${page.path} → ${path}`,
        ).toBe(true);
      }
    }
    expect(llmsTxt(context, ROUTES)).toContain(`${API}/docs.md`);
  });

  it("shift headings outside code only", () => {
    expect(shiftHeadings("## A\n```\n# not\n```\n### B")).toBe(
      "### A\n```\n# not\n```\n#### B",
    );
  });

  it("describe every route in OpenAPI", () => {
    const doc = openApiDocument(context, ROUTES) as {
      openapi: string;
      paths: Record<
        string,
        Record<
          string,
          { operationId: string; responses: Record<string, unknown> }
        >
      >;
    };
    expect(doc.openapi).toBe("3.1.0");
    for (const route of ROUTES) {
      const op = doc.paths[route.path]?.[route.method.toLowerCase()];
      expect(op?.operationId).toBe(route.operationId);
      expect(op?.responses[String(route.status)]).toBeDefined();
    }
  });
});

describe("matching", () => {
  it("fills in path parameters and allows a trailing slash", () => {
    const route = defineRoute({
      method: "GET",
      path: "/v1/things/{id}",
      operationId: "getThing",
      group: "system",
      summary: "Get a thing",
      auth: "public",
      params: t.object({ id: t.string() }),
      response: t.object({}),
      example: { params: { id: "a" }, response: {} },
      handler: () => ({}),
    });
    expect(matchPath([route], "/v1/things/a%20b/")[0]?.params).toEqual({
      id: "a b",
    });
    expect(matchPath([route], "/v1/things")).toEqual([]);
  });
});

describe("dispatch", () => {
  let handle: DatabaseHandle;
  let limiter: RateLimiter;
  let clock: Date;

  // A route with a body, to test what bodies can get wrong.
  const echo = defineRoute({
    method: "POST",
    path: "/v1/echo",
    operationId: "echo",
    group: "system",
    summary: "Echo",
    auth: "key",
    body: t.object({ word: t.string({ max: 10 }) }),
    response: t.object({ word: t.string() }),
    example: { body: { word: "hi" }, response: { word: "hi" } },
    handler: ({ body }) => ({ word: body.word }),
  });
  const broken = defineRoute({
    method: "GET",
    path: "/v1/broken",
    operationId: "broken",
    group: "system",
    summary: "Break",
    auth: "key",
    response: t.object({}),
    example: { response: {} },
    handler: () => {
      throw new Error("boom");
    },
  });
  const routes: Route[] = [...ROUTES, echo, broken];

  const deps = (): DispatchDeps => ({
    getDb: () => Promise.resolve(handle.db),
    limiter,
    routes,
    clientIp: "203.0.113.9",
    apiOrigin: API,
    siteOrigin: SITE,
    now: () => clock,
    purge: false,
  });

  async function call(
    path: string,
    init: RequestInit & { key?: string } = {},
  ): Promise<{ status: number; headers: Headers; body: Body }> {
    const headers = new Headers(init.headers);
    if (init.key) headers.set("Authorization", `Bearer ${init.key}`);
    const url = new URL(path, API);
    const response = await dispatch(
      new Request(url, { ...init, headers }),
      url,
      deps(),
    );
    const text = await response.text();
    return {
      status: response.status,
      headers: response.headers,
      body: (text ? JSON.parse(text) : {}) as Body,
    };
  }

  async function newKey(scopes: string[] = ["usage:read"], rateLimit = 120) {
    const app = await createApp(
      handle.db,
      { name: "Bot", description: "A bot.", scopes, rateLimit },
      null,
    );
    const made = await createKey(
      handle.db,
      app.id,
      { name: "Prod", scopes: null, expiresAt: null },
      clock,
    );
    if (!made.ok) throw new Error(made.problem);
    return { app, key: made.key, secret: made.secret };
  }

  beforeEach(async () => {
    handle = await openDatabase("memory://");
    limiter = new RateLimiter();
    clock = T0;
  });
  afterEach(async () => {
    await handle.close();
  });

  it("answers the status route without a key, cacheable and open to browsers", async () => {
    const answer = await call("/v1/status");
    expect(answer.status).toBe(200);
    expect(answer.body).toEqual({
      ok: true,
      version: "v1",
      time: T0.toISOString(),
      docs: `${API}/`,
    });
    expect(answer.headers.get("Request-Id")).toMatch(/^req_/);
    expect(answer.headers.get("Access-Control-Allow-Origin")).toBe("*");
    expect(answer.headers.get("RateLimit-Limit")).toBe(
      String(API_LIMITS.anonymousPerMinute),
    );
  });

  it("serves the site's /api/v1/ addresses too", async () => {
    const url = new URL("/api/v1/status", SITE);
    const response = await dispatch(new Request(url), url, deps());
    expect(response.status).toBe(200);
  });

  it("tells who's calling", async () => {
    const { app, key, secret } = await newKey();
    const answer = await call("/v1/me", { key: secret });
    expect(answer.status).toBe(200);
    expect(answer.body).toEqual({
      app: { id: app.id, name: "Bot", description: "A bot." },
      key: {
        id: key.id,
        name: "Prod",
        prefix: secret.slice(0, 10),
        createdAt: T0.toISOString(),
        expiresAt: null,
      },
      scopes: ["usage:read"],
      rateLimit: { limit: 120, remaining: 119, reset: 1 },
    });
    expect(answer.headers.get("Cache-Control")).toBe("private, no-store");
    expect(answer.headers.get("Access-Control-Allow-Origin")).toBeNull();
  });

  it("refuses missing, malformed, unknown, revoked and expired keys, and switched-off apps", async () => {
    expect((await call("/v1/me")).body.error.code).toBe("missing_key");
    expect(
      (await call("/v1/me", { headers: { Authorization: "Token x" } })).body
        .error.code,
    ).toBe("invalid_key");
    expect((await call("/v1/me", { key: generateKey() })).status).toBe(401);
    // A bad key on a public route is an error too, not ignored.
    expect(
      (await call("/v1/status", { key: "trl_nope" })).body.error.code,
    ).toBe("invalid_key");

    const { app, key, secret } = await newKey();
    await setAppDisabled(handle.db, app.id, true, clock);
    const off = await call("/v1/me", { key: secret });
    expect([off.status, off.body.error.code]).toEqual([403, "app_disabled"]);
    await setAppDisabled(handle.db, app.id, false, clock);
    expect((await call("/v1/me", { key: secret })).status).toBe(200);

    await revokeKey(handle.db, app.id, key.id, clock);
    expect((await call("/v1/me", { key: secret })).body.error.code).toBe(
      "key_revoked",
    );

    const soon = await createKey(
      handle.db,
      app.id,
      { name: "Soon", scopes: null, expiresAt: new Date(T0.getTime() + 1000) },
      clock,
    );
    if (!soon.ok) throw new Error(soon.problem);
    clock = new Date(T0.getTime() + 2000);
    expect((await call("/v1/me", { key: soon.secret })).body.error.code).toBe(
      "key_expired",
    );
  });

  it("checks scopes", async () => {
    const { secret } = await newKey([]);
    const answer = await call("/v1/me/usage", { key: secret });
    expect(answer.status).toBe(403);
    expect(answer.body.error).toMatchObject({
      code: "insufficient_scope",
      details: { required: "usage:read" },
    });
  });

  it("gives a key only the scopes chosen for it", async () => {
    const { app } = await newKey(["usage:read"]);
    const made = await createKey(
      handle.db,
      app.id,
      { name: "Narrow", scopes: [], expiresAt: null },
      clock,
    );
    if (!made.ok) throw new Error(made.problem);
    expect((await call("/v1/me", { key: made.secret })).body.scopes).toEqual(
      [],
    );
    expect((await call("/v1/me/usage", { key: made.secret })).status).toBe(403);
  });

  it("counts requests per route and day, and lists failures", async () => {
    const { app, secret } = await newKey();
    await call("/v1/me", { key: secret });
    await call("/v1/me", { key: secret });
    await call("/v1/me/usage?days=0", { key: secret });
    clock = new Date(T0.getTime() + 24 * 3600 * 1000);
    const usage = await call("/v1/me/usage?days=2", { key: secret });
    expect(usage.status).toBe(200);
    expect(usage.body.days).toEqual([
      { day: "2026-10-23", requests: 3, errors: 1 },
      { day: "2026-10-24", requests: 0, errors: 0 },
    ]);
    expect(usage.body.routes.map((r) => [r.route, r.requests])).toEqual([
      ["GET /v1/me", 2],
      ["GET /v1/me/usage", 1],
    ]);
    const failures = await recentErrors(handle.db, app.id);
    expect(failures).toHaveLength(1);
    expect(failures[0]).toMatchObject({
      path: "/v1/me/usage?days=0",
      status: 400,
      code: "invalid_input",
      keyName: "Prod",
    });
    // The usage call itself counts too, on its own day.
    const summary = await usageSummary(handle.db, { appId: app.id }, 2, clock);
    expect(summary.requests).toBe(4);
  });

  it("explains bad input", async () => {
    const { secret } = await newKey();
    const answer = await call("/v1/me/usage?days=500", { key: secret });
    expect(answer.status).toBe(400);
    expect(answer.body.error).toMatchObject({
      code: "invalid_input",
      message: "`days` must be between 1 and 90.",
      details: {
        problems: [
          { path: "days", message: "`days` must be between 1 and 90." },
        ],
      },
    });
    expect(answer.body.error.requestId).toBe(answer.headers.get("Request-Id"));
  });

  it("checks bodies: JSON only, not too large, well formed, valid", async () => {
    const { secret } = await newKey();
    const post = (body: string, type = "application/json") =>
      call("/v1/echo", {
        method: "POST",
        key: secret,
        body,
        headers: { "Content-Type": type },
      });
    expect((await post('{"word":"hi"}')).body).toEqual({ word: "hi" });
    expect(
      (await post("word=hi", "application/x-www-form-urlencoded")).body.error
        .code,
    ).toBe("unsupported_media_type");
    expect((await post("{nope")).body.error.code).toBe("invalid_json");
    expect((await post('{"word":"far too long a word"}')).body.error.code).toBe(
      "invalid_input",
    );
    const big = JSON.stringify({ word: "x".repeat(API_LIMITS.bodyBytes) });
    expect((await post(big)).status).toBe(413);
  });

  it("answers unknown routes and methods", async () => {
    expect((await call("/v1/nothing")).body.error.code).toBe("not_found");
    const wrong = await call("/v1/status", { method: "DELETE" });
    expect(wrong.status).toBe(405);
    expect(wrong.headers.get("Allow")).toBe("GET, OPTIONS");
  });

  it("answers browsers' preflight for public routes only", async () => {
    const open = await call("/v1/status", { method: "OPTIONS" });
    expect(open.status).toBe(204);
    expect(open.headers.get("Access-Control-Allow-Origin")).toBe("*");
    const keyed = await call("/v1/me", { method: "OPTIONS" });
    expect(keyed.status).toBe(204);
    expect(keyed.headers.get("Access-Control-Allow-Origin")).toBeNull();
  });

  it("supports HEAD", async () => {
    const url = new URL("/v1/status", API);
    const response = await dispatch(
      new Request(url, { method: "HEAD" }),
      url,
      deps(),
    );
    expect(response.status).toBe(200);
    expect(await response.text()).toBe("");
  });

  it("limits requests per key, with Retry-After", async () => {
    const { secret } = await newKey([], 2);
    expect((await call("/v1/me", { key: secret })).status).toBe(200);
    expect(
      (await call("/v1/me", { key: secret })).headers.get(
        "RateLimit-Remaining",
      ),
    ).toBe("0");
    const over = await call("/v1/me", { key: secret });
    expect(over.status).toBe(429);
    expect(over.headers.get("Retry-After")).toBe("30");
    expect(over.body.error.details).toEqual({ retryAfter: 30 });
    // Counted, but not listed as a failure.
    const rows = await handle.db.select().from(apiUsage);
    expect(rows[0]).toMatchObject({ count: 3, errors: 1 });
    expect(await handle.db.select().from(apiErrors)).toHaveLength(0);
  });

  it("limits requests without a key per visitor", async () => {
    for (let i = 0; i < API_LIMITS.anonymousPerMinute; i++)
      await call("/v1/status");
    expect((await call("/v1/status")).body.error.code).toBe("rate_limited");
  });

  it("hides what broke, and says which request it was", async () => {
    const { secret } = await newKey();
    const errors: unknown[] = [];
    const original = console.error;
    console.error = (...args: unknown[]) => errors.push(args);
    try {
      const answer = await call("/v1/broken", { key: secret });
      expect(answer.status).toBe(500);
      expect(answer.body.error.code).toBe("internal_error");
      expect(answer.body.error.message).not.toContain("boom");
    } finally {
      console.error = original;
    }
    expect(errors).toHaveLength(1);
  });

  it("keeps the app list, key limits and deletion in order", async () => {
    const { app } = await newKey();
    for (let i = 1; i < API_LIMITS.keysPerApp; i++)
      await createKey(
        handle.db,
        app.id,
        { name: `k${String(i)}`, scopes: null, expiresAt: null },
        clock,
      );
    expect(
      await createKey(
        handle.db,
        app.id,
        { name: "one more", scopes: null, expiresAt: null },
        clock,
      ),
    ).toEqual({ ok: false, problem: "limit" });
    expect(
      await createKey(
        handle.db,
        app.id,
        { name: "past", scopes: null, expiresAt: new Date(0) },
        clock,
      ),
    ).toEqual({ ok: false, problem: "expiry" });
    const [entry] = await listApps(handle.db, clock);
    expect(entry?.activeKeys).toBe(API_LIMITS.keysPerApp);
    await deleteApp(handle.db, app.id);
    expect(await listApps(handle.db, clock)).toEqual([]);
  });

  it("notes when a key was used, at most once a minute", async () => {
    const { secret } = await newKey();
    const first = await authenticate(handle.db, secret, T0);
    expect(first.key.lastUsedAt).toEqual(T0);
    const soon = await authenticate(
      handle.db,
      secret,
      new Date(T0.getTime() + 10_000),
    );
    expect(soon.key.lastUsedAt).toEqual(T0);
    const later = new Date(T0.getTime() + 61_000);
    expect(
      (await authenticate(handle.db, secret, later)).key.lastUsedAt,
    ).toEqual(later);
  });

  it("purges old failures and counts", async () => {
    const { secret } = await newKey();
    await call("/v1/me/usage?days=0", { key: secret });
    const later = new Date(
      T0.getTime() + (API_LIMITS.usageDays + 1) * 24 * 3600 * 1000,
    );
    await purgeUsage(handle.db, later);
    expect(await handle.db.select().from(apiErrors)).toHaveLength(0);
    expect(await handle.db.select().from(apiUsage)).toHaveLength(0);
  });
});
