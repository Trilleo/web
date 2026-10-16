import { defineConfig } from "vitest/config";

// React widgets' tests run in jsdom (`// @vitest-environment jsdom` at their top).
export default defineConfig({
  test: {},
});
