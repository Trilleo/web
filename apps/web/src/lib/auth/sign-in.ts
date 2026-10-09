import type { Database, User } from "@trilleo/db";
import { maskEmail } from "@trilleo/mail";
import {
  adoptVerifiedEmail,
  createFromProvider,
  findIdentity,
  linkIdentity,
  touchIdentity,
  userByEmail,
  type ProviderProfile,
} from "./accounts";
import {
  logEvent,
  purgeSecurityEvents,
  recordSignIn,
  type SignInMethod,
} from "./activity";
import type { GitHubConfig } from "./config";
import type { OAuthState } from "./cookies";
import { exchangeCode, fetchGitHubEmail, fetchGitHubUser } from "./github";
import { createSession, deleteExpiredSessions } from "./sessions";

/** Why a sign-in didn't happen; /sign-in explains each one. */
export type SignInError =
  | "state"
  | "denied"
  | "failed"
  | "not-allowed"
  | "not-configured"
  | "email-taken"
  | "linked-elsewhere"
  | "already-linked";

export type SignInResult =
  | {
      ok: true;
      kind: "session";
      token: string;
      expiresAt: Date;
      next: string;
      /** An account from before email sign-in took GitHub's verified address. */
      adopted: boolean;
    }
  | { ok: true; kind: "linked"; next: string }
  | { ok: false; error: SignInError };

/**
 * Starts a session for `user`: the end of every way of signing in. Logs it (and
 * alerts the owner about a browser the account hasn't used lately); `created` for
 * the sign-in that made the account.
 */
export async function startSession(
  db: Database,
  user: User,
  input: {
    method: SignInMethod;
    created?: boolean;
    userAgent: string | null;
    now?: Date;
  },
): Promise<{ token: string; expiresAt: Date }> {
  const now = input.now ?? new Date();
  await deleteExpiredSessions(db, now);
  await purgeSecurityEvents(db, now);
  const { token, session } = await createSession(
    db,
    user.id,
    now,
    input.userAgent,
  );
  await recordSignIn(db, user, { ...input, now });
  return { token, expiresAt: session.expiresAt };
}

/**
 * Finishes a GitHub sign-in (or a link from account settings) when GitHub sends the
 * visitor back to /auth/github/callback. Nothing is stored unless the state
 * matches and GitHub vouches for the account. Then:
 *
 * - a GitHub account linked here signs in to its account (an account from before
 *   email sign-in takes GitHub's verified address, if no other account has it);
 * - linking (`saved.linkUserId`) adds it to the signed-in account;
 * - otherwise a new account is made, with GitHub's verified address. If an account
 *   here already has that address, nothing is linked: they sign in by email first
 *   and link GitHub from there, so a GitHub account can't take over an account.
 */
export async function completeSignIn(input: {
  db: Database;
  config: GitHubConfig;
  /** The callback's query string: code, state, or error. */
  params: URLSearchParams;
  /** From the cookie set when the visitor left for GitHub. */
  saved: OAuthState | null;
  /** Who's signed in in this browser, if anyone. */
  currentUser?: User | null;
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
    currentUser = null,
    redirectUri,
    fetchImpl,
    now = new Date(),
    userAgent = null,
  } = input;

  // Only a callback for the sign-in this browser started (CSRF protection).
  const state = params.get("state");
  if (!saved || !state || state !== saved.state)
    return { ok: false, error: "state" };
  // A link belongs to the account that asked for it.
  if (saved.linkUserId && saved.linkUserId !== currentUser?.id)
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

  let profile: ProviderProfile;
  try {
    const accessToken = await exchangeCode(
      config,
      { code, codeVerifier: saved.codeVerifier, redirectUri },
      fetchImpl,
    );
    const account = await fetchGitHubUser(config, accessToken, fetchImpl);
    profile = {
      provider: "github",
      id: String(account.id),
      login: account.login,
      name: account.name,
      verifiedEmail: await fetchGitHubEmail(config, accessToken, fetchImpl),
    };
  } catch (error) {
    console.error("GitHub sign-in failed:", error);
    return { ok: false, error: "failed" };
  }

  if (saved.linkUserId && currentUser) {
    const linked = await linkIdentity(db, currentUser.id, profile, now);
    if (!linked.ok) return { ok: false, error: linked.error };
    await logEvent(db, currentUser.id, "linked", {
      detail: `GitHub @${profile.login}`,
      userAgent,
      now,
    });
    return { ok: true, kind: "linked", next: saved.next };
  }

  let user: User;
  let adopted = false;
  let created = false;
  const found = await findIdentity(db, "github", profile.id);
  if (found) {
    if (found.user.blockedAt) return { ok: false, error: "not-allowed" };
    user = await touchIdentity(db, found.user, found.identity, profile, now);
    const moved = await adoptVerifiedEmail(
      db,
      user,
      profile.verifiedEmail,
      now,
    );
    if (moved) {
      user = moved;
      adopted = true;
      await logEvent(db, user.id, "email-changed", {
        detail: `${maskEmail(moved.email ?? "")}, from GitHub`,
        userAgent,
        now,
      });
    }
  } else {
    if (profile.verifiedEmail && (await userByEmail(db, profile.verifiedEmail)))
      return { ok: false, error: "email-taken" };
    user = await createFromProvider(db, profile, now);
    created = true;
  }

  const session = await startSession(db, user, {
    method: "github",
    created,
    userAgent,
    now,
  });
  return { ok: true, kind: "session", ...session, next: saved.next, adopted };
}

const MESSAGES: Record<SignInError, string> = {
  state: "That sign-in expired or didn’t start here. Please try again.",
  denied: "Sign-in was cancelled on GitHub.",
  failed: "GitHub didn’t complete the sign-in. Please try again in a moment.",
  "not-allowed": "That account can’t sign in here.",
  "not-configured": "Signing in with GitHub isn’t set up on this server.",
  "email-taken":
    "An account here already uses that GitHub account’s email address. Sign in with your email below, then link GitHub from your account’s security page.",
  "linked-elsewhere":
    "That GitHub account is linked to another account here. Sign in to that one and unlink it first.",
  "already-linked":
    "Your account already has a GitHub account linked. Unlink it first to link another.",
};

/** The explanation for `/sign-in?error=…`, or null for anything unrecognised. */
export function signInErrorMessage(error: string | null): string | null {
  return error && Object.hasOwn(MESSAGES, error)
    ? MESSAGES[error as SignInError]
    : null;
}
