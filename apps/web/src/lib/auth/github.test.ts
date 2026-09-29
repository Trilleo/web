import { describe, expect, it } from "vitest";
import {
  GitHubError,
  authorizationUrl,
  exchangeCode,
  fetchGitHubUser,
} from "./github";
import { TEST_CONFIG, fakeGitHubFetch } from "./testing";

const request = {
  code: "the-code",
  codeVerifier: "the-verifier",
  redirectUri: "https://www.trilleo.net/auth/github/callback",
};

describe("authorizationUrl", () => {
  it("asks GitHub for no scopes, with state and an S256 PKCE challenge", () => {
    const url = new URL(
      authorizationUrl(TEST_CONFIG, {
        state: "the-state",
        codeChallenge: "the-challenge",
        redirectUri: request.redirectUri,
      }),
    );
    expect(url.origin + url.pathname).toBe(
      "https://github.test/login/oauth/authorize",
    );
    expect(Object.fromEntries(url.searchParams)).toEqual({
      client_id: "client-id",
      redirect_uri: request.redirectUri,
      state: "the-state",
      code_challenge: "the-challenge",
      code_challenge_method: "S256",
    });
  });
});

describe("exchangeCode", () => {
  it("posts the code, verifier and credentials, and returns the token", async () => {
    const { fetchImpl, calls } = fakeGitHubFetch();
    await expect(exchangeCode(TEST_CONFIG, request, fetchImpl)).resolves.toBe(
      "gho_test",
    );

    const [call] = calls;
    expect(call?.url).toBe("https://github.test/login/oauth/access_token");
    expect(call?.init?.method).toBe("POST");
    expect(new Headers(call?.init?.headers).get("Accept")).toBe(
      "application/json",
    );
    const body = call?.init?.body;
    expect(body).toBeInstanceOf(URLSearchParams);
    expect(Object.fromEntries(body as URLSearchParams)).toEqual({
      client_id: "client-id",
      client_secret: "client-secret",
      code: "the-code",
      redirect_uri: request.redirectUri,
      code_verifier: "the-verifier",
    });
  });

  it("reports GitHub's error for a rejected code", async () => {
    const { fetchImpl } = fakeGitHubFetch({
      token: { error: "bad_verification_code" },
    });
    await expect(exchangeCode(TEST_CONFIG, request, fetchImpl)).rejects.toThrow(
      new GitHubError("Token exchange failed: bad_verification_code"),
    );
  });

  it("fails on an HTTP error", async () => {
    const { fetchImpl } = fakeGitHubFetch({ tokenStatus: 502 });
    await expect(exchangeCode(TEST_CONFIG, request, fetchImpl)).rejects.toThrow(
      /HTTP 502/,
    );
  });
});

describe("fetchGitHubUser", () => {
  it("reads the profile with the token", async () => {
    const { fetchImpl, calls } = fakeGitHubFetch();
    await expect(
      fetchGitHubUser(TEST_CONFIG, "gho_test", fetchImpl),
    ).resolves.toEqual({
      id: 1001,
      login: "site-owner",
      name: "Site Owner",
    });
    const headers = new Headers(calls[0]?.init?.headers);
    expect(calls[0]?.url).toBe("https://api.github.test/user");
    expect(headers.get("Authorization")).toBe("Bearer gho_test");
    expect(headers.get("User-Agent")).toBeTruthy();
  });

  it("treats an empty name as none", async () => {
    const { fetchImpl } = fakeGitHubFetch({
      user: { id: 5, login: "x", name: "" },
    });
    const profile = await fetchGitHubUser(TEST_CONFIG, "t", fetchImpl);
    expect(profile.name).toBeNull();
  });

  it.each([
    [{ login: "no-id" }],
    [{ id: "5", login: "string-id" }],
    [{ id: 5 }],
    [["not", "an", "object"]],
  ])("rejects an unexpected profile %j", async (user) => {
    const { fetchImpl } = fakeGitHubFetch({ user });
    await expect(fetchGitHubUser(TEST_CONFIG, "t", fetchImpl)).rejects.toThrow(
      GitHubError,
    );
  });

  it("fails on an HTTP error", async () => {
    const { fetchImpl } = fakeGitHubFetch({ userStatus: 401 });
    await expect(fetchGitHubUser(TEST_CONFIG, "t", fetchImpl)).rejects.toThrow(
      /HTTP 401/,
    );
  });
});
