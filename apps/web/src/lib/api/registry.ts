/**
 * How an API route is declared. Everything about a route lives in one `defineRoute`
 * call: method and path, who may call it, its inputs and answer (as schemas), an
 * example, and the handler. The dispatcher (dispatch.ts) runs it, and the docs pages,
 * /docs.md and /openapi.json are written from the same declaration, so they can't
 * disagree. Routes are listed in routes/index.ts.
 */
import type { Database } from "@trilleo/db";
import type { ErrorCode } from "./errors";
import type { Caller } from "./keys";
import type { RateDecision, RateLimiter } from "./rate-limit";
import type { InferShape, ObjectSchema, Schema, Shape } from "./schema";
import type { ApiScope } from "./scopes";

export type Method = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

/** Sections of the reference. A new group goes here (with its intro). */
export const API_GROUPS = {
  system: {
    title: "System",
    intro:
      "The API's own state, and who a key belongs to. Useful as a first call to check that a key works.",
  },
  cryptic: {
    title: "Daily cryptic",
    intro:
      "A cryptic crossword clue a day, set on the site. Get today's clue, send players' guesses (the site checks them and keeps score), and read leaderboards and past answers.",
  },
} as const satisfies Record<string, { title: string; intro: string }>;

export type ApiGroup = keyof typeof API_GROUPS;

/** What a handler gets. */
export interface HandlerContext<P, Q, B> {
  db: Database;
  params: P;
  query: Q;
  body: B;
  /** The key's app and scopes; null on a public route called without a key. */
  caller: Caller | null;
  /** This request's rate-limit bucket after taking it. */
  rate: RateDecision;
  /** The API's limiter, for a route's own limits (use keys of the route's own). */
  limiter: RateLimiter;
  now: Date;
  request: Request;
  requestId: string;
  /** Where the API is reached from (https://api.trilleo.net in production). */
  apiOrigin: string;
  /** The main site's origin, for links in answers. */
  siteOrigin: string;
}

/** A route without these inputs. */
// eslint-disable-next-line @typescript-eslint/no-generated-empty-object-type -- empty on purpose.
type EmptyShape = Record<never, Schema<unknown>>;

export interface RouteSpec<
  P extends Shape,
  Q extends Shape,
  B extends Shape,
  R,
> {
  method: Method;
  /** e.g. "/v1/cryptic/days/{date}": `{name}` segments are path parameters. */
  path: string;
  /** A stable name, also OpenAPI's operationId and the docs' anchor: "getMe". */
  operationId: string;
  group: ApiGroup;
  /** One line, in the imperative: "Get the calling app". */
  summary: string;
  /** More, in Markdown. */
  description?: string;
  /** "public": anyone (a key, if sent, is checked and counted). "key": a key is required. */
  auth: "public" | "key";
  /** A scope the key must have (implies auth "key"). */
  scope?: ApiScope;
  params?: ObjectSchema<P>;
  query?: ObjectSchema<Q>;
  body?: ObjectSchema<B>;
  response: Schema<R>;
  /** The success status (200 unless it makes something: 201). */
  status?: 200 | 201;
  /** Errors particular to this route (the common and key ones are implied). */
  errors?: readonly ErrorCode[];
  /** Public answers may be cached for this many seconds (default 60). */
  cacheSeconds?: number;
  example: {
    params?: InferShape<P>;
    query?: Partial<InferShape<Q>>;
    body?: InferShape<B>;
    response: R;
  };
  handler: (
    context: HandlerContext<InferShape<P>, InferShape<Q>, InferShape<B>>,
  ) => Promise<R> | R;
}

/** A route with its types erased, as the dispatcher and the docs see it. */
export interface Route {
  method: Method;
  path: string;
  operationId: string;
  group: ApiGroup;
  summary: string;
  description: string | undefined;
  auth: "public" | "key";
  scope: ApiScope | undefined;
  params: ObjectSchema<Shape> | undefined;
  query: ObjectSchema<Shape> | undefined;
  body: ObjectSchema<Shape> | undefined;
  response: Schema<unknown>;
  status: 200 | 201;
  errors: readonly ErrorCode[];
  cacheSeconds: number;
  example: {
    params?: Record<string, unknown>;
    query?: Record<string, unknown>;
    body?: Record<string, unknown>;
    response: unknown;
  };
  handler: (context: HandlerContext<unknown, unknown, unknown>) => unknown;
  /** "GET /v1/me": how usage counts it. */
  id: string;
  /** The path as a pattern, with its parameter names in order. */
  pattern: RegExp;
  paramNames: string[];
}

export function defineRoute<
  P extends Shape = EmptyShape,
  Q extends Shape = EmptyShape,
  B extends Shape = EmptyShape,
  R = unknown,
>(spec: RouteSpec<P, Q, B, R>): Route {
  const paramNames: string[] = [];
  const source = spec.path
    .split("/")
    .map((segment) => {
      const match = /^\{(\w+)\}$/.exec(segment);
      if (!match?.[1]) return segment.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      paramNames.push(match[1]);
      return "([^/]+)";
    })
    .join("/");
  return {
    method: spec.method,
    path: spec.path,
    operationId: spec.operationId,
    group: spec.group,
    summary: spec.summary,
    description: spec.description,
    auth: spec.scope ? "key" : spec.auth,
    scope: spec.scope,
    params: spec.params,
    query: spec.query,
    body: spec.body,
    response: spec.response,
    status: spec.status ?? 200,
    errors: spec.errors ?? [],
    cacheSeconds: spec.cacheSeconds ?? 60,
    example: spec.example,
    handler: spec.handler as Route["handler"],
    id: `${spec.method} ${spec.path}`,
    pattern: new RegExp(`^${source}/?$`),
    paramNames,
  };
}

/** The routes whose path fits, and the parameters of each. */
export function matchPath(
  routes: readonly Route[],
  pathname: string,
): { route: Route; params: Record<string, string> }[] {
  const found: { route: Route; params: Record<string, string> }[] = [];
  for (const route of routes) {
    const match = route.pattern.exec(pathname);
    if (!match) continue;
    const params: Record<string, string> = {};
    route.paramNames.forEach((name, index) => {
      const raw = match[index + 1] ?? "";
      try {
        params[name] = decodeURIComponent(raw);
      } catch {
        params[name] = raw;
      }
    });
    found.push({ route, params });
  }
  return found;
}

/** The groups that have routes, in API_GROUPS' order. */
export function usedGroups(routes: readonly Route[]): ApiGroup[] {
  const used = new Set<string>(routes.map((route) => route.group));
  return (Object.keys(API_GROUPS) as ApiGroup[]).filter((group) =>
    used.has(group),
  );
}
