import { adminAlerts, openDatabase, type DatabaseHandle } from "@trilleo/db";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { dispatch } from "../api/dispatch";
import { createApp, createKey } from "../api/keys";
import { RateLimiter } from "../api/rate-limit";
import { ROUTES } from "../api/routes";
import {
  CRYPTIC_LIMITS,
  checkPuzzleInput,
  createPuzzle,
  crypticOverview,
  daysCovered,
  deletePuzzle,
  updatePuzzle,
  type PuzzleInput,
} from "./puzzles";
import { checkCrypticQueue, queueWarning } from "./queue";

const API = "https://api.trilleo.net";
const DAY_MS = 24 * 3600 * 1000;

interface Body {
  error: { code: string; message: string; details?: unknown };
  items: Record<string, unknown>[];
  nextCursor: string | null;
  [field: string]: unknown;
}

let handle: DatabaseHandle;
let limiter: RateLimiter;
let clock: Date;

beforeEach(async () => {
  handle = await openDatabase("memory://");
  limiter = new RateLimiter();
  clock = new Date("2026-10-23T08:00:00.000Z");
});
afterEach(async () => {
  await handle.close();
});

const input = (over: Partial<PuzzleInput> = {}): PuzzleInput => ({
  clue: "Silent arrangement to hear",
  enumeration: "",
  answer: "listen",
  explanation: "An anagram of SILENT.",
  setter: "",
  day: "",
  ...over,
});

async function schedule(day: string, over: Partial<PuzzleInput> = {}) {
  const checked = checkPuzzleInput(input({ day, ...over }), "2000-01-01");
  if (!checked.ok) throw new Error(checked.problem);
  const made = await createPuzzle(handle.db, checked.value);
  if (!made.ok) throw new Error(made.problem);
  return made.puzzle;
}

async function newKey(scopes = ["cryptic:read", "cryptic:play"]) {
  const app = await createApp(
    handle.db,
    { name: "Bot", description: "", scopes, rateLimit: 1000 },
    null,
  );
  const made = await createKey(handle.db, app.id, {
    name: "k",
    scopes: null,
    expiresAt: null,
  });
  if (!made.ok) throw new Error(made.problem);
  return made.secret;
}

