import { defineConfig, devices } from "@playwright/test";

// Its own port, so a dev server on 4321 is never mistaken for the build under test.
const PORT = 4329;
const ORIGIN = `http://127.0.0.1:${String(PORT)}`;
const isCI = Boolean(process.env.CI);
// CI builds the site in its own step (visible logs, own timeout) and sets this.
const prebuilt = process.env.E2E_PREBUILT === "1";

/**
 * Tests run against a production-style build that also includes draft posts (so post
 * pages and search have content to test), written to dist-e2e/ and served by
 * `astro preview`. The real `pnpm build` never includes drafts.
 */
const e2eEnv = { INCLUDE_DRAFTS: "true", ASTRO_OUT_DIR: "./dist-e2e" };

// `astro` directly (not through pnpm) so stopping the server stops the real process.
// --ignore-lock keeps it in the foreground: Astro 7 may otherwise background itself
// when it detects an AI agent, and a backgrounded server outlives the test run.
const preview = `astro preview --host 127.0.0.1 --port ${String(PORT)} --ignore-lock`;

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
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: prebuilt ? preview : `pnpm run build:e2e && ${preview}`,
    url: ORIGIN,
    reuseExistingServer: !isCI,
    env: e2eEnv,
    timeout: 180_000,
    stdout: "pipe",
    gracefulShutdown: { signal: "SIGTERM", timeout: 5_000 },
  },
});
