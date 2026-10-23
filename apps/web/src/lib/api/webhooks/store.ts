/**
 * Webhooks (api_webhooks) and their outbox (api_webhook_deliveries). The admin adds
 * them to an app in /admin/api/<id>/; `emit` queues an event for every webhook that
 * wants it, once per event ID; deliver.ts sends what's queued.
 */
import { createHmac, randomBytes } from "node:crypto";
import {
  apiApps,
  apiWebhookDeliveries,
  apiWebhooks,
  type ApiWebhook,
  type ApiWebhookDelivery,
  type Database,
} from "@trilleo/db";
import { and, count, desc, eq, inArray, isNull, lt } from "drizzle-orm";
import { randomToken } from "../keys";
import { effectiveScopes } from "../scopes";
import {
  CHOOSABLE_EVENTS,
  WEBHOOK_EVENTS,
  type WebhookEventName,
  type WebhookPayload,
} from "./events";

const DAY_MS = 24 * 60 * 60 * 1000;

export const WEBHOOK_LIMITS = {
  /** Webhooks per app. */
  perApp: 5,
  /** Waits before each retry; after the last, the delivery has failed. */
  retryDelaysMs: [
    60_000,
    5 * 60_000,
    30 * 60_000,
    2 * 60 * 60_000,
    6 * 60 * 60_000,
    12 * 60 * 60_000,
  ],
  /** How long a delivery waits for an answer. */
  timeoutMs: 10_000,
  /** Failed deliveries in a row before the webhook is switched off. */
  failuresToDisable: 5,
  /** Deliveries are listed this long, then deleted. */
  deliveryDays: 30,
  /** A signature's timestamp may be this old (receivers should check). */
  toleranceSeconds: 300,
  url: 500,
} as const;

export const SECRET_PREFIX = "whsec_";

export function generateSecret(): string {
  return randomToken(SECRET_PREFIX);
}

/**
 * The signature header: `t=<unix seconds>,v1=<hex HMAC-SHA256 of "<t>.<body>">`.
 * The Webhooks guide shows receivers how to check it.
 */
export function signatureHeader(
  secret: string,
  body: string,
  now: Date,
): string {
  const timestamp = Math.floor(now.getTime() / 1000);
  const mac = createHmac("sha256", secret)
    .update(`${String(timestamp)}.${body}`)
    .digest("hex");
  return `t=${String(timestamp)},v1=${mac}`;
}

export type WebhookProblem = "url" | "events" | "limit";

export const WEBHOOK_PROBLEMS: Readonly<Record<WebhookProblem, string>> = {
  url: "Give an https:// address (plain http only for localhost), without a password in it.",
  events: "Choose at least one event the app's scopes allow.",
  limit: `An app can have at most ${String(WEBHOOK_LIMITS.perApp)} webhooks.`,
};

/** An address deliveries may go to: https, or http to this machine (development). */
export function checkWebhookUrl(raw: string): string | null {
  const text = raw.trim();
  if (text.length === 0 || text.length > WEBHOOK_LIMITS.url) return null;
  let url: URL;
  try {
    url = new URL(text);
  } catch {
    return null;
  }
  if (url.username || url.password) return null;
  const local =
    url.hostname === "localhost" ||
    url.hostname === "127.0.0.1" ||
    url.hostname === "[::1]" ||
    url.hostname.endsWith(".localhost");
  if (url.protocol !== "https:" && !(url.protocol === "http:" && local))
    return null;
  return url.href;
}

/** The events an app's scopes allow, of those asked for (known ones only). */
export function allowedEvents(
  appScopes: readonly string[],
  wanted: readonly string[],
): WebhookEventName[] {
  const scopes = effectiveScopes(appScopes, null);
  return CHOOSABLE_EVENTS.filter((name) => {
    if (!wanted.includes(name)) return false;
    const scope = WEBHOOK_EVENTS[name].scope;
    return scope === null || (scopes as string[]).includes(scope);
  });
}

