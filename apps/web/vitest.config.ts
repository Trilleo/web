/// <reference types="vitest/config" />
import { getViteConfig } from "astro/config";

// Runs unit tests through Astro's Vite config. Playwright specs in e2e/ are excluded.
export default getViteConfig({
  test: {
    include: ["src/**/*.test.{ts,tsx}"],
  },
});