async function call(
  key: string,
  path: string,
  body?: unknown,
  method = body === undefined ? "GET" : "POST",
): Promise<{ status: number; body: Body }> {
  const url = new URL(path, API);
  const response = await dispatch(
    new Request(url, {
      method,
      headers: {
        Authorization: `Bearer ${key}`,
        ...(body === undefined ? {} : { "Content-Type": "application/json" }),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    }),
    url,
    {
      getDb: () => Promise.resolve(handle.db),
      limiter,
      routes: ROUTES,
      clientIp: null,
      apiOrigin: API,
      siteOrigin: "https://www.trilleo.net",
      now: () => clock,
      purge: false,
    },
  );
  return { status: response.status, body: (await response.json()) as Body };
}

const guess = (
  key: string,
  date: string,
  id: string,
  text: string,
  name = id,
) =>
  call(key, `/v1/cryptic/days/${date}/guesses`, {
    player: { id, name },
    guess: text,
  });

describe("puzzles", () => {
  it("check the form: enumeration from the answer, or one that fits", () => {
    expect(
      checkPuzzleInput(input({ answer: " ice  cream " }), "2026-10-23"),
    ).toMatchObject({
      ok: true,
      value: {
        answer: "ICE CREAM",
        enumeration: "3,5",
        day: null,
        setter: null,
      },
    });
    expect(
      checkPuzzleInput(input({ enumeration: "(5)" }), "2026-10-23"),
    ).toEqual({
      ok: false,
      problem: "fit",
    });
    expect(
      checkPuzzleInput(input({ enumeration: "six" }), "2026-10-23"),
    ).toEqual({
      ok: false,
      problem: "enumeration",
    });
    expect(
      checkPuzzleInput(input({ day: "2026-10-22" }), "2026-10-23"),
    ).toEqual({
      ok: false,
      problem: "past",
    });
    expect(
      checkPuzzleInput(input({ day: "2026-02-30" }), "2026-10-23"),
    ).toEqual({
      ok: false,
      problem: "day",
    });
    expect(
      checkPuzzleInput(
        input({ clue: "x".repeat(CRYPTIC_LIMITS.clue + 1) }),
        "2026-10-23",
      ),
    ).toEqual({ ok: false, problem: "clue" });
  });

  it("take one per day, and lock once their day has come", async () => {
    const live = await schedule("2026-10-23");
    const later = await schedule("2026-10-25");
    const checked = checkPuzzleInput(
      input({ day: "2026-10-25" }),
      "2026-10-23",
    );
    if (!checked.ok) throw new Error(checked.problem);
    expect(await createPuzzle(handle.db, checked.value)).toEqual({
      ok: false,
      problem: "taken",
    });

    // Live: the clue can be fixed, the answer can't change.
    const fix = checkPuzzleInput(
      input({ day: "2026-10-23", clue: "Fixed clue" }),
      "2026-10-23",
    );
    if (!fix.ok) throw new Error(fix.problem);
    expect(await updatePuzzle(handle.db, live, fix.value, clock)).toEqual({
      ok: true,
    });
    const swap = checkPuzzleInput(
      input({ day: "2026-10-23", answer: "tinsel" }),
      "2026-10-23",
    );
    if (!swap.ok) throw new Error(swap.problem);
    expect(await updatePuzzle(handle.db, live, swap.value, clock)).toEqual({
      ok: false,
      problem: "live",
    });
    expect(await deletePuzzle(handle.db, live, clock)).toBe(false);
    expect(await deletePuzzle(handle.db, later, clock)).toBe(true);
  });

  it("warn when the days ahead run out", async () => {
    expect(await daysCovered(handle.db, "2026-10-23")).toBe(0);
    await schedule("2026-10-23");
    await schedule("2026-10-24");
    await schedule("2026-10-26");
    expect(await daysCovered(handle.db, "2026-10-23")).toBe(2);
    const overview = await crypticOverview(handle.db, "2026-10-23");
    expect(overview.today?.puzzle.day).toBe("2026-10-23");
    expect(overview.upcoming.map((p) => p.day)).toEqual([
      "2026-10-24",
      "2026-10-26",
    ]);
  });
});

describe("the queue", () => {
  it("alerts the admin once a day while it's short, and only while it's in use", async () => {
    expect(queueWarning(0)).toBe("There's no daily cryptic for today.");
    expect(queueWarning(CRYPTIC_LIMITS.queueWarnDays)).toBeNull();
    // Never used: no alert.
    expect(await checkCrypticQueue(handle.db, clock)).toBe(false);
    await schedule("2026-10-23");
    expect(await checkCrypticQueue(handle.db, clock)).toBe(true);
    expect(
      await checkCrypticQueue(handle.db, new Date(clock.getTime() + 3600_000)),
    ).toBe(false);
    const alerts = await handle.db.select().from(adminAlerts);
    expect(alerts).toMatchObject([
      {
        kind: "cryptic-queue",
        summary: "Daily cryptics are set for only 1 day from today.",
        path: "/admin/cryptic/",
      },
    ]);
    await schedule("2026-10-24");
    await schedule("2026-10-25");
    expect(
      await checkCrypticQueue(handle.db, new Date(clock.getTime() + DAY_MS)),
    ).toBe(true);
    clock = new Date("2026-10-23T23:00:00.000Z");
    await schedule("2026-10-26");
    expect(await checkCrypticQueue(handle.db, clock)).toBe(false);
  });
});

describe("the cryptic API", () => {
  it("needs the scopes", async () => {
    const key = await newKey([]);
    expect((await call(key, "/v1/cryptic/today")).body.error.code).toBe(
      "insufficient_scope",
    );
  });

  it("shows today's clue without its answer, and past ones with it", async () => {
    await schedule("2026-10-21", { setter: "Trilleo" });
    await schedule("2026-10-23", {
      clue: "Cold dessert",
      answer: "ice cream",
      explanation: "",
    });
    await schedule("2026-10-24");
    const key = await newKey();

    const today = await call(key, "/v1/cryptic/today");
    expect(today.status).toBe(200);
    expect(today.body).toEqual({
      number: 2,
      date: "2026-10-23",
      clue: "Cold dessert",
      enumeration: "(3,5)",
      letters: 8,
      setter: null,
      opensAt: "2026-10-23T00:00:00.000Z",
      closesAt: "2026-10-24T00:00:00.000Z",
      revealed: false,
      answer: null,
      explanation: null,
    });

    const past = await call(key, "/v1/cryptic/days/2026-10-21");
    expect(past.body).toMatchObject({
      number: 1,
      revealed: true,
      answer: "LISTEN",
      explanation: "An anagram of SILENT.",
      setter: "Trilleo",
    });
    // Tomorrow's is a secret; a day without one says so.
    expect(
      (await call(key, "/v1/cryptic/days/2026-10-24")).body.error.code,
    ).toBe("no_puzzle");
    expect((await call(key, "/v1/cryptic/days/2026-10-22")).status).toBe(404);
    expect(
      (await call(key, "/v1/cryptic/days/2026-13-01")).body.error.code,
    ).toBe("invalid_input");

    clock = new Date(clock.getTime() + 2 * DAY_MS); // 2026-10-25: nothing set
    expect((await call(key, "/v1/cryptic/today")).body.error).toMatchObject({
      code: "no_puzzle",
      message: "There's no cryptic today.",
    });
  });

  it("pages through the archive, newest first", async () => {
    for (const day of ["2026-10-19", "2026-10-20", "2026-10-21", "2026-10-23"])
      await schedule(day);
    const key = await newKey();
    const first = await call(key, "/v1/cryptic/archive?limit=2");
    expect(first.body.items.map((p) => p.date)).toEqual([
      "2026-10-21",
      "2026-10-20",
    ]);
    expect(first.body.nextCursor).not.toBeNull();
    const second = await call(
      key,
      `/v1/cryptic/archive?limit=2&cursor=${first.body.nextCursor ?? ""}`,
    );
    expect(second.body.items.map((p) => p.date)).toEqual(["2026-10-19"]);
    expect(second.body.nextCursor).toBeNull();
    expect(
      (await call(key, "/v1/cryptic/archive?cursor=nonsense")).status,
    ).toBe(400);
  });

  it("checks guesses, counts tries until solved, and ranks solvers", async () => {
    await schedule("2026-10-23", { answer: "ice cream" });
    const key = await newKey();

    const short = await guess(key, "2026-10-23", "1", "ice");
    expect(short.status).toBe(400);
    expect(short.body.error).toMatchObject({
      code: "guess_wrong_length",
      details: { letters: 8, got: 3 },
    });

    expect(
      (await guess(key, "2026-10-23", "1", "ice crumb", "Ada")).body,
    ).toEqual({
      correct: false,
      scored: true,
      tries: 1,
      solved: false,
      alreadySolved: false,
      rank: null,
    });
    clock = new Date(clock.getTime() + 60_000);
    expect(
      (await guess(key, "2026-10-23", "2", "ICE-CREAM", "Bo")).body,
    ).toMatchObject({
      correct: true,
      tries: 1,
      solved: true,
      rank: 1,
    });
    clock = new Date(clock.getTime() + 60_000);
    expect(
      (await guess(key, "2026-10-23", "1", "icecream", "Ada L.")).body,
    ).toMatchObject({
      correct: true,
      tries: 2,
      solved: true,
      rank: 2,
    });
    // Solved: further guesses change nothing.
    expect(
      (await guess(key, "2026-10-23", "1", "ice crumb")).body,
    ).toMatchObject({
      correct: false,
      scored: false,
      tries: 2,
      solved: true,
      alreadySolved: true,
    });

    const board = await call(key, "/v1/cryptic/days/2026-10-23/leaderboard");
    expect(board.body).toMatchObject({
      date: "2026-10-23",
      number: 1,
      players: 2,
      solvers: 2,
    });
    expect(board.body.items).toEqual([
      {
        rank: 1,
        player: { id: "2", name: "Bo" },
        tries: 1,
        solvedAt: "2026-10-23T08:01:00.000Z",
        seconds: 8 * 3600 + 60,
      },
      {
        rank: 2,
        // The newest name sent wins, even with a guess that changed nothing.
        player: { id: "1", name: "1" },
        tries: 2,
        solvedAt: "2026-10-23T08:02:00.000Z",
        seconds: 8 * 3600 + 120,
      },
    ]);
  });

  it("keeps apps' players apart", async () => {
    await schedule("2026-10-23");
    const one = await newKey();
    const two = await newKey();
    await guess(one, "2026-10-23", "same-id", "listen");
    const board = await call(two, "/v1/cryptic/days/2026-10-23/leaderboard");
    expect(board.body).toMatchObject({ players: 0, solvers: 0, items: [] });
    expect((await call(two, "/v1/cryptic/players/same-id")).status).toBe(404);
  });

  it("treats guesses at past puzzles as practice", async () => {
    await schedule("2026-10-21");
    const key = await newKey();
    expect((await guess(key, "2026-10-21", "1", "silent")).body).toEqual({
      correct: false,
      scored: false,
      tries: null,
      solved: false,
      alreadySolved: false,
      rank: null,
    });
    expect((await guess(key, "2026-10-21", "1", "listen")).body).toMatchObject({
      correct: true,
      solved: true,
    });
    expect((await call(key, "/v1/cryptic/players/1")).status).toBe(404);
  });

  it("works out streaks and the all-time leaderboards", async () => {
    for (const day of ["2026-10-20", "2026-10-21", "2026-10-23", "2026-10-24"])
      await schedule(day);
    const key = await newKey();
    const at = (day: string) => {
      clock = new Date(`${day}T09:00:00.000Z`);
    };
    // Ada solves the 20th, 21st and 23rd (the 22nd had no puzzle); Bo only the 21st, at once.
    at("2026-10-20");
    await guess(key, "2026-10-20", "ada", "tinsel", "Ada");
    await guess(key, "2026-10-20", "ada", "listen", "Ada");
    at("2026-10-21");
    await guess(key, "2026-10-21", "ada", "listen", "Ada");
    await guess(key, "2026-10-21", "bo", "listen", "Bo");
    at("2026-10-23");
    await guess(key, "2026-10-23", "ada", "listen", "Ada");
    at("2026-10-24"); // Ada hasn't played today yet: the streak holds.

    const ada = await call(key, "/v1/cryptic/players/ada");
    expect(ada.body).toEqual({
      player: { id: "ada", name: "Ada" },
      solved: 3,
      played: 3,
      currentStreak: 3,
      bestStreak: 3,
      averageTries: 1.3,
      today: null,
    });
    await guess(key, "2026-10-24", "ada", "tinsel", "Ada");
    expect((await call(key, "/v1/cryptic/players/ada")).body.today).toEqual({
      date: "2026-10-24",
      tries: 1,
      solved: false,
    });

    const streak = await call(key, "/v1/cryptic/leaderboard");
    expect(streak.body.board).toBe("streak");
    expect(
      streak.body.items.map((row) => [
        row.rank,
        (row.player as { id: string }).id,
        row.currentStreak,
      ]),
    ).toEqual([
      [1, "ada", 3],
      [2, "bo", 0],
    ]);
    const solved = await call(
      key,
      "/v1/cryptic/leaderboard?board=solved&limit=1",
    );
    expect(solved.body.items).toHaveLength(1);
    expect(
      (await call(key, "/v1/cryptic/leaderboard?board=fastest")).status,
    ).toBe(400);
  });

  it("limits each player's guesses", async () => {
    await schedule("2026-10-23");
    const key = await newKey();
    for (let i = 0; i < CRYPTIC_LIMITS.guessesPerMinute; i++)
      expect((await guess(key, "2026-10-23", "fast", "tinsel")).status).toBe(
        200,
      );
    const over = await guess(key, "2026-10-23", "fast", "tinsel");
    expect(over.status).toBe(429);
    // Others aren't held up.
    expect((await guess(key, "2026-10-23", "slow", "tinsel")).status).toBe(200);
  });

  it("forgets a player who asks", async () => {
    await schedule("2026-10-23");
    const key = await newKey();
    await guess(key, "2026-10-23", "gone", "listen");
    expect(
      (await call(key, "/v1/cryptic/players/gone", undefined, "DELETE")).body,
    ).toEqual({
      deleted: true,
    });
    expect((await call(key, "/v1/cryptic/players/gone")).status).toBe(404);
    expect(
      (await call(key, "/v1/cryptic/players/gone", undefined, "DELETE")).status,
    ).toBe(404);
    const board = await call(key, "/v1/cryptic/days/2026-10-23/leaderboard");
    expect(board.body.solvers).toBe(0);
  });
});
