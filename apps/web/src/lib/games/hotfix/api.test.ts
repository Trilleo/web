import {
  hotfixBests,
  hotfixTickets,
  openDatabase,
  users,
  type DatabaseHandle,
  type User,
} from "@trilleo/db";
import {
  FPS,
  autoplay,
  dailySeed,
  dayOf,
  newRun,
  packInputs,
  replay,
  resultOf,
  type LoggedInput,
  type RunResult,
} from "@trilleo/game-hotfix/core";
import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { upsertGitHubUser } from "../../auth/accounts";
import { deleteAccount } from "../../comments/store";
import { exportUserData } from "../../profile/store";
import { handleHotfix, type HotfixEndpoint } from "./api";
import { findReplay, leaderboard } from "./leaderboard";
import { TICKET_LIMITS, loadPlayer, type PlayerView } from "./store";

const ORIGIN = "https://www.trilleo.net";
const T0 = Date.UTC(2026, 9, 22, 12);

let handle: DatabaseHandle;
let alice: User;
let bob: User;
let clock = T0;
let nextSeed = 42;

beforeEach(async () => {
  handle = await openDatabase("memory://");
  alice = await upsertGitHubUser(handle.db, {
    id: 1,
    login: "alice",
    name: null,
  });
  bob = await upsertGitHubUser(handle.db, { id: 2, login: "bob", name: null });
  clock = T0;
  nextSeed = 42;
});
afterEach(async () => {
  await handle.close();
});

/** Every endpoint's answer in one shape: each test reads the fields it expects. */
interface ReplyBody {
  error?: string;
  // A ticket (runs).
  id: string;
  seed: number;
  // A counted run (finish).
  result: RunResult;
  newBest: boolean;
  unlocked: string[];
  player: PlayerView;
}

interface Reply {
  status: number;
  body: ReplyBody;
}

async function call(
  endpoint: HotfixEndpoint,
  body: unknown,
  options: { user?: User | null; origin?: string } = {},
): Promise<Reply> {
  const url = new URL(`/api/games/hotfix/${endpoint}`, ORIGIN);
  const response = await handleHotfix({
    request: new Request(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: options.origin ?? ORIGIN,
      },
      body: JSON.stringify(body),
    }),
    url,
    user: options.user === undefined ? alice : options.user,
    endpoint,
    getDb: () => Promise.resolve(handle.db),
    now: () => clock,
    seed: () => nextSeed,
  });
  expect(response.headers.get("cache-control")).toBe("no-store");
  return {
    status: response.status,
    body: (await response.json()) as ReplyBody,
  };
}

/** A real run on `seed`: the autopilot for a while, then hands off the keys. */
function playOn(seed: number, seconds: number) {
  const { log } = autoplay(newRun(seed), seconds * FPS);
  const ended = replay(seed, log, 10 * 60 * FPS);
  expect(ended.alive).toBe(false);
  return { log, run: ended };
}

/** Takes a ticket, plays it for `seconds` (in real time), and hands it in. */
async function playAndFinish(
  seconds: number,
  options: {
    user?: User;
    mode?: "endless" | "daily";
    log?: LoggedInput[];
  } = {},
) {
  const ticket = await call(
    "runs",
    { mode: options.mode ?? "endless" },
    { user: options.user ?? alice },
  );
  expect(ticket.status).toBe(201);
  const played = playOn(ticket.body.seed, seconds);
  clock += Math.ceil((played.run.frame / FPS) * 1000);
  const finished = await call(
    "finish",
    { ticket: ticket.body.id, inputs: packInputs(options.log ?? played.log) },
    { user: options.user ?? alice },
  );
  return { ticket: ticket.body, played, finished };
}

describe("tickets", () => {
  it("need a signed-in player, from this site", async () => {
    expect(
      (await call("runs", { mode: "endless" }, { user: null })).status,
    ).toBe(401);
    expect(
      (
        await call(
          "runs",
          { mode: "endless" },
          { origin: "https://evil.example" },
        )
      ).status,
    ).toBe(403);
    expect((await call("runs", { mode: "sideways" })).status).toBe(400);
  });

  it("give endless runs a fresh seed and the Daily Run the day's", async () => {
    const endless = await call("runs", { mode: "endless" });
    expect(endless.body).toMatchObject({
      mode: "endless",
      day: null,
      seed: 42,
    });
    const daily = await call("runs", { mode: "daily" });
    expect(daily.body).toMatchObject({
      mode: "daily",
      day: "2026-10-22",
      seed: dailySeed("2026-10-22"),
    });
  });

  it("are capped per player, oldest dropped", async () => {
    for (let n = 0; n < TICKET_LIMITS.outstanding + 3; n++) {
      await call("runs", { mode: "endless" });
    }
    const held = await handle.db
      .select()
      .from(hotfixTickets)
      .where(eq(hotfixTickets.userId, alice.id));
    expect(held).toHaveLength(TICKET_LIMITS.outstanding);
  });
});

