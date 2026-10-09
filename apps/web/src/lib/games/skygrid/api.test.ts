import { openDatabase, type DatabaseHandle, type User } from "@trilleo/db";
import {
  IMPORT_LIMITS,
  ISLAND_MAPS,
  newGame,
  type Action,
  type GameState,
} from "@trilleo/game-skygrid/core";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { upsertGitHubUser } from "../../auth/accounts";
import { deleteAccount } from "../../comments/store";
import { MAX_BODY_BYTES, handleSkygrid, type SkygridEndpoint } from "./api";
import { CLOCK_SLACK_MS, loadSkygridSave } from "./store";

const ORIGIN = "https://www.trilleo.net";
const T0 = 1_800_000_000_000;

let handle: DatabaseHandle;
let alice: User;
let clock = T0;

beforeEach(async () => {
  handle = await openDatabase("memory://");
  alice = await upsertGitHubUser(handle.db, {
    id: 1,
    login: "alice",
    name: null,
  });
  clock = T0;
});
afterEach(async () => {
  await handle.close();
});

interface Reply {
  status: number;
  body: {
    error?: string;
    state?: GameState;
    version?: number;
    serverTime?: number;
  };
}

async function call(
  endpoint: SkygridEndpoint,
  body: unknown,
  options: {
    user?: User | null;
    origin?: string | null;
    method?: string;
    type?: string;
    raw?: string;
  } = {},
): Promise<Reply> {
  const headers = new Headers({
    "Content-Type": options.type ?? "application/json",
  });
  const origin = options.origin === undefined ? ORIGIN : options.origin;
  if (origin) headers.set("Origin", origin);
  const url = new URL(`/api/games/skygrid/${endpoint}`, ORIGIN);
  const method = options.method ?? "POST";
  const response = await handleSkygrid({
    request: new Request(url, {
      method,
      headers,
      ...(method === "POST" && { body: options.raw ?? JSON.stringify(body) }),
    }),
    url,
    user: options.user === undefined ? alice : options.user,
    endpoint,
    getDb: () => Promise.resolve(handle.db),
    now: () => clock,
    seed: () => 42,
  });
  expect(response.headers.get("cache-control")).toBe("no-store");
  return {
    status: response.status,
    body: (await response.json()) as Reply["body"],
  };
}

async function start(): Promise<GameState> {
  const reply = await call("import", { state: null });
  expect(reply.status).toBe(201);
  if (!reply.body.state) throw new Error("no state");
  return reply.body.state;
}

/** Steps from the spawn: right is open ground on a new island. */
function steps(from: number, count: number): Action[] {
  return Array.from({ length: count }, (_, i) => ({
    t: from + (i + 1) * 150,
    k: "move" as const,
    d: "R" as const,
  }));
}

describe("guards", () => {
  it("only takes POSTs of JSON from this site, by someone signed in", async () => {
    expect((await call("sync", null, { method: "GET" })).status).toBe(405);
    expect((await call("sync", {}, { user: null })).status).toBe(401);
    expect(
      (await call("sync", {}, { origin: "https://evil.example" })).status,
    ).toBe(403);
    expect((await call("sync", {}, { origin: null })).status).toBe(403);
    expect((await call("sync", {}, { type: "text/plain" })).status).toBe(415);
    expect((await call("sync", {}, { raw: "{nope" })).status).toBe(400);
    expect(
      (await call("sync", {}, { raw: "x".repeat(MAX_BODY_BYTES + 1) })).status,
    ).toBe(413);
    expect((await call("sync", { version: 1 })).status).toBe(400);
    expect(
      (await call("sync", { version: 1, actions: [{ k: "fly" }] })).status,
    ).toBe(400);
  });
});

describe("import", () => {
  it("starts a new island, once", async () => {
    const state = await start();
    expect(state).toEqual(newGame(42, T0));
    const again = await call("import", { state: null });
    expect(again.status).toBe(409);
    expect(again.body).toMatchObject({ version: 1, state });
  });

  it("brings a browser save in, capped", async () => {
    const guest = {
      ...newGame(7, T0 - 86_400_000),
      coins: 10_000_000,
      inventory: { wheat: 3 },
    };
    const reply = await call("import", { state: guest });
    expect(reply.status).toBe(201);
    expect(reply.body.state).toMatchObject({
      coins: IMPORT_LIMITS.coins,
      inventory: { wheat: 3 },
      seed: 42,
      now: T0,
    });
    expect((await loadSkygridSave(handle.db, alice.id))?.state.coins).toBe(
      IMPORT_LIMITS.coins,
    );
  });

  it("refuses what isn't a save", async () => {
    const reply = await call("import", { state: { coins: 5 } });
    expect(reply.status).toBe(422);
    expect(await loadSkygridSave(handle.db, alice.id)).toBeNull();
  });
});

