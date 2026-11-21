/**
 * The docs' written pages. They quote numbers, codes and scopes from the code (limits,
 * errors, scopes), so they change with it; anything else they say about behaviour
 * must be kept true by hand when the dispatcher changes.
 */
import { ERROR_CODES } from "../errors";
import { KEY_PREFIX } from "../keys";
import { API_LIMITS, DEVICE_LIMITS, USER_TOKEN_LIMITS } from "../limits";
import { API_GROUPS, usedGroups, type Route } from "../registry";
import { API_SCOPES, USER_SCOPES } from "../scopes";
import { USER_TOKEN_PREFIX } from "../user-tokens";
import {
  GAME_MODES,
  MAX_ATTRIBUTE_LEVEL,
  PROFILE_LIMITS,
} from "@trilleo/skyblock";
import { COLLECTION_LIMITS } from "@trilleo/skyblock/calc";
import {
  CALCULATOR_PATH,
  COLLECTION_PATH,
  PLANNER_PATH,
} from "@trilleo/tool-skyblock/meta";
import { SYNC_LOG_LIMITS } from "../../skyblock/game-sync";
import { API_CHANGELOG } from "./changelog";
import type { DocContext } from "./context";
import { cell } from "./reference";

const n = (value: number) => value.toLocaleString("en");

export function overviewMarkdown(
  context: DocContext,
  routes: readonly Route[],
): string {
  const { api, site } = context;
  const groups = usedGroups(routes)
    .map(
      (group) =>
        `- [${API_GROUPS[group].title}](${api}/reference/${group}/): ${API_GROUPS[group].intro}`,
    )
    .join("\n");
  return `The Trilleo Network API lets other programs (bots, scripts, other sites) read from and work with [trilleo.net](${site}/). It's a JSON API over HTTPS at:

\`\`\`text
${api}/v1/
\`\`\`

## Quick start

1. Get a key. Keys belong to apps, which the site's admin makes in the control panel; ask for one with the scopes you need (see [Authentication](${api}/docs/authentication/)).
2. Check it works:

\`\`\`bash
curl -s ${api}/v1/me -H "Authorization: Bearer $TRILLEO_API_KEY"
\`\`\`

3. Read the [reference](#reference) for the routes you need, and the [conventions](${api}/docs/conventions/) that apply to all of them.

## Guides

- [Authentication](${api}/docs/authentication/): keys, scopes, keeping keys safe.
- [Personal tokens](${api}/docs/personal-tokens/): acting for one person's account, and linking a device (game mods, scripts).
- [SkyBlock sync](${api}/docs/skyblock-sync/): a mod sending someone's Hypixel SkyBlock attribute levels and Hunting Box to their collection.
- [Conventions](${api}/docs/conventions/): requests, answers, dates, caching, CORS.
- [Errors](${api}/docs/errors/): the error shape and every code.
- [Rate limits](${api}/docs/rate-limits/): how many requests, and the headers that say so.
- [Webhooks](${api}/docs/webhooks/): events sent to your app as they happen, instead of polling.
- [Versioning](${api}/docs/versioning/): what may change within v1, and how you'll know.
- [Changelog](${api}/docs/changelog/): what changed, newest first.

## Reference

${groups}

## Machine-readable

- [/docs.md](${api}/docs.md): all of these docs in one Markdown file, for reading in one go (AI coding agents: start here).
- [/openapi.json](${api}/openapi.json): an OpenAPI 3.1 description of every route, for generating clients.
- [/llms.txt](${api}/llms.txt): a short index of the docs.`;
}

