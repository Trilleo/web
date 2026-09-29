import {
  openDatabase,
  sessions,
  users,
  type DatabaseHandle,
} from "@trilleo/db";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { hashToken } from "./crypto";
import {
  SESSION_RENEW_MS,
  SESSION_TTL_MS,
  createSession,
  deleteExpiredSessions,
  invalidateSession,
  invalidateUserSessions,
  upsertGitHubUser,
  validateSession,
} from "./sessions";
import { ADMIN_PROFILE, VISITOR_PROFILE } from "./testing";

const DAY_MS = 24 * 60 * 60 * 1000;
const start = new Date("2026-01-01T00:00:00Z");
const later = (ms: number) => new Date(start.getTime() + ms);

let handle: DatabaseHandle;
beforeEach(async () => {
  handle = await openDatabase("memory://");
});
afterEach(async () => {
  await handle.close();
});

describe("upsertGitHubUser", () => {
  it("creates a user, then refreshes it on later sign-ins", async () => {
    const created = await upsertGitHubUser(handle.db, ADMIN_PROFILE, start);
    expect(created).toMatchObject({
      githubId: 1001,
      githubLogin: "site-owner",
      name: "Site Owner",
      lastSignInAt: start,
    });

    const renamed = { ...ADMIN_PROFILE, login: "new-login", name: null };
    const updated = await upsertGitHubUser(handle.db, renamed, later(DAY_MS));
    expect(updated.id).toBe(created.id);
    expect(updated.createdAt).toEqual(created.createdAt);
    expect(updated).toMatchObject({
      githubLogin: "new-login",
      name: null,
      lastSignInAt: later(DAY_MS),
    });
  });
});

describe("sessions", () => {
  it("stores only the token's hash, and finds the session by token", async () => {
    const user = await upsertGitHubUser(handle.db, ADMIN_PROFILE, start);
    const { token, session } = await createSession(handle.db, user.id, start);

    expect(session.id).toBe(hashToken(token));
    expect(session.id).not.toContain(token);
    expect(session.expiresAt).toEqual(later(SESSION_TTL_MS));

    const valid = await validateSession(handle.db, token, later(DAY_MS));
    expect(valid?.user.id).toBe(user.id);
    expect(valid?.session.id).toBe(session.id);
    expect(valid?.renewed).toBe(false);
  });

  it("knows nothing of unknown tokens", async () => {
    expect(await validateSession(handle.db, "made-up", start)).toBeNull();
  });

  it("forgets expired sessions", async () => {
    const user = await upsertGitHubUser(handle.db, ADMIN_PROFILE, start);
    const { token } = await createSession(handle.db, user.id, start);

    expect(
      await validateSession(handle.db, token, later(SESSION_TTL_MS)),
    ).toBeNull();
    expect(await handle.db.select().from(sessions)).toEqual([]);
  });

  it("ends a blocked user's session", async () => {
    const user = await upsertGitHubUser(handle.db, VISITOR_PROFILE, start);
    const { token } = await createSession(handle.db, user.id, start);
    await handle.db.update(users).set({ blockedAt: start });

    expect(await validateSession(handle.db, token, start)).toBeNull();
    expect(await handle.db.select().from(sessions)).toEqual([]);
  });

  it("extends a session used in its last 15 days", async () => {
    const user = await upsertGitHubUser(handle.db, ADMIN_PROFILE, start);
    const { token } = await createSession(handle.db, user.id, start);
    const usedAt = later(SESSION_TTL_MS - SESSION_RENEW_MS + DAY_MS);

    const valid = await validateSession(handle.db, token, usedAt);
    expect(valid?.renewed).toBe(true);
    const extended = new Date(usedAt.getTime() + SESSION_TTL_MS);
    expect(valid?.session.expiresAt).toEqual(extended);

    const [stored] = await handle.db.select().from(sessions);
    expect(stored?.expiresAt).toEqual(extended);
  });

  it("signs out one browser, or all of a user's", async () => {
    const admin = await upsertGitHubUser(handle.db, ADMIN_PROFILE, start);
    const visitor = await upsertGitHubUser(handle.db, VISITOR_PROFILE, start);
    const phone = await createSession(handle.db, admin.id, start);
    const laptop = await createSession(handle.db, admin.id, start);
    const other = await createSession(handle.db, visitor.id, start);

    await invalidateSession(handle.db, phone.token);
    expect(await validateSession(handle.db, phone.token, start)).toBeNull();
    expect(
      await validateSession(handle.db, laptop.token, start),
    ).not.toBeNull();

    await invalidateUserSessions(handle.db, admin.id);
    expect(await validateSession(handle.db, laptop.token, start)).toBeNull();
    expect(await validateSession(handle.db, other.token, start)).not.toBeNull();
  });

  it("clears out expired sessions and keeps current ones", async () => {
    const user = await upsertGitHubUser(handle.db, ADMIN_PROFILE, start);
    const old = await createSession(handle.db, user.id, start);
    const recent = await createSession(handle.db, user.id, later(20 * DAY_MS));

    await deleteExpiredSessions(handle.db, later(SESSION_TTL_MS + DAY_MS));
    const remaining = await handle.db.select().from(sessions);
    expect(remaining.map((row) => row.id)).toEqual([recent.session.id]);
    expect(remaining.map((row) => row.id)).not.toContain(old.session.id);
  });
});
