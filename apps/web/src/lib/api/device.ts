/**
 * Linking a device (OAuth 2.0's device authorization grant, RFC 8628, in the API's
 * own shapes): a program that can't show a browser (a game mod) gets a personal
 * token without anyone copying a secret.
 *
 * 1. The program calls POST /v1/auth/device and shows the user code ("BCDF-GHJK").
 * 2. The person opens www's /link/ signed in, types the code and approves it.
 * 3. The program polls POST /v1/auth/device/token every `interval` seconds; once
 *    approved, the next poll makes the token (via "device"), answers it once and
 *    deletes the link. Links not approved within DEVICE_LIMITS.codeMinutes expire.
 */
import { apiDeviceCodes, type ApiDeviceCode, type Database } from "@trilleo/db";
import { and, count, eq, gt, isNull, lte } from "drizzle-orm";
import { randomBytes } from "node:crypto";
import { ApiError } from "./errors";
import { hashKey, randomToken } from "./keys";
import { DEVICE_LIMITS, USER_TOKEN_LIMITS } from "./limits";
import { cleanUserScopes, type UserScope } from "./scopes";
import { cleanTokenName, createUserToken, openTokenCount } from "./user-tokens";

export const DEVICE_CODE_PREFIX = "trld_";
/** Consonants only: no words, and nothing that reads as another letter. */
const USER_CODE_LETTERS = "BCDFGHJKLMNPQRSTVWXZ";
const USER_CODE_LENGTH = 8;

/** Eight random letters from USER_CODE_LETTERS (uniform: 20 divides 240). */
export function generateUserCode(): string {
  let out = "";
  while (out.length < USER_CODE_LENGTH) {
    for (const byte of randomBytes(USER_CODE_LENGTH * 2)) {
      if (byte >= 240) continue;
      out += USER_CODE_LETTERS.charAt(byte % USER_CODE_LETTERS.length);
      if (out.length === USER_CODE_LENGTH) break;
    }
  }
  return out;
}

/** What someone typed ("bcdf ghjk", "BCDF-GHJK") as stored, or null if it can't be one. */
export function normalizeUserCode(typed: string): string | null {
  const letters = typed.toUpperCase().replace(/[^A-Z]/g, "");
  if (letters.length !== USER_CODE_LENGTH) return null;
  for (const letter of letters)
    if (!USER_CODE_LETTERS.includes(letter)) return null;
  return letters;
}

/** "BCDFGHJK" → "BCDF-GHJK". */
export function formatUserCode(code: string): string {
  return `${code.slice(0, 4)}-${code.slice(4)}`;
}

export interface DeviceStart {
  deviceCode: string;
  userCode: string;
  expiresAt: Date;
  scopes: UserScope[];
}

/** Starts a device link. Throws ApiError for bad input or when too many are waiting. */
export async function startDeviceLink(
  db: Database,
  input: { clientName: string; scopes: readonly string[] },
  now = new Date(),
): Promise<DeviceStart> {
  const clientName = cleanTokenName(input.clientName);
  if (clientName === null)
    throw new ApiError(
      "invalid_input",
      `clientName must be 1–${String(USER_TOKEN_LIMITS.nameLength)} characters.`,
      { problems: [{ path: "clientName", message: "Wrong length." }] },
    );
  const scopes = cleanUserScopes(input.scopes);
  if (scopes.length === 0 || scopes.length !== new Set(input.scopes).size)
    throw new ApiError(
      "invalid_input",
      "scopes must list one or more personal-token scopes, and only those.",
      { problems: [{ path: "scopes", message: "Unknown or missing scope." }] },
    );
  await purgeDeviceLinks(db, now);
  const [waiting] = await db.select({ n: count() }).from(apiDeviceCodes);
  if ((waiting?.n ?? 0) >= DEVICE_LIMITS.maxWaiting)
    throw new ApiError(
      "rate_limited",
      "Too many device links are waiting: try again in a few minutes.",
      { retryAfter: 60 },
    );
  const expiresAt = new Date(
    now.getTime() + DEVICE_LIMITS.codeMinutes * 60_000,
  );
  // A clash of user codes is vanishingly rare (20^8); try again if one happens.
  for (let attempt = 0; attempt < 5; attempt++) {
    const deviceCode = randomToken(DEVICE_CODE_PREFIX);
    const userCode = generateUserCode();
    const rows = await db
      .insert(apiDeviceCodes)
      .values({
        deviceHash: hashKey(deviceCode),
        userCode,
        clientName,
        scopes,
        createdAt: now,
        expiresAt,
      })
      .onConflictDoNothing()
      .returning({ id: apiDeviceCodes.id });
    if (rows.length > 0) return { deviceCode, userCode, expiresAt, scopes };
  }
  throw new Error("Couldn't pick a free user code.");
}

export interface DeviceToken {
  token: string;
  name: string;
  scopes: UserScope[];
}

/**
 * One poll. The token once approved; otherwise throws the ApiError to answer with:
 * authorization_pending, slow_down, access_denied or expired_token.
 */
