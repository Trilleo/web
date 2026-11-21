/**
 * Personal tokens (api_user_tokens): let a program act as one account through the
 * API's account routes, within the token's scopes (USER_SCOPES). A token is `trlu_`
 * plus 32 random letters and digits, so it can't be mistaken for an app's key
 * (`trl_`); only its SHA-256 is kept. Made on /account/apps/ (shown once) or by a
 * device link (device.ts), revoked there, deleted with the account.
 */
import {
  apiUserTokens,
  users,
  type ApiUserToken,
  type Database,
} from "@trilleo/db";
import { and, count, desc, eq, isNull, lt, or } from "drizzle-orm";
import { ApiError } from "./errors";
import { hashKey, randomToken } from "./keys";
import { API_LIMITS, USER_TOKEN_LIMITS } from "./limits";
import { cleanUserScopes, type UserScope } from "./scopes";

export const USER_TOKEN_PREFIX = "trlu_";
/** How much of a token lists show: "trlu_" and the next 6 characters. */
const SHOWN = USER_TOKEN_PREFIX.length + 6;

export type TokenVia = "manual" | "device";

export function generateUserToken(): string {
  return randomToken(USER_TOKEN_PREFIX);
}

export function looksLikeUserToken(value: string): boolean {
  return /^trlu_[A-Za-z0-9]{32}$/.test(value);
}

export type TokenState = "active" | "revoked" | "expired";

export function tokenState(
  token: Pick<ApiUserToken, "revokedAt" | "expiresAt">,
  now = new Date(),
): TokenState {
  if (token.revokedAt) return "revoked";
  if (token.expiresAt && token.expiresAt.getTime() <= now.getTime())
    return "expired";
  return "active";
}

export interface UserTokenInput {
  name: string;
  scopes: readonly string[];
  expiresAt: Date | null;
  via: TokenVia;
}

export type UserTokenProblem = "name" | "scopes" | "expiry" | "limit";

/** A name made safe: trimmed, within the limit, or null if it isn't usable. */
export function cleanTokenName(name: string): string | null {
  const trimmed = name.trim().replace(/\s+/g, " ");
  return trimmed.length >= 1 && trimmed.length <= USER_TOKEN_LIMITS.nameLength
    ? trimmed
    : null;
}

/** Tokens the account has that aren't revoked (expired ones count until revoked). */
export async function openTokenCount(
  db: Database,
  userId: string,
): Promise<number> {
  const [row] = await db
    .select({ n: count() })
    .from(apiUserTokens)
    .where(
      and(eq(apiUserTokens.userId, userId), isNull(apiUserTokens.revokedAt)),
    );
  return row?.n ?? 0;
}

/**
 * Makes a token and returns it whole: the only time it can be seen. Refused past
 * USER_TOKEN_LIMITS.perUser open tokens.
 */
export async function createUserToken(
  db: Database,
  userId: string,
  input: UserTokenInput,
  now = new Date(),
): Promise<
  | { ok: true; token: ApiUserToken; secret: string }
  | { ok: false; problem: UserTokenProblem }
> {
  const name = cleanTokenName(input.name);
  if (name === null) return { ok: false, problem: "name" };
  const scopes = cleanUserScopes(input.scopes);
  if (scopes.length === 0) return { ok: false, problem: "scopes" };
  if (input.expiresAt && input.expiresAt.getTime() <= now.getTime())
    return { ok: false, problem: "expiry" };
  if ((await openTokenCount(db, userId)) >= USER_TOKEN_LIMITS.perUser)
    return { ok: false, problem: "limit" };
  const secret = generateUserToken();
  const [token] = await db
    .insert(apiUserTokens)
    .values({
      userId,
      name,
      prefix: secret.slice(0, SHOWN),
      last4: secret.slice(-4),
      hash: hashKey(secret),
      scopes,
      via: input.via,
      createdAt: now,
      expiresAt: input.expiresAt,
    })
    .returning();
  if (!token) throw new Error("The token wasn't created.");
  return { ok: true, token, secret };
}

/** The account's tokens that aren't revoked, newest first. */
export async function listUserTokens(
  db: Database,
  userId: string,
): Promise<ApiUserToken[]> {
  return db
    .select()
    .from(apiUserTokens)
    .where(
      and(eq(apiUserTokens.userId, userId), isNull(apiUserTokens.revokedAt)),
    )
    .orderBy(desc(apiUserTokens.createdAt), desc(apiUserTokens.id));
}

/** Every token the account has had (for the export), newest first. */
export async function allUserTokens(
  db: Database,
  userId: string,
): Promise<ApiUserToken[]> {
  return db
    .select()
    .from(apiUserTokens)
    .where(eq(apiUserTokens.userId, userId))
    .orderBy(desc(apiUserTokens.createdAt), desc(apiUserTokens.id));
}

/** Revokes one of the account's tokens; its name, or null if there was none to revoke. */
export async function revokeUserToken(
  db: Database,
  userId: string,
  tokenId: number,
  now = new Date(),
): Promise<string | null> {
  const [row] = await db
    .update(apiUserTokens)
    .set({ revokedAt: now })
    .where(
      and(
        eq(apiUserTokens.id, tokenId),
        eq(apiUserTokens.userId, userId),
        isNull(apiUserTokens.revokedAt),
      ),
    )
    .returning({ name: apiUserTokens.name });
  return row?.name ?? null;
}

/** Who a personal token acts for, and what it may do. */
export interface UserCaller {
  token: ApiUserToken;
  user: { id: string; username: string };
  scopes: UserScope[];
}

/**
 * The account behind a token, or the error to answer with. Blocked accounts' tokens
 * stop working. Notes when the token was last used (at most once a minute).
 */
export async function authenticateUser(
  db: Database,
  secret: string,
  now = new Date(),
): Promise<UserCaller> {
  const invalid = () =>
    new ApiError("invalid_key", "That isn't a valid personal token.");
  if (!looksLikeUserToken(secret)) throw invalid();
  const [row] = await db
    .select({
      token: apiUserTokens,
      user: {
        id: users.id,
        username: users.username,
        blockedAt: users.blockedAt,
      },
    })
    .from(apiUserTokens)
    .innerJoin(users, eq(users.id, apiUserTokens.userId))
    .where(eq(apiUserTokens.hash, hashKey(secret)));
  if (!row) throw invalid();
  const { token, user } = row;
  const state = tokenState(token, now);
  if (state === "revoked")
    throw new ApiError("key_revoked", "This personal token was revoked.");
  if (state === "expired")
    throw new ApiError("key_expired", "This personal token has expired.");
  if (user.blockedAt)
    throw new ApiError(
      "account_blocked",
      "The account this token belongs to is blocked.",
    );
  if (
    !token.lastUsedAt ||
    now.getTime() - token.lastUsedAt.getTime() >= API_LIMITS.lastUsedEveryMs
  ) {
    const cutoff = new Date(now.getTime() - API_LIMITS.lastUsedEveryMs);
    await db
      .update(apiUserTokens)
      .set({ lastUsedAt: now })
      .where(
        and(
          eq(apiUserTokens.id, token.id),
          or(
            isNull(apiUserTokens.lastUsedAt),
            lt(apiUserTokens.lastUsedAt, cutoff),
          ),
        ),
      );
    token.lastUsedAt = now;
  }
  return {
    token,
    user: { id: user.id, username: user.username },
    scopes: cleanUserScopes(token.scopes),
  };
}
