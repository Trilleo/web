import {
  openDatabase,
  users,
  type DatabaseHandle,
  type User,
} from "@trilleo/db";
import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { upsertGitHubUser } from "../auth/accounts";
import { randomToken } from "../auth/crypto";
import { validateSession } from "../auth/sessions";
import { TICKET_TTL_MS, issueTicket, redeemTicket, wikiNext } from "./handoff";

const now = new Date("2026-10-11T12:00:00Z");
let handle: DatabaseHandle;
let user: User;

beforeEach(async () => {
  handle = await openDatabase("memory://");
  user = await upsertGitHubUser(handle.db, {
    id: 7,
    login: "reader",
    name: null,
  });
});
afterEach(async () => {
  await handle.close();
});

describe("the wiki's sign-in tickets", () => {
  it("become a session for the browser that asked, once", async () => {
    const state = randomToken();
    const ticket = await issueTicket(handle.db, user.id, state, now);
    const session = await redeemTicket(handle.db, {
      ticket,
      state,
      userAgent: "Firefox",
      now,
    });
    expect(session?.user.id).toBe(user.id);
    if (!session) throw new Error();
    expect(
      (await validateSession(handle.db, session.token, now))?.user.id,
    ).toBe(user.id);
    expect(
      await redeemTicket(handle.db, { ticket, state, userAgent: null, now }),
    ).toBeNull();
  });

  it("are refused for another browser, and used up trying", async () => {
    const ticket = await issueTicket(handle.db, user.id, randomToken(), now);
    expect(
      await redeemTicket(handle.db, {
        ticket,
        state: randomToken(),
        userAgent: null,
        now,
      }),
    ).toBeNull();
    expect(
      await redeemTicket(handle.db, {
        ticket,
        state: null,
        userAgent: null,
        now,
      }),
    ).toBeNull();
  });

  it("expire, and don't work for blocked accounts", async () => {
    const state = randomToken();
    const late = await issueTicket(handle.db, user.id, state, now);
    const later = new Date(now.getTime() + TICKET_TTL_MS + 1);
    expect(
      await redeemTicket(handle.db, {
        ticket: late,
        state,
        userAgent: null,
        now: later,
      }),
    ).toBeNull();
    const ticket = await issueTicket(handle.db, user.id, state, now);
    await handle.db
      .update(users)
      .set({ blockedAt: now })
      .where(eq(users.id, user.id));
    expect(
      await redeemTicket(handle.db, { ticket, state, userAgent: null, now }),
    ).toBeNull();
  });
});

describe("wikiNext", () => {
  it("keeps paths on the wiki, and nothing else", () => {
    expect(wikiNext("/sky/Iron_Ore?x=1")).toBe("/sky/Iron_Ore?x=1");
    expect(wikiNext("https://evil.test/")).toBe("/");
    expect(wikiNext("//evil.test")).toBe("/");
    expect(wikiNext(null)).toBe("/");
  });
});
