/**
 * A stand-in for GitHub's OAuth endpoints, so the e2e tests run the real sign-in flow
 * (state, PKCE, code exchange, profile lookup) without a network or a GitHub account.
 * playwright.config.ts starts it (`node e2e/fake-github.ts`) and points the site at it
 * with GITHUB_WEB_URL / GITHUB_API_URL. Its sign-in page has a button per test user.
 */
import { createHash, randomBytes } from "node:crypto";
import { createServer, type IncomingMessage } from "node:http";

export const FAKE_GITHUB_PORT = 4330;
export const FAKE_CLIENT = { id: "e2e-client", secret: "e2e-secret" };
/** Accounts with buttons on the sign-in page. `admin` is ADMIN_GITHUB_IDS's. */
export const FAKE_USERS = {
  admin: { id: 1001, login: "site-owner", name: "Site Owner" },
  visitor: { id: 2002, login: "visitor", name: null },
};
export type FakeUser = keyof typeof FAKE_USERS;

interface Profile {
  id: number;
  login: string;
  name: string | null;
}

/**
 * Any other login also signs in (via /fake/approve?user=<login>), as an account with
 * an ID derived from the login. Tests use a fresh one per attempt, so a retry never
 * meets what an earlier attempt left in the database.
 */
export function fakeUserId(login: string): number {
  let hash = 0;
  for (const char of login)
    hash = (hash * 31 + char.charCodeAt(0)) % 1_000_000_000;
  return 1_000_000_000 + hash;
}

function profileFor(user: string | null): Profile | null {
  if (user === null) return null;
  if (Object.hasOwn(FAKE_USERS, user)) return FAKE_USERS[user as FakeUser];
  return /^[a-z][a-z0-9-]{1,38}$/.test(user)
    ? { id: fakeUserId(user), login: user, name: null }
    : null;
}

interface IssuedCode {
  profile: Profile;
  redirectUri: string;
  challenge: string;
}

interface Reply {
  status: number;
  body?: string;
  type?: string;
  location?: string;
}

const codes = new Map<string, IssuedCode>();
const tokens = new Map<string, Profile>();

const text = (status: number, body: string): Reply => ({
  status,
  body,
  type: "text/plain",
});
const json = (body: object, status = 200): Reply => ({
  status,
  body: JSON.stringify(body),
  type: "application/json",
});
const redirectTo = (location: string): Reply => ({ status: 302, location });

async function readBody(req: IncomingMessage): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk as Buffer);
  return Buffer.concat(chunks).toString("utf8");
}

/** GitHub's "Authorize application" page. */
function authorize(url: URL): Reply {
  const q = url.searchParams;
  if (q.get("client_id") !== FAKE_CLIENT.id)
    return text(400, "Unknown client_id");
  if (q.get("code_challenge_method") !== "S256")
    return text(400, "PKCE S256 required");
  const redirectUri = q.get("redirect_uri");
  const state = q.get("state");
  const challenge = q.get("code_challenge");
  if (!redirectUri || !state || !challenge)
    return text(400, "Missing parameters");

  const link = (path: string, extra: Record<string, string>) =>
    `${path}?${new URLSearchParams({ redirect_uri: redirectUri, state, challenge, ...extra }).toString()}`;
  const buttons = (Object.keys(FAKE_USERS) as FakeUser[])
    .map(
      (user) =>
        `<li><a href="${link("/fake/approve", { user })}">Continue as ${FAKE_USERS[user].login}</a></li>`,
    )
    .join("");
  return {
    status: 200,
    type: "text/html",
    body: `<!doctype html><html lang="en"><title>Fake GitHub</title><main>
      <h1>Sign in (fake GitHub)</h1>
      <ul>${buttons}<li><a href="${link("/fake/deny", {})}">Cancel</a></li></ul>
    </main></html>`,
  };
}

