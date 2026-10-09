import { normalizeEmail } from "@trilleo/mail";
import type { GitHubConfig } from "./config";

/** The parts of a GitHub account we keep (its public profile). */
export interface GitHubProfile {
  id: number;
  login: string;
  name: string | null;
}

export class GitHubError extends Error {
  override name = "GitHubError";
}

type Fetch = typeof fetch;
type GitHubUrls = Pick<GitHubConfig, "githubWebUrl" | "githubApiUrl">;
type Credentials = Pick<GitHubConfig, "clientId" | "clientSecret">;

const TIMEOUT_MS = 10_000;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/**
 * GitHub's sign-in page. `user:email` lets us read the account's verified primary
 * address (an account here is its address); nothing else beyond the public profile.
 */
export const GITHUB_SCOPE = "user:email";

export function authorizationUrl(
  config: Pick<GitHubConfig, "clientId" | "githubWebUrl">,
  request: { state: string; codeChallenge: string; redirectUri: string },
): string {
  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: request.redirectUri,
    scope: GITHUB_SCOPE,
    state: request.state,
    code_challenge: request.codeChallenge,
    code_challenge_method: "S256",
  });
  return `${config.githubWebUrl}/login/oauth/authorize?${params.toString()}`;
}

/** Trades the code GitHub sent back for an access token (used once, never stored). */
export async function exchangeCode(
  config: Credentials & GitHubUrls,
  request: { code: string; codeVerifier: string; redirectUri: string },
  fetchImpl: Fetch = fetch,
): Promise<string> {
  const response = await fetchImpl(
    `${config.githubWebUrl}/login/oauth/access_token`,
    {
      method: "POST",
      headers: { Accept: "application/json" },
      body: new URLSearchParams({
        client_id: config.clientId,
        client_secret: config.clientSecret,
        code: request.code,
        redirect_uri: request.redirectUri,
        code_verifier: request.codeVerifier,
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    },
  );
  if (!response.ok) {
    throw new GitHubError(
      `Token exchange failed: HTTP ${String(response.status)}`,
    );
  }
  const body: unknown = await response.json();
  if (
    isRecord(body) &&
    typeof body.access_token === "string" &&
    body.access_token
  ) {
    return body.access_token;
  }
  // GitHub reports problems (expired code, wrong verifier…) as 200 + { error }.
  const reason =
    isRecord(body) && typeof body.error === "string"
      ? body.error
      : "no access_token";
  throw new GitHubError(`Token exchange failed: ${reason}`);
}

function apiHeaders(accessToken: string): Record<string, string> {
  return {
    Accept: "application/vnd.github+json",
    Authorization: `Bearer ${accessToken}`,
    // GitHub's API rejects requests without one.
    "User-Agent": "trilleo.net",
  };
}

/**
 * The account's primary address, if GitHub has verified it; null when there's none,
 * or the scope wasn't granted (then sign-in carries on without it).
 */
export async function fetchGitHubEmail(
  config: GitHubUrls,
  accessToken: string,
  fetchImpl: Fetch = fetch,
): Promise<string | null> {
  try {
    const response = await fetchImpl(`${config.githubApiUrl}/user/emails`, {
      headers: apiHeaders(accessToken),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!response.ok) return null;
    const body: unknown = await response.json();
    if (!Array.isArray(body)) return null;
    for (const entry of body as unknown[]) {
      if (
        isRecord(entry) &&
        entry.primary === true &&
        entry.verified === true &&
        typeof entry.email === "string"
      )
        return normalizeEmail(entry.email);
    }
    return null;
  } catch {
    return null;
  }
}

/** Whose token it is. */
export async function fetchGitHubUser(
  config: GitHubUrls,
  accessToken: string,
  fetchImpl: Fetch = fetch,
): Promise<GitHubProfile> {
  const response = await fetchImpl(`${config.githubApiUrl}/user`, {
    headers: apiHeaders(accessToken),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!response.ok) {
    throw new GitHubError(
      `User lookup failed: HTTP ${String(response.status)}`,
    );
  }
  const body: unknown = await response.json();
  if (
    !isRecord(body) ||
    typeof body.id !== "number" ||
    !Number.isSafeInteger(body.id) ||
    typeof body.login !== "string"
  ) {
    throw new GitHubError("User lookup returned an unexpected response");
  }
  const name = typeof body.name === "string" && body.name ? body.name : null;
  return { id: body.id, login: body.login, name };
}
