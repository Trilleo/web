import { POW_BITS, PUZZLE_LEVEL, answerKey, solvePow } from "@trilleo/captcha";
import {
  adminAlerts,
  captchaStats,
  openDatabase,
  type DatabaseHandle,
  type User,
} from "@trilleo/db";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { CHECK_LIMITS, Checker } from "./checker";
import {
  isNewcomer,
  requireHuman,
  requireHumanJson,
  setPassCookie,
  type CheckContext,
} from "./gate";
import { CHECK_ROUTES, checkTarget, isCheckRoute } from "./routes";
import {
  CHECK_FLOOD,
  flushChecks,
  readMode,
  recentStats,
  setMode,
} from "./store";

let now: number;
let checker: Checker;

beforeEach(() => {
  now = Date.parse("2026-10-29T08:00:00.000Z");
  checker = new Checker({ now: () => now });
});

const visitor = () => checker.visitor("203.0.113.9");

describe("routes", () => {
  it("only leads back to the route's own pages", () => {
    expect(isCheckRoute("sign-in")).toBe(true);
    expect(isCheckRoute("toString")).toBe(false);
    expect(checkTarget("sign-in", "/sign-in/code")).toBe("/sign-in/code");
    expect(checkTarget("sign-in", "/sign-in?next=%2Faccount")).toBe(
      "/sign-in?next=%2Faccount",
    );
    expect(checkTarget("sign-in", "/contact/send")).toBeNull();
    expect(checkTarget("sign-in", "//evil.example/sign-in")).toBeNull();
    expect(checkTarget("sign-in", "https://evil.example/sign-in")).toBeNull();
    expect(checkTarget("contact", null)).toBeNull();
  });

  it("matches pages with names in their address", () => {
    expect(checkTarget("forum-post", "/forum/general/12-hello/")).toBe(
      "/forum/general/12-hello/",
    );
    expect(checkTarget("forum-post", "/forum/new/?in=general")).toBe(
      "/forum/new/?in=general",
    );
    expect(checkTarget("forum-post", "/forum/general/")).toBeNull();
    expect(
      checkTarget("forum-post", "/forum/general/12-x/../../evil"),
    ).toBeNull();
    expect(checkTarget("wiki-proposal", "/sky/-/edit/Iron_Ore")).toBe(
      "/sky/-/edit/Iron_Ore",
    );
    expect(checkTarget("wiki-proposal", "/sky/-/settings")).toBeNull();
    expect(checkTarget("comment", "/comments")).toBe("/comments");
  });
});

