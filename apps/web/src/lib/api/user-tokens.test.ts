import {
  apiDeviceCodes,
  openDatabase,
  users,
  type DatabaseHandle,
} from "@trilleo/db";
import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  decideLink,
  findWaitingLink,
  forgetWrongCodes,
  formatUserCode,
  generateUserCode,
  mayTryCode,
  normalizeUserCode,
  noteWrongCode,
  pollDeviceLink,
  startDeviceLink,
} from "./device";
import { dispatch } from "./dispatch";
import { ApiError } from "./errors";
import { createApp, createKey } from "./keys";
import { DEVICE_LIMITS, USER_TOKEN_LIMITS } from "./limits";
import { RateLimiter } from "./rate-limit";
import { ROUTES } from "./routes";
import {
  authenticateUser,
  createUserToken,
  listUserTokens,
  looksLikeUserToken,
  revokeUserToken,
  type UserTokenInput,
} from "./user-tokens";

const T0 = new Date("2026-11-21T08:00:00.000Z");
const later = (seconds: number) => new Date(T0.getTime() + seconds * 1000);

let handle: DatabaseHandle;
let userId: string;

beforeEach(async () => {
  handle = await openDatabase("memory://");
  const [user] = await handle.db
    .insert(users)
    .values({ username: "player", email: "player@example.com" })
    .returning({ id: users.id });
  userId = user?.id ?? "";
  forgetWrongCodes();
});
afterEach(async () => {
  await handle.close();
});

async function codeOf(error: Promise<unknown>): Promise<string> {
  try {
    await error;
  } catch (thrown) {
    if (thrown instanceof ApiError) return thrown.code;
    throw thrown;
  }
  return "none";
}

describe("personal tokens", () => {
  const input: UserTokenInput = {
    name: "  My   script ",
    scopes: ["skyblock:sync", "nonsense"],
    expiresAt: null,
    via: "manual",
  };

  it("makes a token shown once and keeps only its hash", async () => {
    const made = await createUserToken(handle.db, userId, input, T0);
    if (!made.ok) throw new Error(made.problem);
    expect(looksLikeUserToken(made.secret)).toBe(true);
    expect(made.token.name).toBe("My script");
    expect(made.token.scopes).toEqual(["skyblock:sync"]);
    expect(made.token.hash).not.toContain(made.secret);
    expect(made.token.prefix).toBe(made.secret.slice(0, 11));
  });

  it("refuses bad names, no scopes, past expiries and too many tokens", async () => {
    const problem = async (over: Partial<UserTokenInput>) => {
      const made = await createUserToken(
        handle.db,
        userId,
        { ...input, ...over },
        T0,
      );
      return made.ok ? "ok" : made.problem;
    };
    expect(await problem({ name: " " })).toBe("name");
    expect(await problem({ name: "x".repeat(61) })).toBe("name");
    expect(await problem({ scopes: ["usage:read"] })).toBe("scopes");
    expect(await problem({ expiresAt: T0 })).toBe("expiry");
    for (let i = 0; i < USER_TOKEN_LIMITS.perUser; i++)
      expect(await problem({})).toBe("ok");
    expect(await problem({})).toBe("limit");
  });

  it("authenticates, and refuses revoked, expired and blocked accounts' tokens", async () => {
    const made = await createUserToken(
      handle.db,
      userId,
      { ...input, expiresAt: later(3600) },
      T0,
    );
    if (!made.ok) throw new Error(made.problem);
    const caller = await authenticateUser(handle.db, made.secret, T0);
    expect(caller.user.username).toBe("player");
    expect(caller.scopes).toEqual(["skyblock:sync"]);
    expect(caller.token.lastUsedAt).toEqual(T0);

    expect(
      await codeOf(authenticateUser(handle.db, made.secret, later(3600))),
    ).toBe("key_expired");
    expect(await codeOf(authenticateUser(handle.db, "trlu_nope", T0))).toBe(
      "invalid_key",
    );

    await handle.db
      .update(users)
      .set({ blockedAt: T0 })
      .where(eq(users.id, userId));
    expect(await codeOf(authenticateUser(handle.db, made.secret, T0))).toBe(
      "account_blocked",
    );
    await handle.db
      .update(users)
      .set({ blockedAt: null })
      .where(eq(users.id, userId));

    expect(await revokeUserToken(handle.db, userId, made.token.id, T0)).toBe(
      "My script",
    );
    expect(
      await revokeUserToken(handle.db, userId, made.token.id, T0),
    ).toBeNull();
    expect(await codeOf(authenticateUser(handle.db, made.secret, T0))).toBe(
      "key_revoked",
    );
    expect(await listUserTokens(handle.db, userId)).toEqual([]);
  });
});

