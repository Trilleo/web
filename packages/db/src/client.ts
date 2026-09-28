import { existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { sql } from "drizzle-orm";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import * as schema from "./schema";

/** A Drizzle database over either driver; code using it doesn't care which. */
export type Database = PgDatabase<PgQueryResultHKT, typeof schema>;

export interface DatabaseHandle {
  db: Database;
  close: () => Promise<void>;
}

export interface OpenOptions {
  /**
   * The drizzle-kit migrations folder. Defaults to this package's, which only resolves
   * from source (dev, tests); a bundled server must pass it (MIGRATIONS_DIR).
   */
  migrationsFolder?: string;
}

/** `postgres://` and `postgresql://` URLs go to a Postgres server; anything else is PGlite. */
export function isPostgresUrl(url: string): boolean {
  return /^postgres(ql)?:\/\//i.test(url);
}

function defaultMigrationsFolder(): string {
  return fileURLToPath(new URL("../migrations", import.meta.url));
}

/**
 * Connects and applies any pending migrations before returning, so callers never see
 * an out-of-date schema. `url` is a Postgres URL (production), or a PGlite data
 * directory: `memory://` for a throwaway in-memory database, or a folder path.
 * The drivers are imported on demand, so production never loads PGlite.
 */
export async function openDatabase(
  url: string,
  options: OpenOptions = {},
): Promise<DatabaseHandle> {
  const migrationsFolder =
    options.migrationsFolder ?? defaultMigrationsFolder();
  if (!existsSync(join(migrationsFolder, "meta", "_journal.json"))) {
    throw new Error(
      `No database migrations found in ${migrationsFolder} (set MIGRATIONS_DIR).`,
    );
  }

  if (isPostgresUrl(url)) {
    const { default: postgres } = await import("postgres");
    const { drizzle } = await import("drizzle-orm/postgres-js");
    const { migrate } = await import("drizzle-orm/postgres-js/migrator");
    // The password comes from PGPASSWORD when the URL has none (see deploy/compose.yaml).
    const client = postgres(url, { max: 10, onnotice: () => undefined });
    const db = drizzle(client, { schema });
    try {
      await migrate(db, { migrationsFolder });
    } catch (error) {
      await client.end();
      throw error;
    }
    return { db, close: () => client.end() };
  }

  // PGlite creates its data folder but not missing parents (e.g. .data/ in dev).
  if (!url.includes("://")) mkdirSync(url, { recursive: true });
  const { PGlite } = await import("@electric-sql/pglite");
  const { drizzle } = await import("drizzle-orm/pglite");
  const { migrate } = await import("drizzle-orm/pglite/migrator");
  const client = new PGlite(url);
  const db = drizzle(client, { schema });
  try {
    await migrate(db, { migrationsFolder });
  } catch (error) {
    await client.close();
    throw error;
  }
  return { db, close: () => client.close() };
}

/** Throws unless the database answers a trivial query. */
export async function pingDatabase(db: Database): Promise<void> {
  await db.execute(sql`select 1`);
}
