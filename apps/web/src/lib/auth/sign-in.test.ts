import { openDatabase, users, type DatabaseHandle } from "@trilleo/db";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { validateSession } from "./sessions";
import { completeSignIn, signInErrorMessage } from "./sign-in";
import { TEST_CONFIG, VISITOR_PROFILE, fakeGitHubFetch } from "./testing";

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
    saved?: typeof saved | null;
    github?: Parameters<typeof fakeGitHubFetch>[0];
  } = {},
) {
  const github = fakeGitHubFetch(options.github);
  const result = completeSignIn({
    db: handle.db,
    config: TEST_CONFIG,
    params,
    saved: options.saved === undefined ? saved : options.saved,
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

    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    expect(outcome.next).toBe("/admin");
    const valid = await validateSession(handle.db, outcome.token);
    expect(valid?.user).toMatchObject({
      githubId: 1001,
      githubLogin: "site-owner",
    });

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

  it("turns away accounts that aren't admins, without creating them", async () => {
    const { result } = signIn(callback({ code: "c", state: "the-state" }), {
      github: { user: VISITOR_PROFILE },
    });
    expect(await result).toEqual({ ok: false, error: "not-allowed" });
    expect(await handle.db.select().from(users)).toEqual([]);
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