export function authenticationMarkdown(context: DocContext): string {
  const scopes = Object.entries(API_SCOPES)
    .map(([scope, summary]) => `| \`${scope}\` | ${summary} |`)
    .join("\n");
  return `Some routes are public; the rest need an API key. Every key belongs to an **app** (one program, such as a Discord bot), made by the site's admin in the control panel. An app can have several keys (one per place it runs, say), each revocable on its own.

Routes that act for one person's account (syncing their game progress, say) take that person's **personal token** instead: see [Personal tokens](${context.api}/docs/personal-tokens/).

## Sending the key

Put it in the \`Authorization\` header of every request:

\`\`\`http
GET /v1/me HTTP/1.1
Host: ${new URL(context.api).host}
Authorization: Bearer ${KEY_PREFIX}…
\`\`\`

Keys look like \`${KEY_PREFIX}\` followed by 32 letters and digits. They're shown once, when they're made; the site keeps only a hash, so a lost key can't be recovered, only replaced.

A public route accepts a key too: it's checked (a bad key is an error, not ignored) and the request counts against the key's own rate limit instead of the shared one.

## Scopes

A route that does more than read public things names a **scope** the key must have. An app is given scopes in the control panel; each key has all of its app's scopes, or a chosen few. Without the scope, the answer is \`403 insufficient_scope\` with \`details.required\` naming it.

| Scope | Allows |
| --- | --- |
${scopes}

\`GET /v1/me\` shows a key's scopes.

## When a key stops working

| Code | Why |
| --- | --- |
| \`missing_key\` | The route needs a key and none was sent. |
| \`invalid_key\` | Not a key the site knows (or the header isn't \`Bearer <key>\`). |
| \`key_revoked\` | Revoked in the control panel. |
| \`key_expired\` | Past the expiry date it was given. |
| \`app_disabled\` | Its app is switched off. |

None of these get better by retrying: stop and report it.

## Keeping keys safe

- Keep keys on a server, in an environment variable or secret store (\`TRILLEO_API_KEY\` in these docs), never in code you commit.
- Never put a key in a web page or app people download: anyone could read it there. Routes that need a key don't answer browsers' cross-origin requests at all (see [Conventions](${context.api}/docs/conventions/)).
- One key per place it runs, so one can be revoked without stopping the others.
- If a key leaks, ask for it to be revoked at once; a new one can be made in a minute.`;
}

export function conventionsMarkdown(context: DocContext): string {
  return `## Requests

- Base address: \`${context.api}/v1/\`. HTTPS only.
- Bodies (for \`POST\`, \`PUT\`, \`PATCH\`) are JSON with \`Content-Type: application/json\`, at most ${n(API_LIMITS.bodyBytes)} bytes.
- Fields a route doesn't know are ignored, in bodies and query strings, so a client can send extra fields safely.
- Query parameters are text: numbers as \`?days=7\`, booleans as \`true\`/\`false\`. An empty parameter counts as left out.
- A trailing slash is optional: \`/v1/me\` and \`/v1/me/\` are the same route.

## Answers

- Always JSON (\`application/json; charset=utf-8\`), errors included.
- A success is the thing itself, not wrapped: \`GET /v1/me\` answers \`{ "app": …, "key": … }\`.
- Field names are camelCase. A field that can be "not set" is \`null\`, never left out, unless the reference says it may be absent.
- Times are ISO 8601 in UTC with milliseconds (\`2026-10-23T08:00:00.000Z\`); calendar days are \`YYYY-MM-DD\`, and a "day" is a UTC day unless the route says otherwise.
- Every answer has a \`Request-Id\` header (also in error bodies as \`requestId\`). Quote it when asking about a request.

## Lists

Routes that return lists say how they page. When they do, it's cursor-based: the answer has \`items\` and \`nextCursor\` (null on the last page); pass \`?cursor=<nextCursor>\` for the next page, with the same other parameters. Cursors are opaque: don't build or change them.

## Caching

- Public routes, called without a key, may be cached by browsers and proxies for the time in \`Cache-Control\` (usually a minute).
- Anything called with a key is \`private, no-store\`.

## CORS

Public routes allow requests from any web page (\`Access-Control-Allow-Origin: *\`). Routes that need a key or a personal token don't send CORS headers, so browsers refuse to call them from other sites: a key in a web page isn't secret.

## Methods

- \`HEAD\` works wherever \`GET\` does.
- A route called with a method it doesn't take answers \`405 method_not_allowed\` with an \`Allow\` header.`;
}

