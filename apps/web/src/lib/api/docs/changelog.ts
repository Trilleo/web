/**
 * What changed in the API, newest first. Every change to a route, scope, limit or
 * error adds an entry (the docs' Changelog page and /docs.md show them), so a client
 * written against an older version can see what's new.
 */
export interface ChangelogEntry {
  /** UTC day, "2026-10-23". */
  date: string;
  changes: readonly string[];
}

export const API_CHANGELOG: readonly ChangelogEntry[] = [
  {
    date: "2026-10-23",
    changes: [
      "The API opens at https://api.trilleo.net/v1/ with API keys, scopes, rate limits and usage counts.",
      "`GET /v1/status`, `GET /v1/me` and `GET /v1/me/usage` (scope `usage:read`).",
    ],
  },
];
