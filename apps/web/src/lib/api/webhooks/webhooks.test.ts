import { createHmac, timingSafeEqual } from "node:crypto";
import {
  adminAlerts,
  apiWebhookDeliveries,
  openDatabase,
  posts,
  type ApiApp,
  type DatabaseHandle,
} from "@trilleo/db";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { checkPuzzleInput, createPuzzle } from "../../cryptic/puzzles";
import { createApp, setAppDisabled } from "../keys";
import { deliverDue, type Send } from "./deliver";
import { webhookPass } from "./run";
import {
  WEBHOOK_LIMITS,
  allowedEvents,
  checkWebhookUrl,
  createWebhook,
  emit,
  purgeDeliveries,
  recentDeliveries,
  redeliver,
  sendTest,
  setWebhookDisabled,
  signatureHeader,
  webhooksOf,
} from "./store";

const T0 = new Date("2026-10-23T00:00:05.000Z");

let handle: DatabaseHandle;
let app: ApiApp;

interface Sent {
  url: string;
  headers: Headers;
  body: string;
}

/** A receiver that answers each request with the next status (default 200). */
function receiver(statuses: (number | "error")[] = []) {
  const sent: Sent[] = [];
  const send: Send = (url, init) => {
    sent.push({
      url,
      headers: new Headers(init.headers),
      body: typeof init.body === "string" ? init.body : "",
    });
    const status = statuses.shift() ?? 200;
    if (status === "error") return Promise.reject(new Error("ECONNREFUSED"));
    return Promise.resolve(new Response("nope", { status }));
  };
  return { sent, send };
}

/** The check the Webhooks guide gives receivers. */
function verify(secret: string, header: string, body: string, now: number) {
  const parts = new Map(
    header.split(",").map((part) => {
      const at = part.indexOf("=");
      return [part.slice(0, at), part.slice(at + 1)] as const;
    }),
  );
  const t = Number(parts.get("t"));
  const given = parts.get("v1") ?? "";
  if (
    !Number.isInteger(t) ||
    Math.abs(now / 1000 - t) > WEBHOOK_LIMITS.toleranceSeconds
  )
    return false;
  const expected = createHmac("sha256", secret)
    .update(`${String(t)}.${body}`)
    .digest("hex");
  return (
    given.length === expected.length &&
    timingSafeEqual(Buffer.from(given), Buffer.from(expected))
  );
}

async function hook(events = ["cryptic.day", "post.published"]) {
  const made = await createWebhook(
    handle.db,
    app,
    { url: "https://bot.example/hook", events },
    T0,
  );
  if (!made.ok) throw new Error(made.problem);
  return made.webhook;
}

beforeEach(async () => {
  handle = await openDatabase("memory://");
  app = await createApp(
    handle.db,
    { name: "Bot", description: "", scopes: ["cryptic:read"], rateLimit: 60 },
    null,
  );
});
afterEach(async () => {
  await handle.close();
});

describe("setting up", () => {
  it("takes https addresses, and http only to this machine", () => {
    expect(checkWebhookUrl(" https://bot.example/hook ")).toBe(
      "https://bot.example/hook",
    );
    expect(checkWebhookUrl("http://localhost:3000/x")).toBe(
      "http://localhost:3000/x",
    );
    expect(checkWebhookUrl("http://bot.example/hook")).toBeNull();
    expect(checkWebhookUrl("https://user:pass@bot.example/")).toBeNull();
    expect(checkWebhookUrl("ftp://bot.example/")).toBeNull();
    expect(checkWebhookUrl("not a url")).toBeNull();
  });

  it("offers only the events the app's scopes allow", async () => {
    expect(
      allowedEvents([], ["cryptic.day", "post.published", "ping", "nope"]),
    ).toEqual(["post.published"]);
    expect(
      await createWebhook(
        handle.db,
        { id: app.id, scopes: [] },
        {
          url: "https://bot.example/",
          events: ["cryptic.day"],
        },
      ),
    ).toEqual({ ok: false, problem: "events" });
    const webhook = await hook();
    expect(webhook.events).toEqual(["cryptic.day", "post.published"]);
    expect(webhook.secret).toMatch(/^whsec_[A-Za-z0-9]{32}$/);
  });

  it("allows a few per app", async () => {
    for (let i = 0; i < WEBHOOK_LIMITS.perApp; i++) await hook();
    expect(
      await createWebhook(handle.db, app, {
        url: "https://bot.example/",
        events: ["post.published"],
      }),
    ).toEqual({ ok: false, problem: "limit" });
  });
});

