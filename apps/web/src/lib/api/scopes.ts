/**
 * What an API key may do beyond the public routes. An app is given scopes in the
 * control panel; each key gets all of its app's, or fewer. A new scope goes here
 * (the panel's checkboxes and the docs read this list) and in a route's `scope`.
 */
export const API_SCOPES = {
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
