import { openDatabase, type DatabaseHandle, type User } from "@trilleo/db";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { upsertGitHubUser } from "../auth/accounts";
import { handleStudy } from "./api";
import { studyExport } from "./records";

const ORIGIN = "https://www.trilleo.net";
const NOW = new Date("2026-11-10T04:00:00Z");

let handle: DatabaseHandle;
let alice: User;
let bob: User;

beforeEach(async () => {
  handle = await openDatabase("memory://");
  alice = await upsertGitHubUser(handle.db, {
    id: 1,
    login: "alice",
    name: null,
  });
  bob = await upsertGitHubUser(handle.db, { id: 2, login: "bob", name: null });
});
afterEach(async () => {
  await handle.close();
});

function call(
  method: string,
  path: string,
  options: { user?: User | null; body?: unknown; origin?: string | null } = {},
) {
  const url = new URL(`/api/study${path ? `/${path}` : ""}`, ORIGIN);
  const headers = new Headers();
  const origin = options.origin === undefined ? ORIGIN : options.origin;
  if (origin) headers.set("Origin", origin);
  if (options.body !== undefined)
    headers.set("Content-Type", "application/json");
  return handleStudy({
    request: new Request(url, {
      method,
      headers,
      body: options.body === undefined ? null : JSON.stringify(options.body),
    }),
    url,
    user: options.user === undefined ? alice : options.user,
    path,
    getDb: () => Promise.resolve(handle.db),
    now: NOW,
  });
}

let serial = 0;
function event(kind = "review", data: object = { grade: 3 }) {
  serial += 1;
  return {
    id: `00000000-0000-4000-8000-${String(serial).padStart(12, "0")}`,
    kind,
    subject: "circuits",
    item: "c:ohm:abc",
    at: "2026-11-09T10:00:00.000Z",
    data,
  };
}

async function body(response: Response): Promise<Record<string, unknown>> {
  return (await response.json()) as Record<string, unknown>;
}

describe("the study API", () => {
  it("tells signed-out pages to keep records in the browser", async () => {
    const response = await call("GET", "", { user: null });
    expect(response.status).toBe(200);
    expect(await body(response)).toEqual({ signedIn: false });
    expect(
      (await call("POST", "events", { user: null, body: { events: [] } }))
        .status,
    ).toBe(401);
  });

  it("saves events once each and gives them back, per person", async () => {
    const one = event();
    const two = event("attempt", { correct: false, response: "2 A" });
    const first = await call("POST", "events", {
      body: { events: [one, two] },
    });
    expect(await body(first)).toEqual({ saved: 2 });
    // Sent again (a retry): nothing new.
    expect(
      await body(await call("POST", "events", { body: { events: [one] } })),
    ).toEqual({ saved: 0 });

    const mine = await body(await call("GET", ""));
    expect(mine.signedIn).toBe(true);
    expect(mine.settings).toBeNull();
    expect((mine.events as { id: string }[]).map((entry) => entry.id)).toEqual([
      one.id,
      two.id,
    ]);
    // The same IDs from someone else are theirs.
    expect(
      await body(
        await call("POST", "events", { user: bob, body: { events: [one] } }),
      ),
    ).toEqual({ saved: 1 });
    expect(
      (await body(await call("GET", "", { user: bob }))).events,
    ).toHaveLength(1);
  });

  it("refuses invalid events, too many at once, and other sites", async () => {
    expect(
      (
        await call("POST", "events", {
          body: { events: [event("review", { grade: 9 })] },
        })
      ).status,
    ).toBe(422);
    expect(
      (
        await call("POST", "events", {
          body: { events: [{ ...event(), at: "2030-01-01T00:00:00Z" }] },
        })
      ).status,
    ).toBe(422);
    expect(
      (
        await call("POST", "events", {
          body: { events: Array.from({ length: 501 }, () => event()) },
        })
      ).status,
    ).toBe(413);
    expect((await call("POST", "events", { body: { nope: 1 } })).status).toBe(
      400,
    );
    expect(
      (
        await call("POST", "events", {
          body: { events: [event()] },
          origin: "https://evil.example",
        })
      ).status,
    ).toBe(403);
    expect((await call("GET", "events")).status).toBe(405);
    expect((await call("GET", "elsewhere")).status).toBe(404);
  });

  it("keeps settings, checked", async () => {
    expect(
      (
        await call("PUT", "settings", {
          body: { settings: { newPerDay: 500, retention: 0.9 } },
        })
      ).status,
    ).toBe(422);
    const saved = await call("PUT", "settings", {
      body: { settings: { newPerDay: 5, retention: 0.85 } },
    });
    expect(await body(saved)).toEqual({
      settings: { newPerDay: 5, retention: 0.85 },
    });
    expect((await body(await call("GET", ""))).settings).toEqual({
      newPerDay: 5,
      retention: 0.85,
    });
  });

  it("puts everything in the account export", async () => {
    await call("POST", "events", { body: { events: [event()] } });
    const exported = await studyExport(handle.db, alice.id);
    expect(exported.settings).toEqual({ newPerDay: 20, retention: 0.9 });
    expect(exported.events).toHaveLength(1);
  });
});