describe("emitting", () => {
  it("queues an event once per webhook, only for webhooks that want it and are on", async () => {
    const wants = await hook();
    const postsOnly = await hook(["post.published"]);
    const off = await hook();
    await setWebhookDisabled(handle.db, off.id, "Testing.", T0);
    expect(
      await emit(handle.db, "cryptic.day", "cryptic.day:2026-10-23", {}, T0),
    ).toBe(1);
    expect(
      await emit(handle.db, "cryptic.day", "cryptic.day:2026-10-23", {}, T0),
    ).toBe(0);
    const rows = await handle.db.select().from(apiWebhookDeliveries);
    expect(rows.map((row) => row.webhookId)).toEqual([wants.id]);
    expect(postsOnly.id).not.toBe(wants.id);

    // An app switched off gets nothing.
    await setAppDisabled(handle.db, app.id, true, T0);
    expect(
      await emit(handle.db, "post.published", "post.published:1", {}, T0),
    ).toBe(0);
  });

  it("sends each day's cryptic and new posts, once", async () => {
    await hook();
    for (const [day, answer] of [
      ["2026-10-22", "listen"],
      ["2026-10-23", "ice cream"],
    ] as const) {
      const checked = checkPuzzleInput(
        {
          clue: "A clue",
          enumeration: "",
          answer,
          explanation: "Why.",
          setter: "",
          day,
        },
        "2026-10-01",
      );
      if (!checked.ok) throw new Error(checked.problem);
      await createPuzzle(handle.db, checked.value);
    }
    await handle.db.insert(posts).values([
      {
        slug: "fresh",
        title: "Fresh",
        status: "published",
        publishedAt: new Date(T0.getTime() - 3600_000),
        tags: ["a"],
      },
      {
        slug: "old",
        title: "Old",
        status: "published",
        publishedAt: new Date(T0.getTime() - 3 * 86_400_000),
      },
      {
        slug: "later",
        title: "Later",
        status: "published",
        publishedAt: new Date(T0.getTime() + 3600_000),
      },
      { slug: "draft", title: "Draft", status: "draft" },
    ]);
    const { sent, send } = receiver();
    await webhookPass(handle.db, send, T0);
    await webhookPass(handle.db, send, new Date(T0.getTime() + 60_000));
    expect(sent.map((s) => s.headers.get("Trilleo-Event"))).toEqual([
      "cryptic.day",
      "post.published",
    ]);
    const day = JSON.parse(sent[0]?.body ?? "{}") as {
      id: string;
      data: {
        date: string;
        today: { answer: unknown; number: number };
        yesterday: { answer: unknown };
      };
    };
    expect(day.id).toBe("cryptic.day:2026-10-23");
    expect(day.data.date).toBe("2026-10-23");
    expect(day.data.today).toMatchObject({ number: 2, answer: null });
    expect(day.data.yesterday).toMatchObject({ answer: "LISTEN" });
    const post = JSON.parse(sent[1]?.body ?? "{}") as {
      data: { post: unknown };
    };
    expect(post.data.post).toMatchObject({
      slug: "fresh",
      url: "https://www.trilleo.net/writing/fresh/",
      tags: ["a"],
    });
  });

  it("sends the day even when there's no puzzle", async () => {
    await hook(["cryptic.day"]);
    const { sent, send } = receiver();
    await webhookPass(handle.db, send, T0);
    expect(JSON.parse(sent[0]?.body ?? "{}")).toMatchObject({
      data: { date: "2026-10-23", today: null, yesterday: null },
    });
  });
});