describe("Checker", () => {
  it("hashes visitors, never keeping the IP", () => {
    expect(visitor()).not.toContain("203.0.113.9");
    expect(visitor()).toBe(checker.visitor("203.0.113.9"));
    expect(visitor()).not.toBe(checker.visitor("203.0.113.10"));
    expect(new Checker().visitor("203.0.113.9")).not.toBe(visitor());
  });

  it("raises the level as a visitor keeps going, and forgets after an hour", () => {
    const [light, heavy, puzzle] = CHECK_ROUTES["sign-in"].steps;
    const levels: number[] = [];
    for (let i = 0; i < puzzle + 1; i++) {
      levels.push(checker.level("sign-in", visitor(), "normal"));
      checker.accept("sign-in", visitor());
    }
    expect(levels[light - 1]).toBe(0);
    expect(levels[light]).toBe(1);
    expect(levels[heavy]).toBe(2);
    expect(levels[puzzle]).toBe(PUZZLE_LEVEL);
    // Other routes and visitors are their own.
    expect(checker.level("contact", visitor(), "normal")).toBe(0);
    expect(checker.level("sign-in", checker.visitor("other"), "normal")).toBe(
      0,
    );
    now += 61 * 60_000;
    expect(checker.level("sign-in", visitor(), "normal")).toBe(0);
  });

  it("accepts a solved proof-of-work once", async () => {
    const pow = checker.powChallenge("sign-in", visitor(), 1);
    expect(pow.bits).toBe(POW_BITS[1]);
    const nonce = await solvePow(pow.salt, pow.bits);
    expect(checker.verify(pow.token, "sign-in", visitor(), { nonce })).toEqual({
      ok: true,
      level: 1,
    });
    expect(checker.verify(pow.token, "sign-in", visitor(), { nonce })).toEqual({
      ok: false,
      reason: "spent",
    });
  });

  it("refuses challenges for another route or visitor, tampered or stale", async () => {
    const pow = checker.powChallenge("sign-in", visitor(), 1);
    const nonce = await solvePow(pow.salt, pow.bits);
    expect(checker.verify(pow.token, "contact", visitor(), { nonce }).ok).toBe(
      false,
    );
    expect(
      checker.verify(pow.token, "sign-in", checker.visitor("x"), { nonce }).ok,
    ).toBe(false);
    const [body, mac] = pow.token.split(".");
    const forged = `${body ?? ""}x.${mac ?? ""}`;
    expect(checker.verify(forged, "sign-in", visitor(), { nonce })).toEqual({
      ok: false,
      reason: "invalid",
    });
    const late = checker.powChallenge("sign-in", visitor(), 1);
    now += CHECK_LIMITS.challengeMs + 1;
    expect(
      checker.verify(late.token, "sign-in", visitor(), { nonce: 0 }),
    ).toEqual({
      ok: false,
      reason: "expired",
    });
  });

  it("checks a puzzle by its grid or its question", () => {
    const one = checker.puzzleChallenge("contact", visitor());
    expect(
      checker.verify(one.token, "contact", visitor(), {
        cells: [...one.puzzle.answer].reverse(),
      }),
    ).toEqual({ ok: true, level: PUZZLE_LEVEL });

    const two = checker.puzzleChallenge("contact", visitor());
    expect(
      checker.verify(two.token, "contact", visitor(), {
        text: ` ${two.puzzle.textAnswer.toUpperCase()} `,
      }).ok,
    ).toBe(true);

    const three = checker.puzzleChallenge("contact", visitor());
    const wrong = three.puzzle.answer.slice(1);
    expect(answerKey(wrong)).not.toBe(answerKey(three.puzzle.answer));
    expect(
      checker.verify(three.token, "contact", visitor(), {
        cells: wrong,
        text: "",
      }),
    ).toEqual({ ok: false, reason: "wrong" });
  });

  it("gives passes that cover lower levels, for a while and a few uses", () => {
    const pass = checker.issuePass(visitor(), 2);
    expect(checker.passCovers(pass.value, visitor(), 3)).toBe(false);
    expect(checker.passCovers(pass.value, checker.visitor("x"), 1)).toBe(false);
    for (let i = 0; i < CHECK_LIMITS.passUses; i++)
      expect(checker.usePass(pass.value, visitor(), 1)).toBe(true);
    expect(checker.usePass(pass.value, visitor(), 1)).toBe(false);

    const later = checker.issuePass(visitor(), 1);
    now += CHECK_LIMITS.passMs + 1;
    expect(checker.usePass(later.value, visitor(), 1)).toBe(false);
  });

  it("raises the level after failures and turns away a visitor who keeps failing", () => {
    for (let i = 0; i < 3; i++) checker.fail("sign-in", visitor());
    expect(checker.level("sign-in", visitor(), "normal")).toBe(1);
    expect(checker.refused(visitor())).toBe(false);
    for (let i = 3; i < CHECK_LIMITS.failuresToRefuse; i++)
      checker.fail("sign-in", visitor());
    expect(checker.refused(visitor())).toBe(true);
    expect(checker.failuresLastHour()).toBe(CHECK_LIMITS.failuresToRefuse);
  });

  it("hands over its counts once", () => {
    checker.count("contact", "challenged");
    checker.count("contact", "challenged");
    checker.count("contact", "passed");
    expect(checker.takeCounts().get("contact")).toEqual({
      challenged: 2,
      passed: 1,
      failed: 0,
      puzzles: 0,
    });
    expect(checker.takeCounts().size).toBe(0);
  });
});

