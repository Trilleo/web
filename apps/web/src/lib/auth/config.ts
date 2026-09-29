/**
 * Sign-in settings, read from the environment at runtime (never import.meta.env):
 *   GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET  a GitHub OAuth App's credentials
 *   ADMIN_GITHUB_IDS                        numeric GitHub user IDs, comma-separated
 *   GITHUB_WEB_URL, GITHUB_API_URL          only for tests (a fake GitHub)
 */
export interface AuthConfig {
  clientId: string;
  clientSecret: string;
  /** Who may sign in (for now, only the site owner) and use /admin. */
  adminIds: ReadonlySet<number>;
  githubWebUrl: string;
  githubApiUrl: string;
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

function baseUrl(value: string | undefined, fallback: string): string {
  const trimmed = value?.trim();
  const url = trimmed === undefined || trimmed === "" ? fallback : trimmed;
  return url.replace(/\/+$/, "");
}

/** The settings, or null while sign-in isn't set up (any value missing). */
export function readAuthConfig(env: Env): AuthConfig | null {
  const clientId = env.GITHUB_CLIENT_ID?.trim();
  const clientSecret = env.GITHUB_CLIENT_SECRET?.trim();
  const adminIds = parseAdminIds(env.ADMIN_GITHUB_IDS);
  if (!clientId || !clientSecret || adminIds.size === 0) return null;
  return {
    clientId,
    clientSecret,
    adminIds,
    githubWebUrl: baseUrl(env.GITHUB_WEB_URL, "https://github.com"),
    githubApiUrl: baseUrl(env.GITHUB_API_URL, "https://api.github.com"),
  };
}

let cached: AuthConfig | null | undefined;

/** This server's settings. The environment doesn't change while it runs. */
export function authConfig(): AuthConfig | null {
  if (cached === undefined) cached = readAuthConfig(process.env);
  return cached;
}
