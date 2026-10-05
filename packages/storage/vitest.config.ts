import { defineConfig } from "vitest/config";

// Node by default (drivers, rules); component tests opt into jsdom per file.
export default defineConfig({
  test: {},
});
