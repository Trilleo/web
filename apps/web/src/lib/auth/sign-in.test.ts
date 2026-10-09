import {
  openDatabase,
  userIdentities,
  users,
  type DatabaseHandle,
  type User,
} from "@trilleo/db";
import { eq } from "drizzle-orm";
import { createAccount, upsertGitHubUser } from "./accounts";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { validateSession } from "./sessions";
import { completeSignIn, signInErrorMessage } from "./sign-in";
import {
  ADMIN_PROFILE,
  TEST_GITHUB,
  VISITOR_PROFILE,
  fakeGitHubFetch,
} from "./testing";

const saved = {
  state: "the-state",
  codeVerifier: "the-verifier",
  next: "/admin",
};
const redirectUri = "https://www.trilleo.net/auth/github/callback";
const callback = (query: Record<string, string>) => new URLSearchParams(query);

let handle: DatabaseHandle;
beforeEach(async () => {
  handle = await openDatabase("memory://");
});
afterEach(async () => {
  await handle.close();
  vi.restoreAllMocks();
});

function signIn(
  params: URLSearchParams,
  options: {
    saved?: (typeof saved & { linkUserId?: string }) | null;
    github?: Parameters<typeof fakeGitHubFetch>[0];
    currentUser?: User | null;
  } = {},
) {
  const github = fakeGitHubFetch(options.github);
  const result = completeSignIn({
    db: handle.db,
    config: TEST_GITHUB,
    params,
    saved: options.saved === undefined ? saved : options.saved,
    currentUser: options.currentUser ?? null,
    redirectUri,
    fetchImpl: github.fetchImpl,
  });
  return { result, calls: github.calls };
}

