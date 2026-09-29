/**
 * Test helpers for the auth code (imported only by *.test.ts files, so never bundled).
 */
import type { AuthConfig } from "./config";

export const TEST_CONFIG: AuthConfig = {
  clientId: "client-id",
  clientSecret: "client-secret",
  adminIds: new Set([1001]),
  githubWebUrl: "https://github.test",
  githubApiUrl: "https://api.github.test",
};

export const ADMIN_PROFILE = {
  id: 1001,
  login: "site-owner",
  name: "Site Owner",
};
export const VISITOR_PROFILE = { id: 2002, login: "visitor", name: null };

export interface FakeGitHubCall {
  url: string;
  init: RequestInit | undefined;
}

/** A `fetch` that answers like GitHub's token and user endpoints, recording calls. */
export function fakeGitHubFetch(
  options: {
    token?: unknown;
    tokenStatus?: number;
    user?: unknown;
    userStatus?: number;
  } = {},
): { fetchImpl: typeof fetch; calls: FakeGitHubCall[] } {
  const calls: FakeGitHubCall[] = [];
  const fetchImpl: typeof fetch = (input, init) => {
    const url =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.href
          : input.url;
    calls.push({ url, init });
    if (url.endsWith("/login/oauth/access_token")) {
      return Promise.resolve(
        Response.json(
          options.token ?? { access_token: "gho_test", scope: "" },
          {
            status: options.tokenStatus ?? 200,
          },
        ),
      );
    }
    if (url.endsWith("/user")) {
      return Promise.resolve(
        Response.json(options.user ?? ADMIN_PROFILE, {
          status: options.userStatus ?? 200,
        }),
      );
    }
    return Promise.resolve(new Response("Not found", { status: 404 }));
  };
  return { fetchImpl, calls };
}
