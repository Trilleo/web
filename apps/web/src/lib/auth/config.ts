/**
 * Sign-in settings, read from the environment at runtime (never import.meta.env):
 *   ADMIN_EMAILS                            addresses whose accounts may use /admin
 *   ADMIN_GITHUB_IDS                        numeric GitHub user IDs, comma-separated:
 *                                           the accounts linked to them may use /admin
 *   GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET  a GitHub OAuth App's credentials (optional:
 *                                           without them, only email sign-in)
 *   GITHUB_WEB_URL, GITHUB_API_URL          only for tests (a fake GitHub)
 *
 * Signing in by email needs mail to work (lib/mail/config.ts), not these.
 */
import { normalizeEmail } from "@trilleo/mail";

export interface GitHubConfig {
  clientId: string;
  clientSecret: string;
  githubWebUrl: string;
  githubApiUrl: string;
}

export interface AuthConfig {
  /** "Sign in with GitHub", or null when it isn't set up. */
  github: GitHubConfig | null;
  /** Who may use /admin: an account with one of these (proved) addresses… */
  adminEmails: ReadonlySet<string>;
  /** …or one linked to one of these GitHub accounts. */
  adminGithubIds: ReadonlySet<number>;
}

type Env = Record<string, string | undefined>;

export function parseAdminIds(value: string | undefined): Set<number> {
  const ids = new Set<number>();
  for (const part of (value ?? "").split(",")) {
    const id = part.trim();
    if (!id) continue;
    if (!/^\d+$/.test(id) || !Number.isSafeInteger(Number(id))) {
      throw new Error(
        `ADMIN_GITHUB_IDS: "${id}" isn't a numeric GitHub user ID.`,
      );
    }
    ids.add(Number(id));
  }
  return ids;
}

export function parseAdminEmails(value: string | undefined): Set<string> {
  const emails = new Set<string>();
  for (const part of (value ?? "").split(",")) {
    if (!part.trim()) continue;
    const email = normalizeEmail(part);
    if (!email)
      throw new Error(`ADMIN_EMAILS: "${part.trim()}" isn't an email address.`);
    emails.add(email);
  }
  return emails;
}

function baseUrl(value: string | undefined, fallback: string): string {
  const trimmed = value?.trim();
  const url = trimmed === undefined || trimmed === "" ? fallback : trimmed;
  return url.replace(/\/+$/, "");
}

export function readAuthConfig(env: Env): AuthConfig {
  const clientId = env.GITHUB_CLIENT_ID?.trim();
  const clientSecret = env.GITHUB_CLIENT_SECRET?.trim();
  return {
    github:
      clientId && clientSecret
        ? {
            clientId,
            clientSecret,
            githubWebUrl: baseUrl(env.GITHUB_WEB_URL, "https://github.com"),
            githubApiUrl: baseUrl(env.GITHUB_API_URL, "https://api.github.com"),
          }
        : null,
    adminEmails: parseAdminEmails(env.ADMIN_EMAILS),
    adminGithubIds: parseAdminIds(env.ADMIN_GITHUB_IDS),
  };
}

let cached: AuthConfig | undefined;

/** This server's settings. The environment doesn't change while it runs. */
export function authConfig(): AuthConfig {
  cached ??= readAuthConfig(process.env);
  return cached;
}
