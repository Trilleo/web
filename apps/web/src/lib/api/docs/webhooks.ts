/**
 * The Webhooks guide: how deliveries look, every event (from WEBHOOK_EVENTS, with its
 * data described from its schema), checking signatures, retries. Numbers come from
 * WEBHOOK_LIMITS; what it says about behaviour must match webhooks/deliver.ts.
 */
import { WEBHOOK_EVENTS, type WebhookEventName } from "../webhooks/events";
import { SECRET_PREFIX, WEBHOOK_LIMITS } from "../webhooks/store";
import type { DocContext } from "./context";
import { fieldTable } from "./reference";

function duration(ms: number): string {
  const minutes = ms / 60_000;
  return minutes < 60 ? `${String(minutes)} min` : `${String(minutes / 60)} h`;
}

function eventSection(name: WebhookEventName): string {
  const event = WEBHOOK_EVENTS[name];
  const payload = {
    id:
      name === "cryptic.day"
        ? "cryptic.day:2026-10-23"
        : name === "post.published"
          ? "post.published:17"
          : "ping:Q2x9aWF0",
    type: name,
    createdAt: "2026-10-23T00:00:05.000Z",
    data: event.example,
  };
  return [
    `### \`${name}\``,
    event.summary,
    `- **When:** ${event.when}\n- **Scope the app needs:** ${event.scope ? `\`${event.scope}\`` : "none"}`,
    `\`data\`:\n\n${fieldTable(event.data, false)}`,
    "```json\n" + JSON.stringify(payload, null, 2) + "\n```",
  ].join("\n\n");
}

export function webhooksMarkdown(context: DocContext): string {
  const events = (Object.keys(WEBHOOK_EVENTS) as WebhookEventName[])
    .map(eventSection)
    .join("\n\n");
  const delays = WEBHOOK_LIMITS.retryDelaysMs.map(duration).join(", ");
  return `Instead of asking the API over and over, an app can be told when something happens: the site sends an HTTPS POST to an address of the app's, signed so the app knows it came from here.

## Setting one up

Webhooks are added to an app in the site's control panel (by its admin): an address (\`https://\`; plain \`http://\` only to localhost, for development) and the events wanted. Only events the app's scopes allow can be chosen. Each webhook gets a **signing secret** (\`${SECRET_PREFIX}…\`), shown in the panel; keep it like an API key (\`TRILLEO_WEBHOOK_SECRET\` below). The panel can send a test (\`ping\`), make a new secret, and list recent deliveries with their results.

No public address (a bot on a home connection, say)? Don't use webhooks: poll instead. For the daily cryptic that's one \`GET /v1/cryptic/today\` a little after 00:00 UTC.

## What arrives

\`POST\` to the address, with a JSON body:

\`\`\`json
{
  "id": "cryptic.day:2026-10-23",
  "type": "cryptic.day",
  "createdAt": "2026-10-23T00:00:05.000Z",
  "data": { "…": "depends on the type" }
}
\`\`\`

| Header | Meaning |
| --- | --- |
| \`Content-Type\` | \`application/json; charset=utf-8\` |
| \`User-Agent\` | \`Trilleo-Webhooks/1 (+${context.api}/docs/webhooks/)\` |
| \`Trilleo-Event\` | The type, as in the body. |
| \`Trilleo-Delivery\` | This delivery's ID (\`dlv_…\`); a redelivery reuses it. |
| \`Trilleo-Signature\` | \`t=<unix seconds>,v1=<hex HMAC-SHA256>\`: see below. |

- \`id\` is the event's own ID, the same in every retry and redelivery. Keep the IDs you've handled for a day or two and skip repeats: an event may arrive more than once.
- Events may arrive out of order (a retry can come after a later event). Use \`createdAt\` or the data's own dates if order matters.
- Ignore event types you don't know: new ones may be added (see [Versioning](${context.api}/docs/versioning/)), though a webhook only gets the ones chosen for it, and \`ping\`.

## Checking the signature

Check every delivery before acting on it. \`v1\` is the HMAC-SHA256, in hex, of the timestamp \`t\`, a full stop, and the **raw** body, keyed with the webhook's secret. Refuse it when \`t\` is more than ${String(WEBHOOK_LIMITS.toleranceSeconds / 60)} minutes from your clock (a replayed old delivery). Compare in constant time. This function says whether a delivery is genuine; \`body\` must be the raw text, before \`JSON.parse\`:

\`\`\`ts
import { createHmac, timingSafeEqual } from "node:crypto";

export function verifyTrilleoSignature(
  secret: string,
  header: string | null,
  body: string,
  now = Date.now(),
): boolean {
  if (!header) return false;
  const parts = new Map(
    header.split(",").map((part) => {
      const at = part.indexOf("=");
      return [part.slice(0, at).trim(), part.slice(at + 1).trim()] as const;
    }),
  );
  const t = Number(parts.get("t"));
  const given = parts.get("v1") ?? "";
  if (!Number.isInteger(t) || Math.abs(now / 1000 - t) > ${String(WEBHOOK_LIMITS.toleranceSeconds)}) return false;
  const expected = createHmac("sha256", secret).update(\`\${String(t)}.\${body}\`).digest("hex");
  return (
    given.length === expected.length &&
    timingSafeEqual(Buffer.from(given), Buffer.from(expected))
  );
}
\`\`\`

With Express, read the body raw for this route (\`express.raw({ type: "application/json" })\`), check it, then \`JSON.parse\` it.

## Answering

Answer with any **2xx** within ${String(WEBHOOK_LIMITS.timeoutMs / 1000)} seconds; the body of the answer is ignored. Do slow work (posting to Discord, say) after answering, not before. Redirects aren't followed.

| Answer | What happens |
| --- | --- |
| 2xx | Delivered. |
| No answer, a network error, 5xx, 408 or 429 | Tried again after ${delays} (${String(WEBHOOK_LIMITS.retryDelaysMs.length)} retries), then failed. |
| Any other status (400, 401, 404, …) | Failed at once: it would fail again. |

After ${String(WEBHOOK_LIMITS.failuresToDisable)} failed deliveries in a row, the webhook is switched off and the site's admin is told; nothing more is sent until it's switched back on, which also sends what waited. Deliveries are listed in the control panel for ${String(WEBHOOK_LIMITS.deliveryDays)} days, where any can be sent again.

## Events

${events}`;
}