describe("store", () => {
  let handle: DatabaseHandle;
  beforeEach(async () => {
    handle = await openDatabase("memory://");
  });
  afterEach(async () => {
    await handle.close();
  });

  it("keeps the admin's mode until it runs out", async () => {
    const at = new Date(now);
    expect((await readMode(handle.db, at)).mode).toBe("normal");
    await setMode(
      handle.db,
      { mode: "attack", until: new Date(now + 3_600_000), setBy: "admin" },
      at,
    );
    expect(await readMode(handle.db, at)).toMatchObject({
      mode: "attack",
      setBy: "admin",
    });
    expect((await readMode(handle.db, new Date(now + 3_600_001))).mode).toBe(
      "normal",
    );
    await setMode(
      handle.db,
      { mode: "normal", until: new Date(now + 5), setBy: "admin" },
      at,
    );
    expect((await readMode(handle.db, at)).until).toBeNull();
  });

  it("adds counts to the day's rows", async () => {
    const at = new Date(now);
    checker.count("contact", "challenged");
    await flushChecks(handle.db, checker, at);
    checker.count("contact", "challenged");
    checker.count("contact", "failed");
    await flushChecks(handle.db, checker, at);
    const rows = await recentStats(handle.db, 7, at);
    expect(rows).toEqual([
      {
        day: "2026-10-29",
        route: "contact",
        challenged: 2,
        passed: 0,
        failed: 1,
        puzzles: 0,
      },
    ]);
    await handle.db
      .insert(captchaStats)
      .values({ day: "2026-01-01", route: "contact" });
    await flushChecks(handle.db, checker, at);
    expect(await handle.db.select().from(captchaStats)).toHaveLength(1);
  });

  it("raises the mode and alerts the admin once in a flood", async () => {
    const at = new Date(now);
    for (let i = 0; i < CHECK_FLOOD.failuresPerHour; i++)
      checker.fail("sign-in", checker.visitor(`198.51.100.${String(i)}`));
    await flushChecks(handle.db, checker, at);
    expect(await readMode(handle.db, at)).toMatchObject({
      mode: "raised",
      setBy: "auto",
    });
    await flushChecks(handle.db, checker, at);
    const alerts = await handle.db.select().from(adminAlerts);
    expect(alerts.map((alert) => alert.kind)).toEqual(["captcha-flood"]);
  });

  it("leaves a mode the admin chose alone in a flood", async () => {
    const at = new Date(now);
    await setMode(
      handle.db,
      { mode: "attack", until: null, setBy: "admin" },
      at,
    );
    for (let i = 0; i < CHECK_FLOOD.failuresPerHour; i++)
      checker.fail("sign-in", visitor());
    await flushChecks(handle.db, checker, at);
    expect(await readMode(handle.db, at)).toMatchObject({
      mode: "attack",
      setBy: "admin",
    });
  });
});

describe("gate", () => {
  const original = process.env.CAPTCHA_TEST;
  beforeEach(() => {
    process.env.CAPTCHA_TEST = "1";
  });
  afterEach(() => {
    if (original === undefined) delete process.env.CAPTCHA_TEST;
    else process.env.CAPTCHA_TEST = original;
  });

  /** A request's context, with the e2e cookie that sets the level. */
  function context(
    level: number,
    path = "/account/avatar",
    origin = "http://127.0.0.1",
  ) {
    const jar = new Map<string, string>([
      ["trilleo_check_test", String(level)],
    ]);
    return {
      url: new URL(`${origin}${path}`),
      locals: { user: null, session: null },
      clientAddress: "203.0.113.9",
      cookies: {
        get: (name: string) => {
          const value = jar.get(name);
          return value === undefined ? undefined : { value };
        },
        set: (name: string, value: string) => {
          jar.set(name, value);
        },
      },
    } as unknown as CheckContext;
  }

  it("lets level 0 through", async () => {
    expect(await requireHuman(context(0), "avatar")).toBeNull();
    expect(await requireHumanJson(context(0), "avatar")).toBeNull();
  });

  it("answers a form with a 307 to /check/, and JSON with a 428", async () => {
    const form = await requireHuman(context(2), "avatar");
    expect(form?.status).toBe(307);
    expect(form?.headers.get("location")).toBe(
      "/check/?route=avatar&level=2&to=%2Faccount%2Favatar",
    );
    const json = await requireHumanJson(context(3), "upload");
    expect(json?.status).toBe(428);
    expect(await json?.json()).toMatchObject({
      humanCheck: { route: "upload", level: 3 },
    });
  });

  it("sends the wiki's host back to the address its visitor sees", async () => {
    const form = await requireHuman(
      context(1, "/wiki/sky/-/edit/Iron_Ore", "http://wiki.localhost:4321"),
      "wiki-proposal",
    );
    expect(form?.headers.get("location")).toBe(
      "/check/?route=wiki-proposal&level=1&to=%2Fsky%2F-%2Fedit%2FIron_Ore",
    );
  });

  it("knows newcomers: signed in, not the admin, nothing approved", () => {
    const user = { id: "u", trustedAt: null } as unknown as User;
    expect(isNewcomer(user)).toBe(true);
    expect(isNewcomer({ ...user, trustedAt: new Date() })).toBe(false);
    expect(isNewcomer(null)).toBe(false);
  });

  it("lets a pass through until its level is too low", async () => {
    const ctx = context(2);
    setPassCookie(ctx, 2);
    expect(await requireHumanJson(ctx, "upload")).toBeNull();
    ctx.cookies.set("trilleo_check_test", "3");
    expect((await requireHumanJson(ctx, "upload"))?.status).toBe(428);
  });
});
