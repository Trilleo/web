import { users, type Database } from "@trilleo/db";
import { eq } from "drizzle-orm";
import type { AuthConfig } from "./config";
import type { OAuthState } from "./cookies";
import { exchangeCode, fetchGitHubUser, type GitHubProfile } from "./github";
import {
  createSession,
  deleteExpiredSessions,
  upsertGitHubUser,
} from "./sessions";

/** Why a sign-in didn't happen; /sign-in explains each one. */
export type SignInError =
  "state" | "denied" | "failed" | "not-allowed" | "not-configured";

export type SignInResult =
  | { ok: true; token: string; expiresAt: Date; next: string }
  | { ok: false; error: SignInError };

/**
 * Finishes a sign-in when GitHub sends the visitor back to /auth/github/callback.
 * Nothing is stored unless the state matches, GitHub vouches for the account, and
 * the admin hasn't blocked it. Any GitHub account may sign in (to comment); only
 * ADMIN_GITHUB_IDS may use /admin.
 */
export async function completeSignIn(input: {
  db: Database;
  config: AuthConfig;
  /** The callback's query string: code, state, or error. */
  params: URLSearchParams;
  /** From the cookie set when the visitor left for GitHub. */
  saved: OAuthState | null;
  redirectUri: string;
  fetchImpl?: typeof fetch;
  now?: Date;
  /** The browser's User-Agent, shown in the sessions list. */
  userAgent?: string | null;
}): Promise<SignInResult> {
  const {
    db,
    config,
    params,
    saved,
    redirectUri,
    fetchImpl,
    now = new Date(),
    userAgent = null,
  } = input;

  // Only a callback for the sign-in this browser started (CSRF protection).
  const state = params.get("state");
  if (!saved || !state || state !== saved.state)
    return { ok: false, error: "state" };

  const githubError = params.get("error");
  if (githubError) {
    return {
      ok: false,
      error: githubError === "access_denied" ? "denied" : "failed",
    };
  }
  const code = params.get("code");
  if (!code) return { ok: false, error: "failed" };

  let profile: GitHubProfile;
  try {
    const accessToken = await exchangeCode(
      config,
      { code, codeVerifier: saved.codeVerifier, redirectUri },
      fetchImpl,
    );
    profile = await fetchGitHubUser(config, accessToken, fetchImpl);
  } catch (error) {
    console.error("GitHub sign-in failed:", error);
    return { ok: false, error: "failed" };
  }

  const [existing] = await db
    .select({ blockedAt: users.blockedAt })
    .from(users)
    .where(eq(users.githubId, profile.id))
    .limit(1);
  if (existing?.blockedAt) return { ok: false, error: "not-allowed" };

  const user = await upsertGitHubUser(db, profile, now);
  await deleteExpiredSessions(db, now);
  const { token, session } = await createSession(db, user.id, now, userAgent);
  return { ok: true, token, expiresAt: session.expiresAt, next: saved.next };
}

const MESSAGES: Record<SignInError, string> = {
  state: "That sign-in expired or didn’t start here. Please try again.",
  denied: "Sign-in was cancelled on GitHub.",
  failed: "GitHub didn’t complete the sign-in. Please try again in a moment.",
  "not-allowed": "That GitHub account can’t sign in here.",
  "not-configured": "Sign-in isn’t set up on this server yet.",
};

/** The explanation for `/sign-in?error=…`, or null for anything unrecognised. */
export function signInErrorMessage(error: string | null): string | null {
  return error && Object.hasOwn(MESSAGES, error)
    ? MESSAGES[error as SignInError]
    : null;
}
