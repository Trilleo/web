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
    date: "2026-11-21",
    changes: [
      "SkyBlock sync, with a personal token (scope `skyblock:sync`): `GET /v1/skyblock/me/profiles`, `PUT /v1/skyblock/me/profiles/{profileId}`, `POST /v1/skyblock/me/profiles/{profileId}/sync`, `GET /v1/skyblock/me/profiles/{profileId}/collection` and `GET /v1/skyblock/me/profiles/{profileId}/syncs`. See the SkyBlock sync guide.",
      "Error code `profile_limit` (409): the account can't have another SkyBlock profile.",
    ],
  },
  {
    date: "2026-11-21",
    changes: [
      "Personal tokens (`trlu_…`): act for one person's account, within the scopes they allowed. Get one by linking a device (`POST /v1/auth/device`, then poll `POST /v1/auth/device/token`) or have the person make one on their Apps page. See the Personal tokens guide.",
      "The Account group: `GET /v1/account` (whose token it is) and `DELETE /v1/account/token` (revoke it). Personal-token scope `skyblock:sync`, for the SkyBlock sync routes to come.",
      "Error codes `token_required`, `account_blocked`, and the device flow's `authorization_pending`, `slow_down`, `access_denied` and `expired_token`.",
    ],
  },
  {
    date: "2026-11-21",
    changes: [
      "Hypixel SkyBlock, no key needed: `GET /v1/skyblock/shards`, `/v1/skyblock/prices` (the Bazaar's latest, fetched by the site every 5 minutes) and `/v1/skyblock/shards/{slug}/prices` (hourly history, `range` 24h, 7d, 30d or 90d).",
      "Error code `prices_unavailable` (503): the site hasn't got the Bazaar's prices yet.",
    ],
  },
  {
    date: "2026-10-23",
    changes: [
      "Public read routes, no key needed: `GET /v1/site`, `/v1/tools`, `/v1/games`, `/v1/posts`, `/v1/posts/{slug}`, `/v1/tags`, `/v1/study/subjects`, `/v1/study/subjects/{slug}`.",
      'The Minecraft platform\'s API moves to `GET /v1/minecraft/projects`, `/v1/minecraft/projects/{slug}` and `/v1/minecraft/projects/{slug}/latest`. Lists page with `items` and `nextCursor` (was `projects`, `page` and `perPage`); everything else is as before. The old `https://www.trilleo.net/api/minecraft/v1/` addresses still answer, with `Deprecation` and `Link: rel="successor-version"` headers.',
    ],
  },
  {
    date: "2026-10-23",
    changes: [
      "Webhooks: signed POSTs to an app's own address, with retries. Events `cryptic.day` (each UTC midnight), `post.published` and `ping` (a test). See the Webhooks guide.",
    ],
  },
  {
    date: "2026-10-23",
    changes: [
      "The daily cryptic: `GET /v1/cryptic/today`, `/v1/cryptic/days/{date}`, `/v1/cryptic/archive`, guesses (`POST /v1/cryptic/days/{date}/guesses`), day and all-time leaderboards, and players' stats (`GET` and `DELETE /v1/cryptic/players/{id}`).",
      "Scopes `cryptic:read` and `cryptic:play`; error codes `no_puzzle` and `guess_wrong_length`.",
    ],
  },
  {
    date: "2026-10-23",
    changes: [
      "The API opens at https://api.trilleo.net/v1/ with API keys, scopes, rate limits and usage counts.",
      "`GET /v1/status`, `GET /v1/me` and `GET /v1/me/usage` (scope `usage:read`).",
    ],
  },
];