export function errorsMarkdown(context: DocContext): string {
  const rows = Object.entries(ERROR_CODES)
    .map(
      ([code, info]) =>
        `| \`${code}\` | ${String(info.status)} | ${cell(info.description)} |`,
    )
    .join("\n");
  return `Every error has the same shape, whatever went wrong:

\`\`\`json
{
  "error": {
    "code": "invalid_input",
    "message": "\`days\` must be between 1 and 90.",
    "details": { "problems": [{ "path": "days", "message": "\`days\` must be between 1 and 90." }] },
    "requestId": "req_8Hc2u0aQk1xYb3Lm"
  }
}
\`\`\`

- \`code\` is stable: switch on it. New codes may be added (see [Versioning](${context.api}/docs/versioning/)); treat one you don't know by its HTTP status.
- \`message\` is for people (logs, a bot's reply), in English. Don't parse it; it may be reworded.
- \`details\` is there when there's more to say, as the code's description below explains.
- \`requestId\` matches the \`Request-Id\` header.

## Codes

| Code | Status | Meaning |
| --- | --- | --- |
${rows}

## What to retry

- \`429 rate_limited\`: yes, after \`Retry-After\` seconds.
- \`500 internal_error\`: reads, yes, with a growing delay (say 1 s, 5 s, 30 s). Writes only if the route says repeating it is safe.
- Everything else (4xx): no. The same request will fail the same way.`;
}

export function rateLimitsMarkdown(context: DocContext): string {
  return `Requests are limited per minute:

| Caller | Limit |
| --- | --- |
| With a key | The app's limit, set in the control panel (${n(API_LIMITS.defaultPerMinute)} per minute unless changed), per key |
| With a personal token | ${n(USER_TOKEN_LIMITS.perMinute)} per minute, per token |
| Without a key | ${n(API_LIMITS.anonymousPerMinute)} per minute per IP address |

The limit is a bucket that refills steadily: a burst of up to the limit at once is fine, then requests fit in as the bucket refills (a 120-per-minute key gets one more every half second).

## Headers

Every answer that got as far as the limit has:

| Header | Meaning |
| --- | --- |
| \`RateLimit-Limit\` | Requests per minute for this caller. |
| \`RateLimit-Remaining\` | Requests that would fit right now. |
| \`RateLimit-Reset\` | Seconds until the bucket is full again. |

Over the limit, the answer is \`429 rate_limited\` with \`Retry-After\` (seconds) and \`details.retryAfter\`. Wait at least that long. Some routes have their own limits on top (the reference says so).

## Being a good client

- Ask for what changed rarely once, and keep it: most things here change at most daily.
- Don't poll faster than you need; [webhooks](${context.api}/docs/webhooks/) are better than polling where there's an event for it.
- Spread scheduled work out a little instead of firing at exactly 00:00:00.`;
}

export function versioningMarkdown(context: DocContext): string {
  return `The version is the first part of the path: \`/v1/\`.

## What can change within v1

Only additions:

- new routes, scopes and error codes;
- new optional query parameters and body fields;
- new fields in answers;
- new values in fields whose docs say the list may grow.

So clients should ignore answer fields they don't know, and treat an unknown error code by its HTTP status.

## What can't

Within v1 nothing is renamed, removed, or changes type or meaning, and nothing optional becomes required. Changes like that would come as \`/v2/\`, with v1 kept running alongside for a good while.

If a route is ever going away, its answers carry a \`Deprecation\` header (and \`Sunset\`, with the date it stops) well before, and the [changelog](${context.api}/docs/changelog/) says what to use instead.`;
}

export function changelogMarkdown(): string {
  return API_CHANGELOG.map(
    (entry) =>
      `## ${entry.date}\n\n${entry.changes.map((change) => `- ${change}`).join("\n")}`,
  ).join("\n\n");
}

