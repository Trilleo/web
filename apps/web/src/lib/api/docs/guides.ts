/**
 * The docs' written pages. They quote numbers, codes and scopes from the code (limits,
 * errors, scopes), so they change with it; anything else they say about behaviour
 * must be kept true by hand when the dispatcher changes.
 */
import { ERROR_CODES } from "../errors";
import { KEY_PREFIX } from "../keys";
import { API_LIMITS } from "../limits";
import { API_GROUPS, usedGroups, type Route } from "../registry";
import { API_SCOPES } from "../scopes";
import { API_CHANGELOG } from "./changelog";
import type { DocContext } from "./context";

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

Public routes allow requests from any web page (\`Access-Control-Allow-Origin: *\`). Routes that need a key don't send CORS headers, so browsers refuse to call them from other sites: a key in a web page isn't secret.

## Methods

- \`HEAD\` works wherever \`GET\` does.
- A route called with a method it doesn't take answers \`405 method_not_allowed\` with an \`Allow\` header.`;
}

export function errorsMarkdown(context: DocContext): string {
  const rows = Object.entries(ERROR_CODES)
    .map(
      ([code, info]) =>
        `| \`${code}\` | ${String(info.status)} | ${info.description.replace(/\|/g, "\\|")} |`,
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