describe("completeSignIn", () => {
  it("signs the admin in and returns to where they were going", async () => {
    const { result, calls } = signIn(
      callback({ code: "c", state: "the-state" }),
    );
    const outcome = await result;

    expect(outcome).toMatchObject({
      ok: true,
      kind: "session",
      adopted: false,
    });
    if (!outcome.ok || outcome.kind !== "session") return;
    expect(outcome.next).toBe("/admin");
    const valid = await validateSession(handle.db, outcome.token);
    expect(valid?.user).toMatchObject({
      githubId: 1001,
      username: "site-owner",
    });
    const identities = await handle.db.select().from(userIdentities);
    expect(identities).toMatchObject([
      { provider: "github", providerUserId: "1001", login: "site-owner" },
    ]);

    // The verifier and redirect URI from this sign-in went to GitHub.
    const body = calls[0]?.init?.body as URLSearchParams;
    expect(body.get("code_verifier")).toBe("the-verifier");
    expect(body.get("redirect_uri")).toBe(redirectUri);
  });

  it.each([
    ["no saved sign-in", callback({ code: "c", state: "the-state" }), null],
    ["a different state", callback({ code: "c", state: "forged" }), saved],
    ["no state", callback({ code: "c" }), saved],
  ])(
    "refuses a callback with %s, without asking GitHub",
    async (_, params, cookie) => {
      const { result, calls } = signIn(params, { saved: cookie });
      expect(await result).toEqual({ ok: false, error: "state" });
      expect(calls).toEqual([]);
    },
  );

  it("reports a sign-in cancelled on GitHub", async () => {
    const { result } = signIn(
      callback({ error: "access_denied", state: "the-state" }),
    );
    expect(await result).toEqual({ ok: false, error: "denied" });
  });

  it("reports other GitHub errors and a missing code as failures", async () => {
    const other = signIn(
      callback({ error: "server_error", state: "the-state" }),
    );
    expect(await other.result).toEqual({ ok: false, error: "failed" });
    const noCode = signIn(callback({ state: "the-state" }));
    expect(await noCode.result).toEqual({ ok: false, error: "failed" });
  });

  it("reports GitHub refusing the code, and stores nothing", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const { result } = signIn(callback({ code: "c", state: "the-state" }), {
      github: { token: { error: "bad_verification_code" } },
    });
    expect(await result).toEqual({ ok: false, error: "failed" });
    expect(await handle.db.select().from(users)).toEqual([]);
  });

  it("signs in any GitHub account, not only the admin's", async () => {
    const { result } = signIn(callback({ code: "c", state: "the-state" }), {
      github: { user: VISITOR_PROFILE },
    });
    const outcome = await result;
    expect(outcome.ok).toBe(true);
    const [visitor] = await handle.db.select().from(users);
    expect(visitor).toMatchObject({
      githubId: 2002,
      username: "visitor",
      email: null,
    });
  });

  it("gives a new account GitHub's verified primary address", async () => {
    const { result, calls } = signIn(
      callback({ code: "c", state: "the-state" }),
      {
        github: {
          user: VISITOR_PROFILE,
          emails: [
            { email: "Visitor@Example.com", primary: true, verified: true },
          ],
        },
      },
    );
    expect((await result).ok).toBe(true);
    const [visitor] = await handle.db.select().from(users);
    expect(visitor?.email).toBe("visitor@example.com");
    expect(visitor?.emailVerifiedAt).toBeInstanceOf(Date);
    expect(visitor?.emailToken).toEqual(expect.any(String));
    expect(calls.some((call) => call.url.endsWith("/user/emails"))).toBe(true);
  });

  it("never links a GitHub account to an account by its address alone", async () => {
    await createAccount(handle.db, {
      username: "ada",
      email: "ada@example.com",
    });
    const { result } = signIn(callback({ code: "c", state: "the-state" }), {
      github: {
        user: VISITOR_PROFILE,
        emails: [{ email: "ada@example.com", primary: true, verified: true }],
      },
    });
    expect(await result).toEqual({ ok: false, error: "email-taken" });
    expect(await handle.db.select().from(userIdentities)).toEqual([]);
    expect(await handle.db.select().from(users)).toHaveLength(1);
  });

  it("moves an account from before email sign-in onto GitHub's address", async () => {
    // As the migration leaves it: a GitHub identity, no address.
    await upsertGitHubUser(handle.db, VISITOR_PROFILE);
    const { result } = signIn(callback({ code: "c", state: "the-state" }), {
      github: {
        user: VISITOR_PROFILE,
        emails: [
          { email: "visitor@example.com", primary: true, verified: true },
        ],
      },
    });
    expect(await result).toMatchObject({ ok: true, adopted: true });
    const [visitor] = await handle.db.select().from(users);
    expect(visitor?.email).toBe("visitor@example.com");
  });

  it("leaves the address alone when another account has it", async () => {
    await upsertGitHubUser(handle.db, VISITOR_PROFILE);
    await createAccount(handle.db, {
      username: "other",
      email: "visitor@example.com",
    });
    const { result } = signIn(callback({ code: "c", state: "the-state" }), {
      github: {
        user: VISITOR_PROFILE,
        emails: [
          { email: "visitor@example.com", primary: true, verified: true },
        ],
      },
    });
    expect(await result).toMatchObject({ ok: true, adopted: false });
    const [visitor] = await handle.db
      .select()
      .from(users)
      .where(eq(users.username, "visitor"));
    expect(visitor?.email).toBeNull();
  });

  it("keeps the account and username when the GitHub login changes", async () => {
    const before = await upsertGitHubUser(handle.db, VISITOR_PROFILE);
    const { result } = signIn(callback({ code: "c", state: "the-state" }), {
      github: { user: { ...VISITOR_PROFILE, login: "renamed" } },
    });
    expect((await result).ok).toBe(true);
    const all = await handle.db.select().from(users);
    expect(all).toHaveLength(1);
    expect(all[0]).toMatchObject({ id: before.id, username: "visitor" });
    const [identity] = await handle.db.select().from(userIdentities);
    expect(identity?.login).toBe("renamed");
  });

  it("links GitHub to the signed-in account that asked", async () => {
    const ada = await createAccount(handle.db, {
      username: "ada",
      email: "ada@example.com",
    });
    const { result } = signIn(callback({ code: "c", state: "the-state" }), {
      saved: { ...saved, next: "/account/security/", linkUserId: ada.id },
      currentUser: ada,
      github: { user: VISITOR_PROFILE },
    });
    expect(await result).toEqual({
      ok: true,
      kind: "linked",
      next: "/account/security/",
    });
    const [row] = await handle.db
      .select()
      .from(users)
      .where(eq(users.id, ada.id));
    expect(row?.githubId).toBe(2002);
  });

  it("refuses a link for someone else, or to a GitHub account linked elsewhere", async () => {
    const ada = await createAccount(handle.db, {
      username: "ada",
      email: "ada@example.com",
    });
    const forged = signIn(callback({ code: "c", state: "the-state" }), {
      saved: { ...saved, linkUserId: ada.id },
      currentUser: null,
    });
    expect(await forged.result).toEqual({ ok: false, error: "state" });

    await upsertGitHubUser(handle.db, ADMIN_PROFILE);
    const taken = signIn(callback({ code: "c", state: "the-state" }), {
      saved: { ...saved, linkUserId: ada.id },
      currentUser: ada,
      github: { user: ADMIN_PROFILE },
    });
    expect(await taken.result).toEqual({
      ok: false,
      error: "linked-elsewhere",
    });
  });

  it("turns away accounts the admin has blocked", async () => {
    const first = signIn(callback({ code: "c", state: "the-state" }), {
      github: { user: VISITOR_PROFILE },
    });
    await first.result;
    await handle.db.update(users).set({ blockedAt: new Date() });

    const again = signIn(callback({ code: "c", state: "the-state" }), {
      github: { user: VISITOR_PROFILE },
    });
    expect(await again.result).toEqual({ ok: false, error: "not-allowed" });
  });
});

describe("signInErrorMessage", () => {
  it("explains each error", () => {
    for (const error of [
      "state",
      "denied",
      "failed",
      "not-allowed",
      "not-configured",
      "email-taken",
      "linked-elsewhere",
      "already-linked",
    ]) {
      expect(signInErrorMessage(error)).toEqual(expect.any(String));
    }
  });

  it("ignores anything else", () => {
    expect(signInErrorMessage(null)).toBeNull();
    expect(signInErrorMessage("nonsense")).toBeNull();
    expect(signInErrorMessage("toString")).toBeNull();
    expect(signInErrorMessage("__proto__")).toBeNull();
  });
});