describe("delivering", () => {
  it("signs each delivery the way the docs say to check", async () => {
    const webhook = await hook();
    await sendTest(handle.db, webhook, T0);
    const { sent, send } = receiver();
    expect(await deliverDue(handle.db, send, T0)).toBe(1);
    const request = sent[0];
    if (!request) throw new Error("Nothing was sent");
    expect(request.url).toBe("https://bot.example/hook");
    expect(request.headers.get("Content-Type")).toBe(
      "application/json; charset=utf-8",
    );
    expect(request.headers.get("Trilleo-Delivery")).toMatch(/^dlv_/);
    const signature = request.headers.get("Trilleo-Signature") ?? "";
    expect(verify(webhook.secret, signature, request.body, T0.getTime())).toBe(
      true,
    );
    expect(
      verify(webhook.secret, signature, `${request.body} `, T0.getTime()),
    ).toBe(false);
    expect(verify("whsec_other", signature, request.body, T0.getTime())).toBe(
      false,
    );
    expect(
      verify(webhook.secret, signature, request.body, T0.getTime() + 600_000),
    ).toBe(false);
    expect(signatureHeader(webhook.secret, request.body, T0)).toBe(signature);
    expect(JSON.parse(request.body)).toMatchObject({
      type: "ping",
      data: { message: expect.any(String) as unknown },
    });
    const [row] = await recentDeliveries(handle.db, app.id);
    expect(row).toMatchObject({
      status: "sent",
      attempts: 1,
      responseStatus: 200,
    });
  });

  it("retries what may work later, and gives up on what won't", async () => {
    const webhook = await hook();
    await emit(handle.db, "post.published", "post.published:1", {}, T0);
    await emit(handle.db, "post.published", "post.published:2", {}, T0);
    const { send } = receiver([503, 404]);
    await deliverDue(handle.db, send, T0);
    const rows = await handle.db
      .select()
      .from(apiWebhookDeliveries)
      .orderBy(apiWebhookDeliveries.eventId);
    expect(
      rows.map((row) => [row.eventId, row.status, row.responseStatus]),
    ).toEqual([
      ["post.published:1", "queued", 503],
      ["post.published:2", "failed", 404],
    ]);
    expect(rows[0]?.nextAttemptAt?.getTime()).toBe(
      T0.getTime() + WEBHOOK_LIMITS.retryDelaysMs[0],
    );
    expect(rows[1]?.error).toBe("Answered 404: nope");

    // Not due yet; then due, and a network error waits longer.
    expect(
      await deliverDue(
        handle.db,
        receiver().send,
        new Date(T0.getTime() + 1000),
      ),
    ).toBe(0);
    let at = T0.getTime();
    for (const delay of WEBHOOK_LIMITS.retryDelaysMs) {
      at += delay;
      await deliverDue(handle.db, receiver(["error"]).send, new Date(at));
    }
    const [last] = await handle.db
      .select()
      .from(apiWebhookDeliveries)
      .orderBy(apiWebhookDeliveries.eventId);
    expect(last).toMatchObject({
      status: "failed",
      attempts: WEBHOOK_LIMITS.retryDelaysMs.length + 1,
      error: "ECONNREFUSED",
      nextAttemptAt: null,
    });
    const [after] = await webhooksOf(handle.db, app.id);
    expect(after?.failures).toBe(2);
    expect(webhook.id).toBe(after?.id);

    // Sent again by hand: from the start of its retries.
    // (On the test's clock: the real one would make it due long after `at`.)
    expect(
      await redeliver(handle.db, app.id, last?.id ?? "", new Date(at)),
    ).toBe(true);
    expect(await deliverDue(handle.db, receiver().send, new Date(at))).toBe(1);
    const [fixed] = await webhooksOf(handle.db, app.id);
    expect(fixed?.failures).toBe(0);
    expect(await redeliver(handle.db, app.id + 1, last?.id ?? "")).toBe(false);
  });

  it("switches a webhook off after failures in a row, and tells the admin", async () => {
    const webhook = await hook();
    for (let i = 0; i < WEBHOOK_LIMITS.failuresToDisable; i++)
      await emit(
        handle.db,
        "post.published",
        `post.published:${String(i)}`,
        {},
        T0,
      );
    await deliverDue(handle.db, receiver(Array<number>(10).fill(410)).send, T0);
    const [off] = await webhooksOf(handle.db, app.id);
    expect(off?.disabledAt).toEqual(T0);
    expect(off?.disabledReason).toContain("Answered 410");
    expect(await handle.db.select().from(adminAlerts)).toMatchObject([
      {
        kind: "webhook-disabled",
        path: `/admin/api/${String(app.id)}/#webhooks`,
      },
    ]);
    // Off: what's queued waits, until it's back on.
    await emit(
      handle.db,
      "post.published",
      "post.published:late",
      {},
      T0,
      webhook,
    );
    const waiting = receiver();
    expect(await deliverDue(handle.db, waiting.send, T0)).toBe(0);
    await setWebhookDisabled(handle.db, webhook.id, null, T0);
    expect(await deliverDue(handle.db, waiting.send, T0)).toBe(1);
  });

  it("forgets old deliveries", async () => {
    await hook();
    await emit(handle.db, "post.published", "post.published:1", {}, T0);
    await purgeDeliveries(
      handle.db,
      new Date(T0.getTime() + (WEBHOOK_LIMITS.deliveryDays + 1) * 86_400_000),
    );
    expect(await handle.db.select().from(apiWebhookDeliveries)).toEqual([]);
  });
});
