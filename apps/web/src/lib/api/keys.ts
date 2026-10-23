/**
 * API apps and their keys (api_apps, api_keys), made and changed by the admin in
 * /admin/api/. A key is `trl_` plus 32 random letters and digits; the site keeps only
 * its SHA-256, so a key is shown once, when it's made.
 */
import { createHash, randomBytes } from "node:crypto";
import {
  apiApps,
  apiKeys,
  type ApiApp,
  type ApiKey,
  type Database,
} from "@trilleo/db";
import { and, asc, count, desc, eq, isNull, lt, or } from "drizzle-orm";
import { ApiError } from "./errors";
import { API_LIMITS } from "./limits";
import { cleanScopes, effectiveScopes, type ApiScope } from "./scopes";

export const KEY_PREFIX = "trl_";
const ALPHABET =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
const KEY_LENGTH = 32;
/** How much of a key lists show: "trl_" and the next 6 characters. */
const SHOWN = KEY_PREFIX.length + 6;

/**
 * `prefix` and `KEY_LENGTH` random letters and digits (rejection sampling, so every
 * character is equally likely). Webhook secrets use it too.
 */
export function randomToken(prefix: string): string {
  let out = "";
  while (out.length < KEY_LENGTH) {
    for (const byte of randomBytes(KEY_LENGTH)) {
      if (byte >= 248) continue; // 248 = 4 × 62
      out += ALPHABET.charAt(byte % 62);
      if (out.length === KEY_LENGTH) break;
    }
  }
  return prefix + out;
}

/** A new random API key. */
export function generateKey(): string {
  return randomToken(KEY_PREFIX);
}

export function hashKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}

export function looksLikeKey(value: string): boolean {
  return new RegExp(`^${KEY_PREFIX}[A-Za-z0-9]{${String(KEY_LENGTH)}}$`).test(
    value,
  );
}

export interface AppInput {
  name: string;
  description: string;
  scopes: readonly string[];
  rateLimit: number;
}

export type AppProblem = "name" | "description" | "rateLimit";

/** The form's values made safe, or what's wrong with them. */
export function checkAppInput(
  input: AppInput,
): { ok: true; value: AppInput } | { ok: false; problem: AppProblem } {
  const name = input.name.trim();
  if (name.length < 1 || name.length > 80)
    return { ok: false, problem: "name" };
  const description = input.description.trim();
  if (description.length > 500) return { ok: false, problem: "description" };
  const rateLimit = input.rateLimit;
  if (
    !Number.isInteger(rateLimit) ||
    rateLimit < 1 ||
    rateLimit > API_LIMITS.maxPerMinute
  )
    return { ok: false, problem: "rateLimit" };
  return {
    ok: true,
    value: { name, description, rateLimit, scopes: cleanScopes(input.scopes) },
  };
}

export async function createApp(
  db: Database,
  input: AppInput,
  createdBy: string | null,
): Promise<ApiApp> {
  const [app] = await db
    .insert(apiApps)
    .values({
      name: input.name,
      description: input.description,
      scopes: cleanScopes(input.scopes),
      rateLimit: input.rateLimit,
      createdBy,
    })
    .returning();
  if (!app) throw new Error("The app wasn't created.");
  return app;
}

export async function updateApp(
  db: Database,
  id: number,
  input: AppInput,
  now = new Date(),
): Promise<void> {
  await db
    .update(apiApps)
    .set({
      name: input.name,
      description: input.description,
      scopes: cleanScopes(input.scopes),
      rateLimit: input.rateLimit,
      updatedAt: now,
    })
    .where(eq(apiApps.id, id));
}

/** Switches an app off (its keys stop working) or back on. */
export async function setAppDisabled(
  db: Database,
  id: number,
  disabled: boolean,
  now = new Date(),
): Promise<void> {
  await db
    .update(apiApps)
    .set({ disabledAt: disabled ? now : null, updatedAt: now })
    .where(eq(apiApps.id, id));
}

/** Deletes an app with its keys and their usage. */
export async function deleteApp(db: Database, id: number): Promise<void> {
  await db.delete(apiApps).where(eq(apiApps.id, id));
}

export async function getApp(
  db: Database,
  id: number,
): Promise<ApiApp | undefined> {
  const [app] = await db.select().from(apiApps).where(eq(apiApps.id, id));
  return app;
}

export interface AppListEntry {
  app: ApiApp;
  /** Keys that still work (not revoked, not expired). */
  activeKeys: number;
  lastUsedAt: Date | null;
}

export async function listApps(
  db: Database,
  now = new Date(),
): Promise<AppListEntry[]> {
  const apps = await db.select().from(apiApps).orderBy(asc(apiApps.name));
  const keys = await db.select().from(apiKeys);
  return apps.map((app) => {
    const own = keys.filter((key) => key.appId === app.id);
    const used = own
      .map((key) => key.lastUsedAt)
      .filter((at): at is Date => at !== null)
      .sort((a, b) => b.getTime() - a.getTime());
    return {
      app,
      activeKeys: own.filter((key) => keyState(key, now) === "active").length,
      lastUsedAt: used[0] ?? null,
    };
  });
}