describe("finishing a run", () => {
  it("replays it, counts it, and says what it earned", async () => {
    const { played, finished } = await playAndFinish(5);
    expect(finished.status).toBe(200);
    expect(finished.body.result).toEqual(resultOf(played.run));
    expect(finished.body.newBest).toBe(true);
    expect(finished.body.unlocked).toEqual(["hello-world"]);
    expect(finished.body.player).toMatchObject({
      runs: 1,
      achievements: ["hello-world"],
      endless: { score: resultOf(played.run).score, rank: 1 },
    });
  });

  it("counts each ticket once", async () => {
    const { ticket, played } = await playAndFinish(3);
    const again = await call("finish", {
      ticket: ticket.id,
      inputs: packInputs(played.log),
    });
    expect(again.status).toBe(404);
  });

  it("refuses a run longer than the time since its ticket", async () => {
    const ticket = await call("runs", { mode: "endless" });
    const played = playOn(ticket.body.seed, 20);
    clock += 2000;
    const finished = await call("finish", {
      ticket: ticket.body.id,
      inputs: packInputs(played.log),
    });
    expect(finished.status).toBe(422);
  });

  it("refuses a log that isn't one", async () => {
    const ticket = await call("runs", { mode: "endless" });
    expect(
      (await call("finish", { ticket: ticket.body.id, inputs: [{ f: 1 }] }))
        .status,
    ).toBe(400);
    expect((await call("finish", { ticket: "nope", inputs: [] })).status).toBe(
      400,
    );
  });

  it("keeps the best run per board, and only a better one replaces it", async () => {
    const long = await playAndFinish(20);
    const short = await playAndFinish(2);
    expect(short.finished.body.newBest).toBe(false);
    const player = await loadPlayer(handle.db, alice.id, clock);
    expect(player.endless?.score).toBe(long.finished.body.result.score);
    expect(player.runs).toBe(2);
    expect(player.daily).toBeNull();

    const daily = await playAndFinish(4, { mode: "daily" });
    expect(daily.finished.body.player.daily).toMatchObject({ rank: 1 });
  });
});

describe("leaderboards and replays", () => {
  it("rank players, keep private ones nameless and leave blocked ones out", async () => {
    await playAndFinish(15, { user: alice });
    await playAndFinish(3, { user: bob });
    let rows = await leaderboard(handle.db, "endless", clock);
    expect(rows.map((row) => row.login)).toEqual(["alice", "bob"]);

    await handle.db
      .update(users)
      .set({ profilePublic: false })
      .where(eq(users.id, alice.id));
    rows = await leaderboard(handle.db, "endless", clock);
    expect(rows[0]).toMatchObject({ rank: 1, name: null, login: null });

    await handle.db
      .update(users)
      .set({ blockedAt: new Date(clock) })
      .where(eq(users.id, alice.id));
    rows = await leaderboard(handle.db, "endless", clock);
    expect(rows.map((row) => row.login)).toEqual(["bob"]);
  });

  it("the Daily Run's boards are per day", async () => {
    await playAndFinish(3, { mode: "daily" });
    expect(await leaderboard(handle.db, "daily", clock)).toHaveLength(1);
    clock += 86_400_000;
    expect(await leaderboard(handle.db, "daily", clock)).toHaveLength(0);
    expect(await leaderboard(handle.db, "yesterday", clock)).toHaveLength(1);
    expect(dayOf(clock)).toBe("2026-10-23");
  });

  it("a best run can be watched again, exactly", async () => {
    const { played } = await playAndFinish(10);
    const [row] = await leaderboard(handle.db, "endless", clock);
    const watched = await findReplay(handle.db, row?.id ?? "");
    expect(watched).toMatchObject({ login: "alice", board: "endless" });
    const again = replay(
      watched?.seed ?? 0,
      watched?.inputs ?? [],
      watched?.frames ?? 0,
    );
    expect(resultOf(again)).toEqual(resultOf(played.run));
    expect(await findReplay(handle.db, "not-an-id")).toBeNull();
  });
});

describe("accessories", () => {
  it("can be worn once their achievement is earned", async () => {
    expect((await call("look", { accessory: "crown" })).status).toBe(403);
    await playAndFinish(2);
    expect((await call("look", { accessory: "crown" })).status).toBe(403);
    expect((await call("look", { accessory: "cap" })).status).toBe(200);
    expect((await loadPlayer(handle.db, alice.id)).accessory).toBe("cap");
    expect((await call("look", { accessory: null })).status).toBe(200);
    expect((await call("look", { accessory: "tiara" })).status).toBe(400);
  });
});

describe("accounts", () => {
  it("export everything, and deleting the account deletes it", async () => {
    await playAndFinish(3);
    const data = await exportUserData(handle.db, alice.id);
    expect(data?.games.hotfix).toMatchObject({
      runs: 1,
      achievements: ["hello-world"],
      bests: [{ board: "endless" }],
    });
    await deleteAccount(handle.db, alice.id);
    expect(
      await handle.db
        .select()
        .from(hotfixBests)
        .where(eq(hotfixBests.userId, alice.id)),
    ).toEqual([]);
  });
});
