/// <reference types="vitest/config" />
import { getViteConfig } from "astro/config";

// Runs unit tests through Astro's Vite config. Playwright specs in e2e/ are excluded.
export default getViteConfig({
  test: {
    include: ["src/**/*.test.{ts,tsx}"],
    // Database tests start an in-memory PGlite (Postgres compiled to WebAssembly).
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
});