describe("user codes", () => {
  it("are eight consonants, read back however they're typed", () => {
    for (let i = 0; i < 50; i++) {
      const code = generateUserCode();
      expect(code).toMatch(/^[BCDFGHJKLMNPQRSTVWXZ]{8}$/);
      expect(normalizeUserCode(formatUserCode(code).toLowerCase())).toBe(code);
    }
    expect(normalizeUserCode("bcdf ghjk")).toBe("BCDFGHJK");
    expect(normalizeUserCode("BCDF-GHJ")).toBeNull();
    expect(normalizeUserCode("ABCD-EFGH")).toBeNull();
  });

  it("stop being looked up after too many wrong ones", () => {
    for (let i = 0; i < DEVICE_LIMITS.wrongCodesPerHour; i++) {
      expect(mayTryCode("u", 0)).toBe(true);
      noteWrongCode("u", 0);
    }
    expect(mayTryCode("u", 1000)).toBe(false);
    expect(mayTryCode("u", 3_600_001)).toBe(true);
  });
});

describe("device links", () => {
  const start = () =>
    startDeviceLink(
      handle.db,
      { clientName: "SkyBlock mod", scopes: ["skyblock:sync"] },
      T0,
    );

  it("waits, slows fast pollers, then hands the token over once", async () => {
    const link = await start();
    expect(
      await codeOf(pollDeviceLink(handle.db, link.deviceCode, later(1))),
    ).toBe("authorization_pending");
    expect(
      await codeOf(pollDeviceLink(handle.db, link.deviceCode, later(2))),
    ).toBe("slow_down");
    const waiting = await findWaitingLink(handle.db, link.userCode, later(3));
    expect(waiting?.clientName).toBe("SkyBlock mod");

    const decided = await decideLink(
      handle.db,
      userId,
      link.userCode,
      true,
      later(4),
    );
    expect(decided.ok).toBe(true);
    expect(
      await findWaitingLink(handle.db, link.userCode, later(4)),
    ).toBeNull();

    const token = await pollDeviceLink(handle.db, link.deviceCode, later(10));
    expect(token.name).toBe("SkyBlock mod");
    expect(token.scopes).toEqual(["skyblock:sync"]);
    const caller = await authenticateUser(handle.db, token.token, later(11));
    expect(caller.user.id).toBe(userId);
    expect(caller.token.via).toBe("device");

    expect(
      await codeOf(pollDeviceLink(handle.db, link.deviceCode, later(20))),
    ).toBe("expired_token");
  });

  it("tells the program when the person declines", async () => {
    const link = await start();
    await decideLink(handle.db, userId, link.userCode, false, later(1));
    expect(
      await codeOf(pollDeviceLink(handle.db, link.deviceCode, later(6))),
    ).toBe("access_denied");
    expect(await handle.db.select().from(apiDeviceCodes)).toEqual([]);
  });

  it("expires links nobody approved", async () => {
    const link = await start();
    const end = later(DEVICE_LIMITS.codeMinutes * 60);
    expect(await findWaitingLink(handle.db, link.userCode, end)).toBeNull();
    expect(
      (await decideLink(handle.db, userId, link.userCode, true, end)).ok,
    ).toBe(false);
    expect(await codeOf(pollDeviceLink(handle.db, link.deviceCode, end))).toBe(
      "expired_token",
    );
  });

  it("refuses unknown scopes and names that don't fit", async () => {
    expect(
      await codeOf(
        startDeviceLink(
          handle.db,
          { clientName: "Bot", scopes: ["usage:read"] },
          T0,
        ),
      ),
    ).toBe("invalid_input");
    expect(
      await codeOf(
        startDeviceLink(
          handle.db,
          { clientName: "", scopes: ["skyblock:sync"] },
          T0,
        ),
      ),
    ).toBe("invalid_input");
  });

  it("won't approve when the account has no room for another token", async () => {
    for (let i = 0; i < USER_TOKEN_LIMITS.perUser; i++)
      await createUserToken(
        handle.db,
        userId,
        {
          name: `T${String(i)}`,
          scopes: ["skyblock:sync"],
          expiresAt: null,
          via: "manual",
        },
        T0,
      );
    const link = await start();
    expect(
      await decideLink(handle.db, userId, link.userCode, true, T0),
    ).toEqual({
      ok: false,
      problem: "limit",
    });
  });
});

