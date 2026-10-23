/**
 * Sending queued deliveries: a signed JSON POST to the webhook's address. A 2xx
 * answer is success. No answer, a 5xx, 408 or 429 is retried after the next of
 * WEBHOOK_LIMITS.retryDelaysMs; any other answer, or running out of retries, fails the
 * delivery. WEBHOOK_LIMITS.failuresToDisable failed deliveries in a row switch the
 * webhook off and tell the admin.
 */
import {
  apiWebhookDeliveries,
  apiWebhooks,
  type ApiWebhook,
  type ApiWebhookDelivery,
  type Database,
} from "@trilleo/db";
import { and, asc, eq, isNull, lte, sql } from "drizzle-orm";
import { alertAdmin } from "../../mail/alerts";
import { API_URL } from "../host";
import { WEBHOOK_LIMITS, setWebhookDisabled, signatureHeader } from "./store";

/** Something that sends an HTTP request: `fetch`, or a fake in tests. */
export type Send = (url: string, init: RequestInit) => Promise<Response>;

/** Deliveries sent per pass; more wait for the next. */
const BATCH = 25;
const USER_AGENT = `Trilleo-Webhooks/1 (+${API_URL}/docs/webhooks/)`;

function retryable(status: number): boolean {
  return status >= 500 || status === 408 || status === 429;
}

type Outcome =
  | { ok: true; status: number }
  | { ok: false; status: number | null; error: string; retry: boolean };

async function post(
  send: Send,
  webhook: ApiWebhook,
  delivery: ApiWebhookDelivery,
  now: Date,
): Promise<Outcome> {
  const body = JSON.stringify(delivery.payload);
  try {
    const response = await send(webhook.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "User-Agent": USER_AGENT,
        "Trilleo-Event": delivery.event,
        "Trilleo-Delivery": delivery.id,
        "Trilleo-Signature": signatureHeader(webhook.secret, body, now),
      },
      body,
      redirect: "manual",
      signal: AbortSignal.timeout(WEBHOOK_LIMITS.timeoutMs),
    });
    if (response.status >= 200 && response.status < 300) {
      await response.body?.cancel();
      return { ok: true, status: response.status };
    }
    const text = (await response.text().catch(() => "")).slice(0, 300);
    return {
      ok: false,
      status: response.status,
      error: `Answered ${String(response.status)}${text ? `: ${text}` : ""}`,
      retry: retryable(response.status),
    };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.name === "TimeoutError"
          ? `No answer within ${String(WEBHOOK_LIMITS.timeoutMs / 1000)} s`
          : error.message
        : String(error);
    return {
      ok: false,
      status: null,
      error: message.slice(0, 300),
      retry: true,
    };
  }
}

/** Sends one delivery and records how it went. */
export async function attempt(
  db: Database,
  send: Send,
  webhook: ApiWebhook,
  delivery: ApiWebhookDelivery,
  now = new Date(),
): Promise<"sent" | "queued" | "failed"> {
  const outcome = await post(send, webhook, delivery, now);
  const attempts = delivery.attempts + 1;
  if (outcome.ok) {
    await db
      .update(apiWebhookDeliveries)
      .set({
        status: "sent",
        attempts,
        lastAttemptAt: now,
        deliveredAt: now,
        responseStatus: outcome.status,
        error: null,
        nextAttemptAt: null,
      })
      .where(eq(apiWebhookDeliveries.id, delivery.id));
    await db
      .update(apiWebhooks)
      .set({ failures: 0 })
      .where(eq(apiWebhooks.id, webhook.id));
    return "sent";
  }
  const delay = WEBHOOK_LIMITS.retryDelaysMs[attempts - 1];
  const again = outcome.retry && delay !== undefined;
  await db
    .update(apiWebhookDeliveries)
    .set({
      status: again ? "queued" : "failed",
      attempts,
      lastAttemptAt: now,
      responseStatus: outcome.status,
      error: outcome.error,
      nextAttemptAt: again ? new Date(now.getTime() + delay) : null,
    })
    .where(eq(apiWebhookDeliveries.id, delivery.id));
  if (again) return "queued";

  const [counted] = await db
    .update(apiWebhooks)
    .set({ failures: sql`${apiWebhooks.failures} + 1` })
    .where(eq(apiWebhooks.id, webhook.id))
    .returning({ failures: apiWebhooks.failures });
  if (
    (counted?.failures ?? 0) >= WEBHOOK_LIMITS.failuresToDisable &&
    webhook.disabledAt === null
  ) {
    await setWebhookDisabled(
      db,
      webhook.id,
      `${String(WEBHOOK_LIMITS.failuresToDisable)} deliveries in a row failed; the last: ${outcome.error}`,
      now,
    );
    await alertAdmin(
      db,
      {
        kind: "webhook-disabled",
        summary: `Webhook to ${new URL(webhook.url).host} switched off after failed deliveries`,
        path: `/admin/api/${String(webhook.appId)}/#webhooks`,
      },
      now,
    );
  }
  return "failed";
}

/**
 * Sends deliveries that are due, oldest first. Ones for webhooks that are switched
 * off wait (switching the webhook back on sends them).
 */
export async function deliverDue(
  db: Database,
  send: Send,
  now = new Date(),
): Promise<number> {
  const due = await db
    .select({ delivery: apiWebhookDeliveries, webhook: apiWebhooks })
    .from(apiWebhookDeliveries)
    .innerJoin(apiWebhooks, eq(apiWebhooks.id, apiWebhookDeliveries.webhookId))
    .where(
      and(
        eq(apiWebhookDeliveries.status, "queued"),
        lte(apiWebhookDeliveries.nextAttemptAt, now),
        isNull(apiWebhooks.disabledAt),
      ),
    )
    .orderBy(asc(apiWebhookDeliveries.nextAttemptAt))
    .limit(BATCH);
  let sent = 0;
  for (const { delivery, webhook } of due) {
    if ((await attempt(db, send, webhook, delivery, now)) === "sent") sent++;
  }
  return sent;
}
