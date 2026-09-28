import { defineConfig } from "drizzle-kit";

// `pnpm --filter @trilleo/db db:generate` writes a migration for schema changes.
// CI fails if the committed migrations don't match the schema.
export default defineConfig({
  dialect: "postgresql",
  schema: "./src/schema.ts",
  out: "./migrations",
  strict: true,
});
