import {
  isPostgresUrl,
  openDatabase,
  type Database,
  type DatabaseHandle,
} from "@trilleo/db";

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

/** A PGlite database kept in a folder on disk (not Postgres, not `memory://`). */
export function isDatabaseFolder(url: string): boolean {
  return !isPostgresUrl(url) && !url.includes("://");
}

/**
 * Where the open database lives: on globalThis, under a registered symbol, so it is
 * one per process. `pnpm dev` re-runs this module when it or @trilleo/db changes;
 * a module-level variable would then open a second PGlite on the same folder while
 * the first is still running (two Postgres instances writing one WAL). astro.config
 * reaches `close` through the same symbol to shut the database down with the server.
 */
export const DATABASE_KEY = Symbol.for("trilleo.database");

interface SharedDatabase {
  handle?: Promise<DatabaseHandle> | undefined;
  /** Signal handlers are installed (once per process). */
  guarded?: boolean;
  close: () => Promise<void>;
}

function shared(): SharedDatabase {
  const store = globalThis as typeof globalThis & {
    [DATABASE_KEY]?: SharedDatabase;
  };
  store[DATABASE_KEY] ??= { close: closeDatabase };
  return store[DATABASE_KEY];
}

/**
 * The shared database, connected and migrated on first use. A failed attempt isn't
 * kept, so the next call retries (e.g. while Postgres is still starting up).
 */
export function getDb(): Promise<Database> {
  const state = shared();
  if (!state.handle) {
    const url = resolveDatabaseUrl(process.env, import.meta.env.DEV);
    state.handle = openDatabase(url, {
      migrationsFolder: process.env.MIGRATIONS_DIR,
    }).catch((error: unknown) => {
      state.handle = undefined;
      throw error;
    });
    if (isDatabaseFolder(url)) guardShutdown(process);
  }
  return state.handle.then((handle) => handle.db);
}

/**
 * Closes the shared database, if one is open, and forgets it (the next getDb opens
 * it again). PGlite writes a shutdown checkpoint, so the folder needs no recovery
 * when it's next opened.
 */
export async function closeDatabase(): Promise<void> {
  const state = shared();
  const handle = state.handle;
  state.handle = undefined;
  if (!handle) return;
  try {
    await (await handle).close();
  } catch {
    // It never opened, or is already closed: nothing to shut down.
  }
}

/** How long a shutdown waits for the database before exiting anyway. */
export const SHUTDOWN_WAIT_MS = 5000;

/** Exit codes after a signal, as a shell reports them (128 + its number). */
const SIGNAL_EXIT: Record<string, number> = {
  SIGINT: 130,
  SIGHUP: 129,
};

type SignalTarget = Pick<NodeJS.Process, "once" | "exit">;

/**
 * Stopping `pnpm dev` with Ctrl-C (SIGINT) or closing its terminal (SIGHUP) would
 * kill the process mid-write, leaving the PGlite folder to Postgres's crash
 * recovery, which a damaged WAL can make fail ("could not locate a valid checkpoint
 * record"). Instead the database is closed first. SIGTERM is Vite's: it closes the
 * server, and astro.config closes the database as part of that.
 */
export function guardShutdown(target: SignalTarget): void {
  const state = shared();
  if (state.guarded) return;
  state.guarded = true;
  for (const [signal, code] of Object.entries(SIGNAL_EXIT)) {
    target.once(signal, () => {
      const timer = setTimeout(() => target.exit(code), SHUTDOWN_WAIT_MS);
      void closeDatabase().finally(() => {
        clearTimeout(timer);
        target.exit(code);
      });
    });
  }
}
