import type { AuthConfig } from "./config";

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
type GitHubUrls = Pick<AuthConfig, "githubWebUrl" | "githubApiUrl">;
type Credentials = Pick<AuthConfig, "clientId" | "clientSecret">;

const TIMEOUT_MS = 10_000;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/** GitHub's sign-in page. No `scope`: the public profile is all we read. */
export function authorizationUrl(
  config: Pick<AuthConfig, "clientId" | "githubWebUrl">,
  request: { state: string; codeChallenge: string; redirectUri: string },
): string {
  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: request.redirectUri,
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

/** Whose token it is. */
export async function fetchGitHubUser(
  config: GitHubUrls,
  accessToken: string,
  fetchImpl: Fetch = fetch,
): Promise<GitHubProfile> {
  const response = await fetchImpl(`${config.githubApiUrl}/user`, {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${accessToken}`,
      // GitHub's API rejects requests without one.
      "User-Agent": "trilleo.net",
    },
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