/** The visitor approved: back to the site with a one-time code. */
function approve(url: URL): Reply {
  const q = url.searchParams;
  const profile = profileFor(q.get("user"));
  const redirectUri = q.get("redirect_uri");
  const state = q.get("state");
  const challenge = q.get("challenge");
  if (!profile || !redirectUri || !state || !challenge) {
    return text(400, "Bad approval");
  }
  const code = randomBytes(16).toString("hex");
  codes.set(code, { profile, redirectUri, challenge });
  const target = new URL(redirectUri);
  target.search = new URLSearchParams({ code, state }).toString();
  return redirectTo(target.href);
}

/** The visitor cancelled. */
function deny(url: URL): Reply {
  const redirectUri = url.searchParams.get("redirect_uri");
  const state = url.searchParams.get("state");
  if (!redirectUri || !state) return text(400, "Bad denial");
  const target = new URL(redirectUri);
  target.search = new URLSearchParams({
    error: "access_denied",
    state,
  }).toString();
  return redirectTo(target.href);
}

/** The site trades the code for a token, proving it holds the PKCE verifier. */
async function accessToken(req: IncomingMessage): Promise<Reply> {
  const form = new URLSearchParams(await readBody(req));
  if (
    form.get("client_id") !== FAKE_CLIENT.id ||
    form.get("client_secret") !== FAKE_CLIENT.secret
  ) {
    return json({ error: "incorrect_client_credentials" });
  }
  // Like GitHub, every code works once, and problems come back as 200 + { error }.
  const code = form.get("code") ?? "";
  const issued = codes.get(code);
  codes.delete(code);
  if (!issued) return json({ error: "bad_verification_code" });
  const challenge = createHash("sha256")
    .update(form.get("code_verifier") ?? "")
    .digest("base64url");
  if (
    issued.redirectUri !== form.get("redirect_uri") ||
    issued.challenge !== challenge
  ) {
    return json({ error: "bad_verification_code" });
  }
  const token = `gho_${randomBytes(16).toString("hex")}`;
  tokens.set(token, issued.profile);
  return json({ access_token: token, token_type: "bearer", scope: "" });
}

/** The API's "who am I". */
function user(req: IncomingMessage): Reply {
  const token = req.headers.authorization?.replace(/^Bearer /, "") ?? "";
  const who = tokens.get(token);
  return who ? json(who) : json({ message: "Bad credentials" }, 401);
}

const routes: Record<
  string,
  (req: IncomingMessage, url: URL) => Reply | Promise<Reply>
> = {
  "GET /health": () => text(200, "ok"),
  "GET /login/oauth/authorize": (_, url) => authorize(url),
  "GET /fake/approve": (_, url) => approve(url),
  "GET /fake/deny": (_, url) => deny(url),
  "POST /login/oauth/access_token": (req) => accessToken(req),
  "GET /user": (req) => user(req),
};

async function handle(req: IncomingMessage): Promise<Reply> {
  const url = new URL(
    req.url ?? "/",
    `http://127.0.0.1:${String(FAKE_GITHUB_PORT)}`,
  );
  const route = routes[`${req.method ?? "GET"} ${url.pathname}`];
  return route ? route(req, url) : text(404, "Not found");
}

// Only when run directly; the specs import the constants above.
if (import.meta.main) {
  createServer((req, res) => {
    handle(req)
      .catch((error: unknown) => {
        console.error(error);
        return text(500, "Fake GitHub crashed");
      })
      .then((reply) => {
        const headers: Record<string, string> = {};
        if (reply.type)
          headers["Content-Type"] = `${reply.type}; charset=utf-8`;
        if (reply.location) headers.Location = reply.location;
        res.writeHead(reply.status, headers);
        res.end(reply.body);
      })
      .catch((error: unknown) => {
        console.error(error);
      });
  }).listen(FAKE_GITHUB_PORT, "127.0.0.1", () => {
    console.log(`Fake GitHub on http://127.0.0.1:${String(FAKE_GITHUB_PORT)}`);
  });
}