export async function webhooksOf(
  db: Database,
  appId: number,
): Promise<ApiWebhook[]> {
  return db
    .select()
    .from(apiWebhooks)
    .where(eq(apiWebhooks.appId, appId))
    .orderBy(apiWebhooks.id);
}

export async function getWebhook(
  db: Database,
  appId: number,
  id: number,
): Promise<ApiWebhook | undefined> {
  const [row] = await db
    .select()
    .from(apiWebhooks)
    .where(and(eq(apiWebhooks.id, id), eq(apiWebhooks.appId, appId)));
  return row;
}

export async function createWebhook(
  db: Database,
  app: { id: number; scopes: readonly string[] },
  input: { url: string; events: readonly string[] },
  now = new Date(),
): Promise<
  { ok: true; webhook: ApiWebhook } | { ok: false; problem: WebhookProblem }
> {
  const url = checkWebhookUrl(input.url);
  if (!url) return { ok: false, problem: "url" };
  const events = allowedEvents(app.scopes, input.events);
  if (events.length === 0) return { ok: false, problem: "events" };
  const [existing] = await db
    .select({ n: count() })
    .from(apiWebhooks)
    .where(eq(apiWebhooks.appId, app.id));
  if ((existing?.n ?? 0) >= WEBHOOK_LIMITS.perApp)
    return { ok: false, problem: "limit" };
  const [webhook] = await db
    .insert(apiWebhooks)
    .values({
      appId: app.id,
      url,
      secret: generateSecret(),
      events,
      createdAt: now,
      updatedAt: now,
    })
    .returning();
  if (!webhook) throw new Error("The webhook wasn't saved.");
  return { ok: true, webhook };
}

export async function updateWebhook(
  db: Database,
  app: { scopes: readonly string[] },
  webhook: ApiWebhook,
  input: { url: string; events: readonly string[] },
  now = new Date(),
): Promise<{ ok: true } | { ok: false; problem: WebhookProblem }> {
  const url = checkWebhookUrl(input.url);
  if (!url) return { ok: false, problem: "url" };
  const events = allowedEvents(app.scopes, input.events);
  if (events.length === 0) return { ok: false, problem: "events" };
  await db
    .update(apiWebhooks)
    .set({ url, events, updatedAt: now })
    .where(eq(apiWebhooks.id, webhook.id));
  return { ok: true };
}

/** Switches a webhook off (with why) or back on, which also forgets its failures. */
export async function setWebhookDisabled(
  db: Database,
  id: number,
  reason: string | null,
  now = new Date(),
): Promise<void> {
  await db
    .update(apiWebhooks)
    .set(
      reason === null
        ? {
            disabledAt: null,
            disabledReason: null,
            failures: 0,
            updatedAt: now,
          }
        : { disabledAt: now, disabledReason: reason, updatedAt: now },
    )
    .where(eq(apiWebhooks.id, id));
}

export async function rotateSecret(
  db: Database,
  id: number,
  now = new Date(),
): Promise<void> {
  await db
    .update(apiWebhooks)
    .set({ secret: generateSecret(), updatedAt: now })
    .where(eq(apiWebhooks.id, id));
}

export async function deleteWebhook(db: Database, id: number): Promise<void> {
  await db.delete(apiWebhooks).where(eq(apiWebhooks.id, id));
}

function deliveryId(): string {
  return `dlv_${randomBytes(12).toString("base64url")}`;
}

/** Webhooks that are on, whose app is on, that want this event and may have it. */
async function listeners(
  db: Database,
  type: WebhookEventName,
): Promise<ApiWebhook[]> {
  const rows = await db
    .select({ webhook: apiWebhooks, appScopes: apiApps.scopes })
    .from(apiWebhooks)
    .innerJoin(apiApps, eq(apiApps.id, apiWebhooks.appId))
    .where(and(isNull(apiWebhooks.disabledAt), isNull(apiApps.disabledAt)));
  return rows
    .filter(({ webhook, appScopes }) =>
      allowedEvents(appScopes, webhook.events).includes(type),
    )
    .map(({ webhook }) => webhook);
}

