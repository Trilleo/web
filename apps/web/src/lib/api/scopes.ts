/**
 * What an API key may do beyond the public routes. An app is given scopes in the
 * control panel; each key gets all of its app's, or fewer. A new scope goes here
 * (the panel's checkboxes and the docs read this list) and in a route's `scope`.
 */
export const API_SCOPES = {
  "cryptic:read":
    "Read the daily cryptic (today's clue, past answers) and the app's own leaderboards and players.",
  "cryptic:play":
    "Send players' guesses at the daily cryptic, and forget a player.",
  "usage:read": "Read the app's own request counts (GET /v1/me/usage).",
} as const satisfies Record<string, string>;

export type ApiScope = keyof typeof API_SCOPES;

export function isApiScope(value: string): value is ApiScope {
  return Object.hasOwn(API_SCOPES, value);
}

/** Known scopes only, in the list's order, without repeats. */
export function cleanScopes(values: readonly string[]): ApiScope[] {
  const wanted = new Set(values);
  return (Object.keys(API_SCOPES) as ApiScope[]).filter((scope) =>
    wanted.has(scope),
  );
}

/**
 * What a key can do: its own scopes (null: all of its app's) that its app still
 * has. Scopes the code no longer knows are dropped.
 */
export function effectiveScopes(
  appScopes: readonly string[],
  keyScopes: readonly string[] | null,
): ApiScope[] {
  const app = cleanScopes(appScopes);
  if (keyScopes === null) return app;
  const key = new Set(keyScopes);
  return app.filter((scope) => key.has(scope));
}

/**
 * What a personal token may do for its account. Tokens are made by the account's
 * owner (/account/apps/ or a device link) and only ever reach account routes.
 */
export const USER_SCOPES = {
  "skyblock:sync":
    "Read and update your Hypixel SkyBlock profiles and shard collection.",
} as const satisfies Record<string, string>;

export type UserScope = keyof typeof USER_SCOPES;

export function isUserScope(value: string): value is UserScope {
  return Object.hasOwn(USER_SCOPES, value);
}

/** Known user scopes only, in the list's order, without repeats. */
export function cleanUserScopes(values: readonly string[]): UserScope[] {
  const wanted = new Set(values);
  return (Object.keys(USER_SCOPES) as UserScope[]).filter((scope) =>
    wanted.has(scope),
  );
}