describe("sync", () => {
  it("needs an island first", async () => {
    const reply = await call("sync", { version: 1, actions: steps(T0, 1) });
    expect(reply.status).toBe(404);
  });

  it("replays actions and keeps the result", async () => {
    const state = await start();
    clock = T0 + 2000;
    const reply = await call("sync", { version: 1, actions: steps(T0, 3) });
    expect(reply).toEqual({
      status: 200,
      body: { version: 2, serverTime: clock },
    });
    const saved = await loadSkygridSave(handle.db, alice.id);
    expect(saved?.version).toBe(2);
    expect(saved?.state.pos).toEqual({ ...state.pos, x: state.pos.x + 3 });
  });

  it("sends the current island to a tab that fell behind", async () => {
    await start();
    clock = T0 + 2000;
    await call("sync", { version: 1, actions: steps(T0, 1) });
    const stale = await call("sync", {
      version: 1,
      actions: steps(T0 + 500, 1),
    });
    expect(stale.status).toBe(409);
    expect(stale.body.version).toBe(2);
  });

  it("keeps what came before a broken rule, and says what broke", async () => {
    const state = await start();
    clock = T0 + 5000;
    const actions = [
      ...steps(T0, 2),
      // Too fast after the last step.
      { t: T0 + 2 * 150 + 10, k: "move", d: "R" },
      ...steps(T0 + 1000, 2),
    ];
    const reply = await call("sync", { version: 1, actions });
    expect(reply.status).toBe(422);
    expect(reply.body).toMatchObject({ error: "Slow down.", version: 2 });
    expect(reply.body.state?.pos.x).toBe(state.pos.x + 2);
  });

  it("refuses to be told the future", async () => {
    await start();
    const reply = await call("sync", {
      version: 1,
      actions: [{ t: clock + CLOCK_SLACK_MS + 1, k: "move", d: "R" }],
    });
    expect(reply.status).toBe(422);
    expect(reply.body.error).toMatch(/clock/);
    expect(reply.body.version).toBe(1);
  });

  it("can't be talked into gathering what isn't there", async () => {
    await start();
    const sky = { t: T0 + 100, k: "gather", x: 0, y: 0 };
    const reply = await call("sync", { version: 1, actions: [sky] });
    expect(reply.status).toBe(422);
    expect(reply.body.state?.inventory).toEqual({});
  });
});

describe("combat", () => {
  it("replays a fight: the zombie falls, and the drops and XP are kept", async () => {
    // A zombie in the Hub, and the tile below it (open ground).
    const map = ISLAND_MAPS.hub;
    const y = map.tiles.findIndex((row) => row.includes("z"));
    const x = map.tiles[y]?.indexOf("z") ?? -1;
    const guest = {
      ...newGame(7, T0 - 1000),
      pos: { island: "hub" as const, x, y: y + 1 },
      equipment: { weapon: "iron_sword" },
    };
    expect((await call("import", { state: guest })).status).toBe(201);
    clock = T0 + 60_000;
    const swings = Array.from({ length: 6 }, (_, i) => ({
      t: T0 + 1000 + i * 500,
      k: "attack",
      x,
      y,
    }));
    const reply = await call("sync", { version: 1, actions: swings });
    // The zombie is gone before the last swings: they're refused, the rest kept.
    expect(reply.status).toBe(422);
    const saved = await loadSkygridSave(handle.db, alice.id);
    expect(saved?.state.skills.combat).toBe(8);
    expect(saved?.state.inventory.rotten_flesh).toBeGreaterThanOrEqual(1);
    expect(saved?.state.equipment.weapon).toBe("iron_sword");
  });
});

describe("accounts", () => {
  it("take their island with them when deleted", async () => {
    await start();
    await deleteAccount(handle.db, alice.id);
    expect(await loadSkygridSave(handle.db, alice.id)).toBeNull();
  });
});