describe("the API with personal tokens", () => {
  const API = "https://api.trilleo.net";
  let limiter: RateLimiter;

  async function call(path: string, init: RequestInit & { key?: string } = {}) {
    const headers = new Headers(init.headers);
    if (init.key) headers.set("Authorization", `Bearer ${init.key}`);
    if (init.body) headers.set("Content-Type", "application/json");
    const url = new URL(path, API);
    const response = await dispatch(
      new Request(url, { ...init, headers }),
      url,
      {
        getDb: () => Promise.resolve(handle.db),
        limiter,
        routes: ROUTES,
        clientIp: "203.0.113.9",
        apiOrigin: API,
        siteOrigin: "https://www.trilleo.net",
        now: () => T0,
        purge: false,
      },
    );
    return {
      status: response.status,
      body: (await response.json()) as Record<string, unknown> & {
        error?: { code: string };
      },
    };
  }

  beforeEach(() => {
    limiter = new RateLimiter();
  });

  it("links a device from start to token, then acts for the account", async () => {
    const started = await call("/v1/auth/device", {
      method: "POST",
      body: JSON.stringify({
        clientName: "SkyBlock mod",
        scopes: ["skyblock:sync"],
      }),
    });
    expect(started.status).toBe(201);
    expect(started.body.verificationUri).toBe("https://www.trilleo.net/link/");
    expect(started.body.verificationUriComplete).toBe(
      `https://www.trilleo.net/link/?code=${String(started.body.userCode)}`,
    );
    expect(started.body.interval).toBe(DEVICE_LIMITS.intervalSeconds);

    const poll = () =>
      call("/v1/auth/device/token", {
        method: "POST",
        body: JSON.stringify({ deviceCode: started.body.deviceCode }),
      });
    expect((await poll()).body.error?.code).toBe("authorization_pending");

    const userCode = normalizeUserCode(String(started.body.userCode)) ?? "";
    await decideLink(handle.db, userId, userCode, true, T0);
    const finished = await poll();
    expect(finished.status).toBe(200);
    expect(finished.body.tokenType).toBe("Bearer");

    const me = await call("/v1/account", { key: String(finished.body.token) });
    expect(me.status).toBe(200);
    expect(me.body.username).toBe("player");
    expect(me.body.scopes).toEqual(["skyblock:sync"]);
  });

  it("keeps tokens and app keys to their own routes", async () => {
    const made = await createUserToken(
      handle.db,
      userId,
      {
        name: "Script",
        scopes: ["skyblock:sync"],
        expiresAt: null,
        via: "manual",
      },
      T0,
    );
    if (!made.ok) throw new Error(made.problem);
    const app = await createApp(
      handle.db,
      { name: "Bot", description: "", scopes: ["usage:read"], rateLimit: 120 },
      null,
    );
    const key = await createKey(
      handle.db,
      app.id,
      { name: "K", scopes: null, expiresAt: null },
      T0,
    );
    if (!key.ok) throw new Error(key.problem);

    expect((await call("/v1/account")).body.error?.code).toBe("token_required");
    expect(
      (await call("/v1/account", { key: key.secret })).body.error?.code,
    ).toBe("token_required");
    expect((await call("/v1/me", { key: made.secret })).body.error?.code).toBe(
      "missing_key",
    );
    // A token on a public route is checked and gets its own bucket.
    const open = await call("/v1/status", { key: made.secret });
    expect(open.status).toBe(200);
    expect(
      (await call("/v1/status", { key: "trlu_wrong" })).body.error?.code,
    ).toBe("invalid_key");
  });

  it("limits how often one visitor starts device links", async () => {
    const start = () =>
      call("/v1/auth/device", {
        method: "POST",
        body: JSON.stringify({ clientName: "Mod", scopes: ["skyblock:sync"] }),
      });
    for (let i = 0; i < DEVICE_LIMITS.startsPerMinute; i++)
      expect((await start()).status).toBe(201);
    expect((await start()).body.error?.code).toBe("rate_limited");
  });
});
