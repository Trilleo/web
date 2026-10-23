/**
 * Answers an API request: finds the route, checks the key and its scope, takes from
 * the rate limit, checks the inputs against the route's schemas, runs the handler,
 * and records what happened for the key's usage. Every answer is JSON with a
 * Request-Id; errors have one shape (errors.ts). Served by
 * src/pages/api/v1/[...path].ts on api.trilleo.net/v1/… (and /api/v1/… on the site).
 */
import { createHash, randomBytes } from "node:crypto";
import type { Database } from "@trilleo/db";
import { ApiError, errorBody } from "./errors";
import { authenticate, type Caller } from "./keys";
import { API_LIMITS } from "./limits";
import type { RateDecision, RateLimiter } from "./rate-limit";
import { matchPath, type Route } from "./registry";
import { check, type ObjectSchema, type Problem, type Shape } from "./schema";
import { purgeUsage, recordRequest } from "./usage";

export interface DispatchDeps {
  getDb: () => Promise<Database>;
  limiter: RateLimiter;
  routes: readonly Route[];
  /** The visitor's IP, for the limit on requests without a key (kept only hashed, in memory). */
  clientIp: string | null;
  apiOrigin: string;
  siteOrigin: string;
  now?: () => Date;
}

const PURGE_EVERY_MS = 60 * 60 * 1000;
let lastPurge = 0;

function newRequestId(): string {
  return `req_${randomBytes(12).toString("base64url")}`;
}

/** "/api/v1/me" (as the site serves it) → "/v1/me". */
export function apiPath(pathname: string): string {
  return pathname.replace(/^\/api(?=\/v\d)/, "");
}

const CORS_ALLOW = "Authorization, Content-Type";

/** Headers on every answer. */
function baseHeaders(requestId: string): Headers {
  return new Headers({
    "Request-Id": requestId,
    "X-Robots-Tag": "noindex",
    "Cache-Control": "private, no-store",
  });
}

function rateHeaders(headers: Headers, rate: RateDecision): void {
  headers.set("RateLimit-Limit", String(rate.limit));
  headers.set("RateLimit-Remaining", String(rate.remaining));
  headers.set("RateLimit-Reset", String(rate.reset));
}

function json(body: unknown, status: number, headers: Headers): Response {
  headers.set("Content-Type", "application/json; charset=utf-8");
  return new Response(JSON.stringify(body), { status, headers });
}

function invalid(problems: Problem[]): ApiError {
  const first = problems[0]?.message ?? "The request isn't valid.";
  return new ApiError(
    "invalid_input",
    problems.length > 1
      ? `${first} (and ${String(problems.length - 1)} more)`
      : first,
    { problems },
  );
}

function parseInput(
  schema: ObjectSchema<Shape> | undefined,
  value: unknown,
  text: boolean,
): unknown {
  if (!schema) return {};
  const result = check(schema, value, text);
  if (!result.ok) throw invalid(result.problems);
  return result.value;
}

async function readBody(request: Request): Promise<unknown> {
  const type = request.headers.get("content-type") ?? "";
  if (!type.toLowerCase().startsWith("application/json"))
    throw new ApiError(
      "unsupported_media_type",
      "Send the body as JSON, with Content-Type: application/json.",
    );
  const declared = Number(request.headers.get("content-length") ?? "0");
  const tooLarge = () =>
    new ApiError(
      "body_too_large",
      `Bodies can be at most ${String(API_LIMITS.bodyBytes)} bytes.`,
      { limit: API_LIMITS.bodyBytes },
    );
  if (declared > API_LIMITS.bodyBytes) throw tooLarge();
  const bytes = new Uint8Array(await request.arrayBuffer());
  if (bytes.byteLength > API_LIMITS.bodyBytes) throw tooLarge();
  const text = new TextDecoder().decode(bytes);
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new ApiError("invalid_json", "The body isn't valid JSON.");
  }
}

function bearer(request: Request): string | null {
  const header = request.headers.get("authorization");
  if (header === null) return null;
  const match = /^Bearer\s+(\S+)\s*$/i.exec(header);
  if (!match?.[1])
    throw new ApiError(
      "invalid_key",
      "Send the key as Authorization: Bearer <key>.",
    );
  return match[1];
}

function ipBucket(ip: string | null): string {
  return `ip:${createHash("sha256")
    .update(ip ?? "unknown")
    .digest("hex")
    .slice(0, 32)}`;
}