export function personalTokensMarkdown(context: DocContext): string {
  const { api, site } = context;
  const scopes = Object.entries(USER_SCOPES)
    .map(([scope, summary]) => `| \`${scope}\` | ${summary} |`)
    .join("\n");
  const minutes = String(DEVICE_LIMITS.codeMinutes);
  const interval = String(DEVICE_LIMITS.intervalSeconds);
  return `API keys belong to apps the site's admin makes. A **personal token** belongs to one person's account instead, and lets a program act for them, within the token's scopes: a game mod that syncs their progress, a script of their own. Tokens look like \`${USER_TOKEN_PREFIX}\` followed by 32 letters and digits. People see and revoke theirs on [their Apps page](${site}/account/apps/).

A program gets a token in one of two ways:

- **Linking a device** (best for anything people install): the program shows a short code, the person approves it on the site, and the program receives the token. Nobody copies a secret.
- **By hand:** the person makes a token on the Apps page and pastes it into the program.

## Linking a device

The device flow, as in OAuth 2.0's device authorization grant (RFC 8628), in this API's own shapes.

1. Start a link with [\`POST /v1/auth/device\`](${api}/reference/account/#startDeviceLink). Send your program's name (\`clientName\`, which the person sees and the token is named after) and the scopes you need. No key is needed.

\`\`\`bash
curl -s -X POST ${api}/v1/auth/device \\
  -H "Content-Type: application/json" \\
  -d '{"clientName":"SkyBlock mod","scopes":["skyblock:sync"]}'
\`\`\`

\`\`\`json
{
  "deviceCode": "trld_Q2k9xT7bLm4ZpR8sV1nW6yH3cJ5fD0aE",
  "userCode": "BCDF-GHJK",
  "verificationUri": "${site}/link/",
  "verificationUriComplete": "${site}/link/?code=BCDF-GHJK",
  "expiresIn": ${String(DEVICE_LIMITS.codeMinutes * 60)},
  "interval": ${interval}
}
\`\`\`

2. Show the person \`userCode\` and tell them to open \`verificationUri\` (or open \`verificationUriComplete\` for them, or show it as a QR code). They sign in there, check what's asking and approve. Keep \`deviceCode\` to yourself: it's what redeems the token.

3. Poll [\`POST /v1/auth/device/token\`](${api}/reference/account/#finishDeviceLink) with \`{ "deviceCode": "…" }\`, waiting \`interval\` seconds (${interval}) between polls:

| Answer | What to do |
| --- | --- |
| \`400 authorization_pending\` | Not decided yet. Wait \`interval\` seconds and poll again. |
| \`400 slow_down\` | You polled too soon. Wait longer (\`details.interval\`) and poll again. |
| \`200\` with \`token\` | Approved. Store the token; it's answered only this once. |
| \`403 access_denied\` | They declined (or have no room for another token). Stop. |
| \`400 expired_token\` | The code expired (after ${minutes} minutes) or was used. Start again from step 1. |

\`\`\`text
start = POST /v1/auth/device
show start.userCode and start.verificationUri
repeat until start.expiresIn seconds have passed:
    wait start.interval seconds
    answer = POST /v1/auth/device/token { deviceCode: start.deviceCode }
    if answer is 200: save answer.token, then stop
    if answer.error.code is "slow_down": add 5 seconds to the wait
    if answer.error.code is "access_denied" or "expired_token": stop
\`\`\`

4. Check the token with [\`GET /v1/account\`](${api}/reference/account/#getAccount), which says whose account it is: show "Linked as @name".

## Sending the token

Exactly like a key, in the \`Authorization\` header:

\`\`\`bash
curl -s ${api}/v1/account -H "Authorization: Bearer $TRILLEO_TOKEN"
\`\`\`

Routes that act for an account say "Personal token" under **Auth** in the reference. They refuse an app's key (\`401 token_required\`), and routes that need an app's key refuse a token (\`401 missing_key\`). Public routes accept a token too: it's checked, and the request counts against the token's own limit.

## Scopes

A token can only do what its scopes allow; the person sees them before approving.

| Scope | Allows |
| --- | --- |
${scopes}

Ask only for what you use. A token can never sign in on the site, see the account's email address or change the account.

## When a token stops working

| Code | Why |
| --- | --- |
| \`token_required\` | The route acts for an account and no token (or an app's key) was sent. |
| \`invalid_key\` | Not a token the site knows. |
| \`key_revoked\` | The person revoked it on the Apps page (or your program did). |
| \`key_expired\` | Past the expiry it was made with (linked tokens don't expire). |
| \`account_blocked\` | The account is blocked. |
| \`insufficient_scope\` | It hasn't the scope this route needs. |

None of these get better by retrying. For the first five, forget the token and offer to link again.

## Unlinking

Give people a way to unlink in your program: [\`DELETE /v1/account/token\`](${api}/reference/account/#revokeOwnToken) revokes the token it's sent with, and the site lists it no more. People can also revoke it on the site, which your program sees as \`key_revoked\`.

## Limits

- Each token makes up to ${n(USER_TOKEN_LIMITS.perMinute)} requests a minute; the usual [rate-limit headers](${api}/docs/rate-limits/) say how many are left.
- An account can have ${n(USER_TOKEN_LIMITS.perUser)} tokens at once.
- One visitor can start ${n(DEVICE_LIMITS.startsPerMinute)} device links a minute.
- Requests made with a token aren't counted per route; the site notes only when each token was last used.

## Keeping tokens safe

- Store the token where only that person can read it (the program's own config folder), never next to files people share (screenshots of settings, crash reports, logs).
- Never print it, log it or send it anywhere but this API.
- Routes that act for an account don't answer browsers' cross-origin requests: a token in a web page isn't secret.`;
}