/** Whether any webhook is listening at all (so the regular checks can stop early). */
export async function anyListening(db: Database): Promise<boolean> {
  const [row] = await db
    .select({ id: apiWebhooks.id })
    .from(apiWebhooks)
    .where(isNull(apiWebhooks.disabledAt))
    .limit(1);
  return row !== undefined;
}

/**
 * Queues an event for every webhook that wants it (or just `only`), once per event ID
 * and webhook: emitting the same event again changes nothing. Returns how many were
 * queued.
 */
export async function emit(
  db: Database,
  type: WebhookEventName,
  eventId: string,
  data: unknown,
  now = new Date(),
  only: ApiWebhook | null = null,
): Promise<number> {
  const targets = only ? [only] : await listeners(db, type);
  if (targets.length === 0) return 0;
  const payload: WebhookPayload = {
    id: eventId,
    type,
    createdAt: now.toISOString(),
    data,
  };
  const rows = await db
    .insert(apiWebhookDeliveries)
    .values(
      targets.map((webhook) => ({
        id: deliveryId(),
        webhookId: webhook.id,
        eventId,
        event: type,
        payload,
        status: "queued",
        nextAttemptAt: now,
        createdAt: now,
      })),
    )
    .onConflictDoNothing({
      target: [apiWebhookDeliveries.webhookId, apiWebhookDeliveries.eventId],
    })
    .returning({ id: apiWebhookDeliveries.id });
  return rows.length;
}

/** A ping to one webhook, from the control panel. */
export async function sendTest(
  db: Database,
  webhook: ApiWebhook,
  now = new Date(),
): Promise<void> {
  await emit(
    db,
    "ping",
    `ping:${randomBytes(6).toString("base64url")}`,
    WEBHOOK_EVENTS.ping.example,
    now,
    webhook,
  );
}

export interface DeliveryRow extends ApiWebhookDelivery {
  url: string;
}

/** An app's newest deliveries, across its webhooks. */
export async function recentDeliveries(
  db: Database,
  appId: number,
  limit = 20,
): Promise<DeliveryRow[]> {
  const rows = await db
    .select({ delivery: apiWebhookDeliveries, url: apiWebhooks.url })
    .from(apiWebhookDeliveries)
    .innerJoin(apiWebhooks, eq(apiWebhooks.id, apiWebhookDeliveries.webhookId))
    .where(eq(apiWebhooks.appId, appId))
    .orderBy(
      desc(apiWebhookDeliveries.createdAt),
      desc(apiWebhookDeliveries.id),
    )
    .limit(limit);
  return rows.map(({ delivery, url }) => ({ ...delivery, url }));
}

/** Sends a delivery again from the start of its retries (one of the app's own). */
export async function redeliver(
  db: Database,
  appId: number,
  id: string,
  now = new Date(),
): Promise<boolean> {
  const hooks = (await webhooksOf(db, appId)).map((webhook) => webhook.id);
  if (hooks.length === 0) return false;
  const rows = await db
    .update(apiWebhookDeliveries)
    .set({ status: "queued", attempts: 0, nextAttemptAt: now })
    .where(
      and(
        eq(apiWebhookDeliveries.id, id),
        inArray(apiWebhookDeliveries.webhookId, hooks),
      ),
    )
    .returning({ id: apiWebhookDeliveries.id });
  return rows.length > 0;
}

export async function purgeDeliveries(
  db: Database,
  now = new Date(),
): Promise<void> {
  await db
    .delete(apiWebhookDeliveries)
    .where(
      lt(
        apiWebhookDeliveries.createdAt,
        new Date(now.getTime() - WEBHOOK_LIMITS.deliveryDays * DAY_MS),
      ),
    );
}
