import {
  emailCodes,
  mailMessages,
  openDatabase,
  users,
  type DatabaseHandle,
} from "@trilleo/db";
import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createAccount } from "./accounts";
import {
  SIGN_IN_LIMITS,
  SignInLimiter,
  completeSignUp,
  requestSignInCode,
  signUpTicket,
  verifySignInCode,
} from "./email-sign-in";

const start = new Date("2026-10-01T12:00:00Z");
const after = (ms: number) => new Date(start.getTime() + ms);

let handle: DatabaseHandle;
beforeEach(async () => {
  handle = await openDatabase("memory://");
});
afterEach(async () => {
  await handle.close();
});

/** Asks for a code and reads it back out of the queued email. */
async function codeFor(email: string, now = start) {
  const result = await requestSignInCode(handle.db, email, {
    available: true,
    ip: "203.0.113.1",
    now,
    limiter: new SignInLimiter(),
  });
  if (!result.ok) throw new Error(result.error);
  const [message] = await handle.db
    .select()
    .from(mailMessages)
    .where(eq(mailMessages.id, result.messageId));
  const code = /\b(\d{6})\b/.exec(message?.textBody ?? "")?.[1];
  if (!code) throw new Error("no code in the email");
  return { code, message };
}

describe("requestSignInCode", () => {
  it("sends a code, worded for whether the address has an account", async () => {
    await createAccount(handle.db, {
      username: "ada",
      email: "ada@example.com",
    });
    const known = await codeFor("ADA@example.com");
    expect(known.message?.toAddress).toBe("ada@example.com");
    expect(known.message?.textBody).toContain("@ada");
    const unknown = await codeFor("new@example.com");
    expect(unknown.message?.textBody).toContain("creating");
    // Only the hash is kept.
    const rows = await handle.db.select().from(emailCodes);
    expect(JSON.stringify(rows)).not.toContain(known.code);
  });

  it("refuses bad addresses, waits between codes, and caps visitors", async () => {
    const limiter = new SignInLimiter();
    const ask = (email: string, now = start) =>
      requestSignInCode(handle.db, email, {
        available: true,
        ip: "203.0.113.1",
        now,
        limiter,
      });
    expect(await ask("nope")).toEqual({ ok: false, error: "invalid" });
    expect((await ask("a@example.com")).ok).toBe(true);
    expect(await ask("a@example.com", after(1000))).toEqual({
      ok: false,
      error: "wait",
    });
    for (let i = 1; i < SIGN_IN_LIMITS.perVisitorHourly; i++)
      expect((await ask(`v${String(i)}@example.com`)).ok).toBe(true);
    expect(await ask("one-more@example.com")).toEqual({
      ok: false,
      error: "too-many",
    });
  });

  it("says so when mail is off", async () => {
    expect(
      await requestSignInCode(handle.db, "a@example.com", {
        available: false,
        ip: "x",
        now: start,
      }),
    ).toEqual({ ok: false, error: "unavailable" });
  });
});

describe("verifySignInCode", () => {
  it("signs in the address's account with the right code, once", async () => {
    const ada = await createAccount(handle.db, {
      username: "ada",
      email: "ada@example.com",
    });
    const { code } = await codeFor("ada@example.com");
    expect(
      await verifySignInCode(handle.db, "ada@example.com", "000000", after(1)),
    ).toMatchObject({ ok: false });
    const result = await verifySignInCode(
      handle.db,
      "ada@example.com",
      `${code.slice(0, 3)} ${code.slice(3)}`,
      after(2),
    );
    expect(result).toMatchObject({ ok: true, user: { id: ada.id } });
    expect(
      await verifySignInCode(handle.db, "ada@example.com", code, after(3)),
    ).toEqual({ ok: false, error: "none" });
  });

  it("stops after a few wrong guesses, and when the code expires", async () => {
    const { code } = await codeFor("ada@example.com");
    for (let i = 0; i < 5; i++)
      await verifySignInCode(handle.db, "ada@example.com", "000000", after(1));
    expect(
      await verifySignInCode(handle.db, "ada@example.com", code, after(2)),
    ).toEqual({ ok: false, error: "none" });

    const fresh = await codeFor("bob@example.com");
    expect(
      await verifySignInCode(
        handle.db,
        "bob@example.com",
        fresh.code,
        after(SIGN_IN_LIMITS.ttlMs + 1),
      ),
    ).toEqual({ ok: false, error: "none" });
  });

  it("turns away blocked accounts", async () => {
    await createAccount(handle.db, {
      username: "ada",
      email: "ada@example.com",
    });
    await handle.db.update(users).set({ blockedAt: start });
    const { code } = await codeFor("ada@example.com");
    expect(
      await verifySignInCode(handle.db, "ada@example.com", code, after(1)),
    ).toEqual({ ok: false, error: "not-allowed" });
  });
});

describe("signing up", () => {
  it("hands a new address a ticket, which makes the account", async () => {
    const { code } = await codeFor("new@example.com");
    const proved = await verifySignInCode(
      handle.db,
      "new@example.com",
      code,
      after(1),
    );
    if (!proved.ok || !("ticket" in proved)) throw new Error("no ticket");
    expect(
      await signUpTicket(handle.db, proved.ticket, after(2)),
    ).toMatchObject({ email: "new@example.com" });

    expect(
      await completeSignUp(
        handle.db,
        proved.ticket,
        { username: "newbie", agreed: false },
        after(3),
      ),
    ).toEqual({ ok: false, error: "terms" });
    expect(
      await completeSignUp(
        handle.db,
        proved.ticket,
        { username: "x", agreed: true },
        after(3),
      ),
    ).toEqual({ ok: false, error: "short" });
    const done = await completeSignUp(
      handle.db,
      proved.ticket,
      { username: "Newbie", agreed: true },
      after(4),
    );
    expect(done).toMatchObject({
      ok: true,
      user: { username: "newbie", email: "new@example.com" },
    });
    if (!done.ok) return;
    expect(done.user.emailVerifiedAt).toEqual(after(4));
    expect(done.user.emailToken).toEqual(expect.any(String));
    // The ticket works once.
    expect(
      await completeSignUp(
        handle.db,
        proved.ticket,
        { username: "again", agreed: true },
        after(5),
      ),
    ).toEqual({ ok: false, error: "expired" });
  });

  it("refuses an expired or made-up ticket", async () => {
    expect(
      await completeSignUp(
        handle.db,
        "made-up",
        { username: "who", agreed: true },
        start,
      ),
    ).toEqual({ ok: false, error: "expired" });
    const { code } = await codeFor("late@example.com");
    const proved = await verifySignInCode(
      handle.db,
      "late@example.com",
      code,
      after(1),
    );
    if (!proved.ok || !("ticket" in proved)) throw new Error("no ticket");
    expect(
      await signUpTicket(
        handle.db,
        proved.ticket,
        after(SIGN_IN_LIMITS.ticketMs + 2),
      ),
    ).toBeUndefined();
  });
});
