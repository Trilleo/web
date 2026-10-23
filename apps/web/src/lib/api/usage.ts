/**
 * What keys did: requests per key, per UTC day, per route (api_usage), and the
 * recent failures (api_errors) shown in the control panel and to the app itself
 * (GET /v1/me/usage). Requests without a key aren't recorded.
 */
import { apiErrors, apiKeys, apiUsage, type Database } from "@trilleo/db";
import { and, desc, eq, gte, inArray, lt, sql, sum } from "drizzle-orm";
import { utcDay } from "../storage/downloads-stats";
import { API_LIMITS } from "./limits";

const DAY_MS = 24 * 60 * 60 * 1000;

export interface RequestRecord {
  keyId: number;
  /** The route's id, e.g. "GET /v1/me"; unknown paths aren't recorded. */
  route: string;
  status: number;
  durationMs: number;
  /** For failures: what went wrong. */
  error?: {
    method: string;
    path: string;
    code: string;
    message: string;
    requestId: string;
  };
}

export async function recordRequest(
  db: Database,
  record: RequestRecord,
  now = new Date(),
): Promise<void> {
  const failed = record.status >= 400 ? 1 : 0;
  const duration = Math.max(0, Math.round(record.durationMs));
  await db
    .insert(apiUsage)
    .values({
      keyId: record.keyId,
      day: utcDay(now),
      route: record.route,
      count: 1,
      errors: failed,
      durationMs: duration,
    })
    .onConflictDoUpdate({
      target: [apiUsage.keyId, apiUsage.day, apiUsage.route],
      set: {
        count: sql`${apiUsage.count} + 1`,
        errors: sql`${apiUsage.errors} + ${failed}`,
        durationMs: sql`${apiUsage.durationMs} + ${duration}`,
      },
    });
  // Being rate limited is counted, not listed: a busy client would flood the list.
  if (record.error && record.status !== 429)
    await db.insert(apiErrors).values({
      keyId: record.keyId,
      at: now,
      status: record.status,
      ...record.error,
      message: record.error.message.slice(0, 500),
      path: record.error.path.slice(0, 500),
    });
}

export interface UsageDay {
  day: string;
  requests: number;
  errors: number;
}

export interface UsageRoute {
  route: string;
  requests: number;
  errors: number;
  averageMs: number;
}

export interface UsageSummary {
  days: UsageDay[];
  routes: UsageRoute[];
  requests: number;
  errors: number;
}

async function keyIdsOf(db: Database, appId: number): Promise<number[]> {
  const rows = await db
    .select({ id: apiKeys.id })
    .from(apiKeys)
    .where(eq(apiKeys.appId, appId));
  return rows.map((row) => row.id);
}

/**
 * The last `days` days (oldest first, gaps as 0) and the busiest routes, for one
 * app's keys, one key, or every key (null).
 */
export async function usageSummary(
  db: Database,
  scope: { appId: number } | { keyId: number } | null,
  days = 30,
  now = new Date(),
): Promise<UsageSummary> {
  const zeros = Array.from({ length: days }, (_, i) => ({
    day: utcDay(now, days - 1 - i),
    requests: 0,
    errors: 0,
  }));
  const keyIds =
    scope === null
      ? null
      : "keyId" in scope
        ? [scope.keyId]
        : await keyIdsOf(db, scope.appId);
  if (keyIds?.length === 0)
    return { days: zeros, routes: [], requests: 0, errors: 0 };
  const where = and(
    gte(apiUsage.day, utcDay(now, days - 1)),
    keyIds ? inArray(apiUsage.keyId, keyIds) : undefined,
  );
  const byDay = await db
    .select({
      day: apiUsage.day,
      requests: sum(apiUsage.count).mapWith(Number),
      errors: sum(apiUsage.errors).mapWith(Number),
    })
    .from(apiUsage)
    .where(where)
    .groupBy(apiUsage.day);
  const byRoute = await db
    .select({
      route: apiUsage.route,
      requests: sum(apiUsage.count).mapWith(Number),
      errors: sum(apiUsage.errors).mapWith(Number),
      durationMs: sum(apiUsage.durationMs).mapWith(Number),
    })
    .from(apiUsage)
    .where(where)
    .groupBy(apiUsage.route);
  const dayMap = new Map(byDay.map((row) => [row.day, row]));
  const series = zeros.map((zero) => {
    const row = dayMap.get(zero.day);
    return row
      ? { day: zero.day, requests: row.requests, errors: row.errors }
      : zero;
  });
  const routes = byRoute
    .map((row) => ({
      route: row.route,
      requests: row.requests,
      errors: row.errors,
      averageMs:
        row.requests > 0 ? Math.round(row.durationMs / row.requests) : 0,
    }))
    .sort((a, b) => b.requests - a.requests || a.route.localeCompare(b.route));
  return {
    days: series,
    routes,
    requests: series.reduce((total, day) => total + day.requests, 0),
    errors: series.reduce((total, day) => total + day.errors, 0),
  };
}

export interface RecentError {
  id: number;
  keyId: number;
  keyName: string;
  at: Date;
  method: string;
  path: string;
  status: number;
  code: string;
  message: string;
  requestId: string;
}

/** The newest failures for an app's keys, or every app's (null). */
export async function recentErrors(
  db: Database,
  appId: number | null,
  limit = 50,
): Promise<RecentError[]> {
  return db
    .select({
      id: apiErrors.id,
      keyId: apiErrors.keyId,
      keyName: apiKeys.name,
      at: apiErrors.at,
      method: apiErrors.method,
      path: apiErrors.path,
      status: apiErrors.status,
      code: apiErrors.code,
      message: apiErrors.message,
      requestId: apiErrors.requestId,
    })
    .from(apiErrors)
    .innerJoin(apiKeys, eq(apiKeys.id, apiErrors.keyId))
    .where(appId === null ? undefined : eq(apiKeys.appId, appId))
    .orderBy(desc(apiErrors.at), desc(apiErrors.id))
    .limit(limit);
}

/** Drops failures past API_LIMITS.errorLogDays and counts past usageDays. */
export async function purgeUsage(
  db: Database,
  now = new Date(),
): Promise<void> {
  await db
    .delete(apiErrors)
    .where(
      lt(
        apiErrors.at,
        new Date(now.getTime() - API_LIMITS.errorLogDays * DAY_MS),
      ),
    );
  await db
    .delete(apiUsage)
    .where(lt(apiUsage.day, utcDay(now, API_LIMITS.usageDays)));
}