export type KeyState = "active" | "revoked" | "expired";

export function keyState(key: ApiKey, now = new Date()): KeyState {
  if (key.revokedAt) return "revoked";
  if (key.expiresAt && key.expiresAt.getTime() <= now.getTime())
    return "expired";
  return "active";
}

export async function keysOf(db: Database, appId: number): Promise<ApiKey[]> {
  return db
    .select()
    .from(apiKeys)
    .where(eq(apiKeys.appId, appId))
    .orderBy(desc(apiKeys.createdAt), desc(apiKeys.id));
}

export interface KeyInput {
  name: string;
  /** Null: all of the app's scopes, now and later. */
  scopes: readonly string[] | null;
  expiresAt: Date | null;
}

/**
 * Makes a key and returns it whole: the only time it can be seen. Refused when the
 * app already has API_LIMITS.keysPerApp keys that aren't revoked.
 */
export async function createKey(
  db: Database,
  appId: number,
  input: KeyInput,
  now = new Date(),
): Promise<
  | { ok: true; key: ApiKey; secret: string }
  | { ok: false; problem: "name" | "expiry" | "limit" }
> {
  const name = input.name.trim();
  if (name.length < 1 || name.length > 80)
    return { ok: false, problem: "name" };
  if (input.expiresAt && input.expiresAt.getTime() <= now.getTime())
    return { ok: false, problem: "expiry" };
  const [open] = await db
    .select({ n: count() })
    .from(apiKeys)
    .where(and(eq(apiKeys.appId, appId), isNull(apiKeys.revokedAt)));
  if ((open?.n ?? 0) >= API_LIMITS.keysPerApp)
    return { ok: false, problem: "limit" };
  const secret = generateKey();
  const [key] = await db
    .insert(apiKeys)
    .values({
      appId,
      name,
      prefix: secret.slice(0, SHOWN),
      last4: secret.slice(-4),
      hash: hashKey(secret),
      scopes: input.scopes === null ? null : cleanScopes(input.scopes),
      expiresAt: input.expiresAt,
      createdAt: now,
    })
    .returning();
  if (!key) throw new Error("The key wasn't created.");
  return { ok: true, key, secret };
}

export async function revokeKey(
  db: Database,
  appId: number,
  keyId: number,
  now = new Date(),
): Promise<boolean> {
  const rows = await db
    .update(apiKeys)
    .set({ revokedAt: now })
    .where(
      and(
        eq(apiKeys.id, keyId),
        eq(apiKeys.appId, appId),
        isNull(apiKeys.revokedAt),
      ),
    )
    .returning({ id: apiKeys.id });
  return rows.length > 0;
}

/** Who's calling: the key, its app, and what the key may do. */
export interface Caller {
  app: ApiApp;
  key: ApiKey;
  scopes: ApiScope[];
}

/**
 * The caller behind a key, or the error to answer with. Notes when the key was last
 * used (at most once a minute).
 */
export async function authenticate(
  db: Database,
  secret: string,
  now = new Date(),
): Promise<Caller> {
  if (!looksLikeKey(secret))
    throw new ApiError("invalid_key", "That isn't a valid API key.");
  const [row] = await db
    .select({ key: apiKeys, app: apiApps })
    .from(apiKeys)
    .innerJoin(apiApps, eq(apiApps.id, apiKeys.appId))
    .where(eq(apiKeys.hash, hashKey(secret)));
  if (!row) throw new ApiError("invalid_key", "That isn't a valid API key.");
  const { key, app } = row;
  const state = keyState(key, now);
  if (state === "revoked")
    throw new ApiError("key_revoked", "This API key was revoked.");
  if (state === "expired")
    throw new ApiError("key_expired", "This API key has expired.");
  if (app.disabledAt)
    throw new ApiError(
      "app_disabled",
      "This key's app is switched off. Ask the site's admin.",
    );
  if (
    !key.lastUsedAt ||
    now.getTime() - key.lastUsedAt.getTime() >= API_LIMITS.lastUsedEveryMs
  ) {
    const cutoff = new Date(now.getTime() - API_LIMITS.lastUsedEveryMs);
    await db
      .update(apiKeys)
      .set({ lastUsedAt: now })
      .where(
        and(
          eq(apiKeys.id, key.id),
          or(isNull(apiKeys.lastUsedAt), lt(apiKeys.lastUsedAt, cutoff)),
        ),
      );
    key.lastUsedAt = now;
  }
  return { app, key, scopes: effectiveScopes(app.scopes, key.scopes) };
}
