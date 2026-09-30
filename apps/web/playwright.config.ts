import { fileURLToPath } from "node:url";
import { defineConfig, devices } from "@playwright/test";
import { FAKE_CLIENT, FAKE_GITHUB_PORT, FAKE_USERS } from "./e2e/fake-github";

// Its own port, so a dev server on 4321 is never mistaken for the build under test.
const PORT = 4329;
const ORIGIN = `http://127.0.0.1:${String(PORT)}`;
const FAKE_GITHUB = `http://127.0.0.1:${String(FAKE_GITHUB_PORT)}`;
const isCI = Boolean(process.env.CI);
// CI builds the site in its own step (visible logs, own timeout) and sets this.
const prebuilt = process.env.E2E_PREBUILT === "1";

/**
 * Tests run against a production-style build, written to dist-e2e/ and served by
 * `astro preview`. Posts live in the database, which starts with the imported drafts;
 * e2e/posts.setup.ts publishes them through the admin editor before the specs run.
 */
const e2eEnv = {
  ASTRO_OUT_DIR: "./dist-e2e",
  // The server's database: a fresh in-memory PGlite for every run.
  DATABASE_URL: "memory://",
  MIGRATIONS_DIR: fileURLToPath(
    new URL("../../packages/db/migrations", import.meta.url),
  ),
  // Sign-in goes to e2e/fake-github.ts instead of GitHub.
  GITHUB_CLIENT_ID: FAKE_CLIENT.id,
  GITHUB_CLIENT_SECRET: FAKE_CLIENT.secret,
  ADMIN_GITHUB_IDS: String(FAKE_USERS.admin.id),
  GITHUB_WEB_URL: FAKE_GITHUB,
  GITHUB_API_URL: FAKE_GITHUB,
};

// `astro` directly (not through pnpm) so stopping the server stops the real process.
// --ignore-lock keeps it in the foreground: Astro 7 may otherwise background itself
// when it detects an AI agent, and a backgrounded server outlives the test run.
const preview = `astro preview --host 127.0.0.1 --port ${String(PORT)} --ignore-lock`;

const serverDefaults = {
  reuseExistingServer: !isCI,
  stdout: "pipe",
  gracefulShutdown: { signal: "SIGTERM", timeout: 5_000 },
} as const;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  // A hung run fails with logs instead of stalling CI.
  globalTimeout: isCI ? 10 * 60_000 : 0,
  reporter: isCI ? [["list"], ["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: ORIGIN,
    trace: "on-first-retry",
    // Everything shows at once, so specs never wait on (or race) an animation.
    // e2e/motion.spec.ts opts back in.
    reducedMotion: "reduce",
  },
  projects: [
    // Publishes the imported posts through the admin editor (the database starts
    // with them as drafts), so the specs have public posts to read and comment on.
    {
      name: "setup",
      testMatch: /.*\.setup\.ts/,
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
      dependencies: ["setup"],
    },
  ],
  webServer: [
    {
      ...serverDefaults,
      command: "node e2e/fake-github.ts",
      url: `${FAKE_GITHUB}/health`,
    },
    {
      ...serverDefaults,
      command: prebuilt ? preview : `pnpm run build:e2e && ${preview}`,
      url: ORIGIN,
      env: e2eEnv,
      timeout: 180_000,
    },
  ],
});
