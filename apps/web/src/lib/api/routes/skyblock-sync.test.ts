import { openDatabase, users, type DatabaseHandle } from "@trilleo/db";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { dispatch } from "../dispatch";
import { RateLimiter } from "../rate-limit";
import { createUserToken } from "../user-tokens";
import { ROUTES } from ".";

const T0 = new Date("2026-11-21T08:00:00.000Z");
const API = "https://api.trilleo.net";
const PROFILE = "1f2e3d4c-5b6a-7980-1a2b-3c4d5e6f7a8b";

let handle: DatabaseHandle;
let token: string;

beforeEach(async () => {
  handle = await openDatabase("memory://");
  const [user] = await handle.db
    .insert(users)
    .values({ username: "player", email: "player@example.com" })
    .returning({ id: users.id });
  const made = await createUserToken(
    handle.db,
    user?.id ?? "",
    {
      name: "SkyBlock mod",
      scopes: ["skyblock:sync"],
      expiresAt: null,
      via: "device",
    },
    T0,
  );
  if (!made.ok) throw new Error(made.problem);
  token = made.secret;
});
afterEach(async () => {
  await handle.close();
});

async function call(path: string, init: RequestInit & { key?: string } = {}) {
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${init.key ?? token}`);
  if (init.body) headers.set("Content-Type", "application/json");
  const url = new URL(path, API);
  const response = await dispatch(new Request(url, { ...init, headers }), url, {
    getDb: () => Promise.resolve(handle.db),
    limiter: new RateLimiter(),
    routes: ROUTES,
    clientIp: "203.0.113.9",
    apiOrigin: API,
    siteOrigin: "https://www.trilleo.net",
    now: () => T0,
    purge: false,
  });
  return {
    status: response.status,
    body: (await response.json()) as Record<string, unknown> & {
      error?: { code: string };
    },
  };
}

describe("the SkyBlock sync routes", () => {
  it("sync a profile from the game, then read it back", async () => {
    const synced = await call(`/v1/skyblock/me/profiles/${PROFILE}/sync`, {
      method: "POST",
      body: JSON.stringify({
        name: "Apple",
        gameMode: "classic",
        levels: [
          { id: "SHARD_GROVE", level: 10 },
          { id: "SHARD_NOT_REAL", level: 1 },
        ],
        held: [{ id: "SHARD_TIAMAT", count: 3 }],
        syncKey: "first",
      }),
    });
    expect(synced.status).toBe(200);
    expect(synced.body).toMatchObject({
      duplicate: false,
      created: true,
      profile: {
        name: "Apple",
        hypixelProfileId: "1f2e3d4c5b6a79801a2b3c4d5e6f7a8b",
        active: true,
      },
      unknownIds: ["SHARD_NOT_REAL"],
      progress: { maxed: 1 },
    });

    const collection = await call(
      `/v1/skyblock/me/profiles/${PROFILE.replace(/-/g, "")}/collection`,
    );
    expect(collection.body).toMatchObject({
      levels: [{ id: "SHARD_GROVE", level: 10 }],
      held: [{ id: "SHARD_TIAMAT", count: 3 }],
    });

    const profiles = await call("/v1/skyblock/me/profiles");
    expect((profiles.body.items as unknown[]).length).toBe(1);

    const syncs = await call(`/v1/skyblock/me/profiles/${PROFILE}/syncs`);
    expect(syncs.body.items).toMatchObject([
      { source: "SkyBlock mod", levels: [{ id: "SHARD_GROVE", to: 10 }] },
    ]);
  });

  it("check their inputs and need a token", async () => {
    const bad = await call("/v1/skyblock/me/profiles/not-a-uuid/sync", {
      method: "POST",
      body: JSON.stringify({}),
    });
    expect(bad.body.error?.code).toBe("invalid_input");
    const level = await call(`/v1/skyblock/me/profiles/${PROFILE}/sync`, {
      method: "POST",
      body: JSON.stringify({ levels: [{ id: "SHARD_GROVE", level: 11 }] }),
    });
    expect(level.body.error?.code).toBe("invalid_input");
    const missing = await call(
      `/v1/skyblock/me/profiles/${PROFILE}/collection`,
    );
    expect(missing.body.error?.code).toBe("not_found");
    const anonymous = await call("/v1/skyblock/me/profiles", { key: "trlu_x" });
    expect(anonymous.body.error?.code).toBe("invalid_key");
  });
});