export async function dispatch(
  request: Request,
  url: URL,
  deps: DispatchDeps,
): Promise<Response> {
  const started = performance.now();
  const now = deps.now?.() ?? new Date();
  const requestId = newRequestId();
  const headers = baseHeaders(requestId);
  const path = apiPath(url.pathname);
  const method = request.method.toUpperCase();
  const matches = matchPath(deps.routes, path);

  if (method === "OPTIONS") {
    if (matches.length === 0)
      return json(
        errorBody(
          new ApiError("not_found", "There's no such route."),
          requestId,
        ),
        404,
        headers,
      );
    // Browsers may call public routes from any site; routes that need a key can't
    // be called from a web page (the key would be in it for anyone to read).
    const open = matches.filter(({ route }) => route.auth === "public");
    if (open.length > 0) {
      headers.set("Access-Control-Allow-Origin", "*");
      headers.set(
        "Access-Control-Allow-Methods",
        [...new Set(open.map(({ route }) => route.method)), "OPTIONS"].join(
          ", ",
        ),
      );
      headers.set("Access-Control-Allow-Headers", CORS_ALLOW);
      headers.set("Access-Control-Max-Age", "86400");
    }
    return new Response(null, { status: 204, headers });
  }

  const wanted = method === "HEAD" ? "GET" : method;
  const match = matches.find(({ route }) => route.method === wanted);
  let route: Route | undefined;
  let caller: Caller | null = null;
  let db: Database | undefined;
  let status: number;
  let response: Response;
  let failure: ApiError | undefined;

  try {
    if (!match) {
      if (matches.length > 0) {
        headers.set(
          "Allow",
          [
            ...new Set(matches.map(({ route }) => route.method)),
            "OPTIONS",
          ].join(", "),
        );
        throw new ApiError(
          "method_not_allowed",
          `This route doesn't take ${method}.`,
        );
      }
      throw new ApiError("not_found", "There's no such route.");
    }
    route = match.route;
    if (route.auth === "public")
      headers.set("Access-Control-Allow-Origin", "*");

    const secret = bearer(request);
    db = await deps.getDb();
    if (secret !== null) caller = await authenticate(db, secret, now);
    if (route.auth === "key" && !caller)
      throw new ApiError(
        "missing_key",
        "This route needs an API key: send Authorization: Bearer <key>.",
      );
    if (route.scope && !caller?.scopes.includes(route.scope))
      throw new ApiError(
        "insufficient_scope",
        `This key doesn't have the "${route.scope}" scope.`,
        { required: route.scope },
      );

    const rate = caller
      ? deps.limiter.take(
          `key:${String(caller.key.id)}`,
          caller.app.rateLimit,
          now.getTime(),
        )
      : deps.limiter.take(
          ipBucket(deps.clientIp),
          API_LIMITS.anonymousPerMinute,
          now.getTime(),
        );
    rateHeaders(headers, rate);
    if (!rate.ok) {
      headers.set("Retry-After", String(rate.reset));
      throw new ApiError(
        "rate_limited",
        `Too many requests: try again in ${String(rate.reset)} s.`,
        { retryAfter: rate.reset },
      );
    }

    const params = parseInput(route.params, match.params, true);
    const query = parseInput(
      route.query,
      Object.fromEntries(url.searchParams),
      true,
    );
    const body = route.body
      ? parseInput(route.body, await readBody(request), false)
      : {};

    const result = await route.handler({
      db,
      params,
      query,
      body,
      caller,
      rate,
      now,
      request,
      requestId,
      apiOrigin: deps.apiOrigin,
      siteOrigin: deps.siteOrigin,
    });
    status = route.status;
    if (route.auth === "public" && !caller && method !== "POST")
      headers.set(
        "Cache-Control",
        route.cacheSeconds > 0
          ? `public, max-age=${String(route.cacheSeconds)}`
          : "no-store",
      );
    response = json(result, status, headers);
  } catch (error) {
    if (error instanceof ApiError) {
      failure = error;
    } else {
      console.error(`API ${requestId} failed:`, error);
      failure = new ApiError(
        "internal_error",
        "Something went wrong on our side.",
      );
    }
    status = failure.status;
    response = json(errorBody(failure, requestId), status, headers);
  }

  if (caller && route && db) {
    try {
      await recordRequest(
        db,
        {
          keyId: caller.key.id,
          route: route.id,
          status,
          durationMs: performance.now() - started,
          ...(failure
            ? {
                error: {
                  method,
                  path: path + url.search,
                  code: failure.code,
                  message: failure.message,
                  requestId,
                },
              }
            : {}),
        },
        now,
      );
    } catch (error) {
      console.error(`API ${requestId}: usage not recorded:`, error);
    }
  }
  if (db && now.getTime() - lastPurge >= PURGE_EVERY_MS) {
    lastPurge = now.getTime();
    purgeUsage(db, now).catch((error: unknown) => {
      console.error("API usage purge failed:", error);
    });
  }
  return method === "HEAD"
    ? new Response(null, { status: response.status, headers: response.headers })
    : response;
}
