import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Each test file starts its own PGlite (Postgres compiled to WebAssembly).
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
});
