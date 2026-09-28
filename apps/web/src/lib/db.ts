import { openDatabase, type Database } from "@trilleo/db";

/** `pnpm dev` keeps its PGlite database here (gitignored); delete the folder to reset. */
export const DEV_DATABASE_DIR = "./.data/pglite";

/**
 * DATABASE_URL: a Postgres URL in production, `memory://` for the e2e build. Local
 * dev falls back to a PGlite folder; anywhere else a missing value is an error.
 */
export function resolveDatabaseUrl(
  env: Record<string, string | undefined>,
  isDev: boolean,
): string {
  const url = env.DATABASE_URL?.trim();
  if (url) return url;
  if (isDev) return DEV_DATABASE_DIR;
  throw new Error("DATABASE_URL is not set.");
}

let database: Promise<Database> | undefined;

/**
 * The shared database, connected and migrated on first use. A failed attempt isn't
 * kept, so the next call retries (e.g. while Postgres is still starting up).
 */
export function getDb(): Promise<Database> {
  database ??= openDatabase(
    resolveDatabaseUrl(process.env, import.meta.env.DEV),
    { migrationsFolder: process.env.MIGRATIONS_DIR },
  ).then(
    (handle) => handle.db,
    (error: unknown) => {
      database = undefined;
      throw error;
    },
  );
  return database;
}