export function skyblockSyncMarkdown(context: DocContext): string {
  const { api, site } = context;
  const modes = Object.entries(GAME_MODES)
    .map(([mode, label]) => `\`${mode}\` (${label})`)
    .join(", ");
  return `A mod (or any program) can keep someone's Hypixel SkyBlock collection on the site up to date: it reads their attribute levels and the shards in their Hunting Box in the game and sends them here. The site's [collection](${site}${COLLECTION_PATH}), [fusion calculator](${site}${CALCULATOR_PATH}) and [hunting planner](${site}${PLANNER_PATH}) then use them. Every route is in the [SkyBlock sync reference](${api}/reference/skyblock-sync/).

## 1. Get a token

The routes act for one person, so they take that person's **personal token** with the \`skyblock:sync\` scope. Link the device as the [Personal tokens](${api}/docs/personal-tokens/) guide explains: start with \`{"clientName": "<your mod>", "scopes": ["skyblock:sync"]}\`, show the code, poll for the token, store it. Then \`GET /v1/account\` gives the username to show ("Linked as @name").

## 2. Know which profile

Someone may have several SkyBlock profiles, and the site keeps one collection per profile (up to ${String(PROFILE_LIMITS.perUser)}). Profiles are addressed by **Hypixel's profile ID** (\`profile_id\` in Hypixel's API, a UUID; dashes optional) in every path:

\`\`\`text
${api}/v1/skyblock/me/profiles/{profileId}/…
\`\`\`

Send the profile's name in the game (\`name\`, e.g. "Apple"), and optionally the player's Minecraft UUID and the game mode: ${modes}. Hypixel's API calls Stranded \`island\`; send it as \`stranded\`, and Classic as \`classic\`.

You never need to create a profile first: the first sync from a profile makes it. If the person already made a profile on the site with the same name, or only has the one profile the site made for them, the first sync takes it over instead, so their earlier data stays theirs. A sync never changes which profile the site's pages show; the person picks that on the site.

## 3. Send what the game shows

[\`POST /v1/skyblock/me/profiles/{profileId}/sync\`](${api}/reference/skyblock-sync/#syncSkyblockProfile):

\`\`\`json
{
  "name": "Apple",
  "gameMode": "classic",
  "levels": [
    { "id": "SHARD_GROVE", "level": 10 },
    { "id": "SHARD_TIAMAT", "level": 3 }
  ],
  "held": [{ "id": "SHARD_TIAMAT", "count": 3 }],
  "syncKey": "7c0d5a52-3f0e-4c7e-9a43-2d1f6a3b9e10"
}
\`\`\`

- **Shard IDs** are Hypixel's item IDs (\`SHARD_GROVE\`). [\`GET /v1/skyblock/shards\`](${api}/reference/skyblock/#listSkyblockShards) lists every shard the site knows, with its name and rarity. IDs it doesn't know are skipped and come back in \`unknownIds\`: not an error, since the game can have new shards before the site's data does.
- **\`levels\`**: each attribute's level, 0 to ${String(MAX_ATTRIBUTE_LEVEL)}.
- **\`held\`**: shards held and not yet fused (the Hunting Box), 0 to ${n(COLLECTION_LIMITS.held)} each.
- **The game wins.** With \`mode\` "replace" (the default), each list you send replaces that part of the collection: send every shard you read, levels at 0 included or left out, and anything missing is set to 0. When you only read part of it (one page of a menu), send \`"mode": "merge"\`: only the shards listed change, and a 0 removes one. A list you leave out entirely isn't touched, so a sync of \`levels\` alone keeps \`held\` as it was. The shards the person keeps out of plans (set on the site) never change.
- Up to ${n(COLLECTION_LIMITS.entries)} entries per list.

The answer says what changed, which you can show in chat:

\`\`\`json
{
  "syncId": 42,
  "duplicate": false,
  "created": false,
  "profile": { "id": 7, "name": "Apple", "hypixelProfileId": "1f2e3d4c5b6a79801a2b3c4d5e6f7a8b", "active": true, "…": "…" },
  "changes": {
    "levels": [{ "id": "SHARD_TIAMAT", "name": "Tiamat", "from": 2, "to": 3 }],
    "held": [{ "id": "SHARD_TIAMAT", "name": "Tiamat", "from": 0, "to": 3 }]
  },
  "unknownIds": [],
  "progress": { "maxed": 12, "levels": 412, "leftToMax": 9810, "shards": 325 }
}
\`\`\`

## 4. Retrying safely

Give every sync a \`syncKey\` (a fresh UUID is fine) and reuse it when you retry the same sync after a timeout or \`500\`. If the site already applied it, it answers the first result again with \`duplicate: true\` and changes nothing.

## When to sync

- After reading something that changed (closing the menu, finishing a fusion), not on a timer.
- Wait a few seconds and send once if several changes come together.
- Each token makes up to ${n(USER_TOKEN_LIMITS.perMinute)} requests a minute. One sync a minute is plenty; the site keeps a log of each (${String(SYNC_LOG_LIMITS.days)} days), and its collection page shows the latest.

\`\`\`text
on attribute menu or hunting box closed:
    levels, held, complete = read what was shown
    wait 3 seconds for more changes, then:
    answer = POST /v1/skyblock/me/profiles/{profile_id}/sync
             { name, gameMode, levels, held,
               mode: complete ? "replace" : "merge",
               syncKey: new UUID }
    if answer is 200: show the changed levels in chat
    if answer.error.code is "rate_limited": try again after Retry-After
    if answer.error.code is "key_revoked" or "invalid_key": forget the token, offer to link again
\`\`\`

## Reading it back

- [\`GET /v1/skyblock/me/profiles\`](${api}/reference/skyblock-sync/#listSkyblockProfiles): the account's profiles, and which one the site shows.
- [\`GET …/{profileId}/collection\`](${api}/reference/skyblock-sync/#getSkyblockCollection): the collection as the site has it now (people can change it by hand on the site too).
- [\`GET …/{profileId}/syncs\`](${api}/reference/skyblock-sync/#listSkyblockSyncs): the latest syncs and what each changed.

## Errors worth handling

| Code | What to do |
| --- | --- |
| \`invalid_input\` | A field is wrong (\`details.problems\` says which): fix the mod. |
| \`profile_limit\` | The account has ${String(PROFILE_LIMITS.perUser)} profiles; tell the person to delete one on the site. |
| \`not_found\` | Reading a profile that was never synced: sync it first. |
| \`token_required\`, \`invalid_key\`, \`key_revoked\`, \`key_expired\`, \`account_blocked\` | The token doesn't work any more: forget it and offer to link again. |
| \`rate_limited\` | Wait \`Retry-After\` seconds. |`;
}
