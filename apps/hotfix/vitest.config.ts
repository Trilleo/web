import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test-setup.ts"],
    // The balance and replay tests simulate minutes of play through the
    // autopilot; on a busy CI runner that takes well over the 5 s default.
    testTimeout: 30_000,
  },
});
