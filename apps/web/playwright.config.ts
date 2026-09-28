import { defineConfig, devices } from "@playwright/test";

// Its own port, so a dev server on 4321 is never mistaken for the build under test.
const PORT = 4329;
const isCI = Boolean(process.env.CI);

/**
 * Tests run against a production-style build that also includes draft posts (so post
 * pages and search have content to test), written to dist-e2e/ and served by
 * `astro preview`. The real `pnpm build` never includes drafts.
 */
const e2eEnv = { INCLUDE_DRAFTS: "true", ASTRO_OUT_DIR: "./dist-e2e" };

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  reporter: isCI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: `http://localhost:${String(PORT)}`,
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: `pnpm run build:e2e && pnpm preview --port ${String(PORT)}`,
    url: `http://localhost:${String(PORT)}`,
    reuseExistingServer: !isCI,
    env: e2eEnv,
    timeout: 180_000,
  },
});