export async function pollDeviceLink(
  db: Database,
  deviceCode: string,
  now = new Date(),
): Promise<DeviceToken> {
  const expired = () =>
    new ApiError(
      "expired_token",
      "This device code has expired or was already used. Start again.",
    );
  if (!/^trld_[A-Za-z0-9]{32}$/.test(deviceCode)) throw expired();
  const deviceHash = hashKey(deviceCode);
  const [link] = await db
    .select()
    .from(apiDeviceCodes)
    .where(eq(apiDeviceCodes.deviceHash, deviceHash));
  if (!link) throw expired();
  if (link.expiresAt.getTime() <= now.getTime()) {
    await db.delete(apiDeviceCodes).where(eq(apiDeviceCodes.id, link.id));
    throw expired();
  }
  if (link.deniedAt) {
    await db.delete(apiDeviceCodes).where(eq(apiDeviceCodes.id, link.id));
    throw new ApiError(
      "access_denied",
      "The person declined this device link.",
    );
  }
  if (link.userId && link.approvedAt) {
    // Delete first, so two polls at once can't both make a token.
    const taken = await db
      .delete(apiDeviceCodes)
      .where(eq(apiDeviceCodes.id, link.id))
      .returning({ id: apiDeviceCodes.id });
    if (taken.length === 0) throw expired();
    const made = await createUserToken(
      db,
      link.userId,
      {
        name: link.clientName,
        scopes: link.scopes,
        expiresAt: null,
        via: "device",
      },
      now,
    );
    if (!made.ok)
      throw new ApiError(
        "access_denied",
        made.problem === "limit"
          ? `The account already has ${String(USER_TOKEN_LIMITS.perUser)} tokens; revoke one on the site and link again.`
          : "The token couldn't be made. Start again.",
      );
    return {
      token: made.secret,
      name: made.token.name,
      scopes: made.token.scopes as UserScope[],
    };
  }
  const interval = DEVICE_LIMITS.intervalSeconds;
  const tooSoon =
    link.lastPolledAt !== null &&
    now.getTime() - link.lastPolledAt.getTime() < interval * 1000;
  await db
    .update(apiDeviceCodes)
    .set({ lastPolledAt: now })
    .where(eq(apiDeviceCodes.id, link.id));
  if (tooSoon)
    throw new ApiError(
      "slow_down",
      `Polling too fast: wait ${String(interval)} s between polls.`,
      { interval },
    );
  throw new ApiError(
    "authorization_pending",
    "Not approved yet: keep polling.",
    { interval },
  );
}

/** A link waiting for someone to decide, by the code they typed. */
export async function findWaitingLink(
  db: Database,
  userCode: string,
  now = new Date(),
): Promise<ApiDeviceCode | null> {
  const [link] = await db
    .select()
    .from(apiDeviceCodes)
    .where(
      and(
        eq(apiDeviceCodes.userCode, userCode),
        gt(apiDeviceCodes.expiresAt, now),
        isNull(apiDeviceCodes.approvedAt),
        isNull(apiDeviceCodes.deniedAt),
      ),
    );
  return link ?? null;
}

export type DecideResult =
  { ok: true; link: ApiDeviceCode } | { ok: false; problem: "gone" | "limit" };

/** Approves or declines a waiting link for this account. */
export async function decideLink(
  db: Database,
  userId: string,
  userCode: string,
  approve: boolean,
  now = new Date(),
): Promise<DecideResult> {
  if (
    approve &&
    (await openTokenCount(db, userId)) >= USER_TOKEN_LIMITS.perUser
  )
    return { ok: false, problem: "limit" };
  const [link] = await db
    .update(apiDeviceCodes)
    .set(approve ? { userId, approvedAt: now } : { userId, deniedAt: now })
    .where(
      and(
        eq(apiDeviceCodes.userCode, userCode),
        gt(apiDeviceCodes.expiresAt, now),
        isNull(apiDeviceCodes.approvedAt),
        isNull(apiDeviceCodes.deniedAt),
      ),
    )
    .returning();
  return link ? { ok: true, link } : { ok: false, problem: "gone" };
}

/** Deletes links past their expiry. */
export async function purgeDeviceLinks(
  db: Database,
  now = new Date(),
): Promise<void> {
  await db.delete(apiDeviceCodes).where(lte(apiDeviceCodes.expiresAt, now));
}

/**
 * Wrong codes typed on /link/, per account, in memory: after
 * DEVICE_LIMITS.wrongCodesPerHour in an hour it stops looking codes up, so nobody
 * can walk the code space.
 */
const wrongCodes = new Map<string, number[]>();

export function mayTryCode(userId: string, now = Date.now()): boolean {
  const recent = (wrongCodes.get(userId) ?? []).filter(
    (at) => now - at < 3_600_000,
  );
  if (recent.length === 0) wrongCodes.delete(userId);
  else wrongCodes.set(userId, recent);
  return recent.length < DEVICE_LIMITS.wrongCodesPerHour;
}

export function noteWrongCode(userId: string, now = Date.now()): void {
  const recent = (wrongCodes.get(userId) ?? []).filter(
    (at) => now - at < 3_600_000,
  );
  recent.push(now);
  wrongCodes.set(userId, recent);
}

/** For tests. */
export function forgetWrongCodes(): void {
  wrongCodes.clear();
}
