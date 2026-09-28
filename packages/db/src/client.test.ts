import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { eq, sql, type SQL } from "drizzle-orm";
import { afterEach, describe, expect, it } from "vitest";
import {
  isPostgresUrl,
  openDatabase,
  pingDatabase,
  type Database,
  type DatabaseHandle,
} from "./client";
import { sessions, users } from "./schema";

const open: DatabaseHandle[] = [];
const temporaryDirs: string[] = [];

/** Raw query rows. `execute` results differ by driver; these tests run on PGlite. */
async function queryRows<Row>(db: Database, query: SQL): Promise<Row[]> {
  const result = (await db.execute(query)) as { rows: Row[] };
  return result.rows;
}

async function memoryDb(): Promise<DatabaseHandle> {
  const handle = await openDatabase("memory://");
  open.push(handle);
  return handle;
}

afterEach(async () => {
  await Promise.all(open.splice(0).map((handle) => handle.close()));
  for (const dir of temporaryDirs.splice(0)) {
    rmSync(dir, { recursive: true, force: true });
  }
});

describe("isPostgresUrl", () => {
  it("recognises Postgres connection URLs", () => {
    expect(isPostgresUrl("postgres://trilleo@db:5432/trilleo")).toBe(true);
    expect(isPostgresUrl("postgresql://localhost/app")).toBe(true);
  });

  it("treats anything else as a PGlite data directory", () => {
    expect(isPostgresUrl("memory://")).toBe(false);
    expect(isPostgresUrl("./.data/pglite")).toBe(false);
    expect(isPostgresUrl("C:\\data\\pglite")).toBe(false);
  });
});

describe("openDatabase", () => {
  it("applies the migrations to a new database", async () => {
    const { db } = await memoryDb();
    const tables = await queryRows<{ table_name: string }>(
      db,
      sql`select table_name from information_schema.tables
          where table_schema = 'public' order by table_name`,
    );
    expect(tables.map((row) => row.table_name)).toEqual(["sessions", "users"]);
  });

  it("creates a data folder and migrates it only once across restarts", async () => {
    const dir = mkdtempSync(join(tmpdir(), "trilleo-db-"));
    temporaryDirs.push(dir);

    // A nested folder that doesn't exist yet, like .data/pglite on a fresh checkout.
    const dataDir = join(dir, "nested", "pglite");

    const first = await openDatabase(dataDir);
    await first.db
      .insert(users)
      .values({ githubId: 1, githubLogin: "octocat" });
    await first.close();

    const second = await openDatabase(dataDir);
    open.push(second);
    expect(await second.db.select().from(users)).toHaveLength(1);
    const applied = await queryRows(
      second.db,
      sql`select * from drizzle.__drizzle_migrations`,
    );
    expect(applied).toHaveLength(1);
  });

  it("explains a missing migrations folder", async () => {
    await expect(
      openDatabase("memory://", { migrationsFolder: join(tmpdir(), "nope") }),
    ).rejects.toThrow(/No database migrations found.*MIGRATIONS_DIR/);
  });
});

describe("schema", () => {
  it("keeps one user per GitHub account", async () => {
    const { db } = await memoryDb();
    await db.insert(users).values({ githubId: 42, githubLogin: "a" });
    await expect(
      db.insert(users).values({ githubId: 42, githubLogin: "b" }),
    ).rejects.toThrow();
  });

  it("fills in IDs and timestamps", async () => {
    const { db } = await memoryDb();
    const [user] = await db
      .insert(users)
      .values({ githubId: 7, githubLogin: "seven" })
      .returning();
    expect(user?.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(user?.createdAt).toBeInstanceOf(Date);
    expect(user?.lastSignInAt).toBeInstanceOf(Date);
    expect(user?.name).toBeNull();
  });

  it("removes a user's sessions along with the user", async () => {
    const { db } = await memoryDb();
    const [user] = await db
      .insert(users)
      .values({ githubId: 9, githubLogin: "nine" })
      .returning();
    if (!user) throw new Error("insert returned nothing");
    await db.insert(sessions).values({
      id: "hash",
      userId: user.id,
      expiresAt: new Date(Date.now() + 60_000),
    });

    await db.delete(users).where(eq(users.id, user.id));
    expect(await db.select().from(sessions)).toEqual([]);
  });

  it("rejects sessions for users that don't exist", async () => {
    const { db } = await memoryDb();
    await expect(
      db.insert(sessions).values({
        id: "hash",
        userId: "00000000-0000-4000-8000-000000000000",
        expiresAt: new Date(),
      }),
    ).rejects.toThrow();
  });
});

describe("pingDatabase", () => {
  it("resolves while the database is open and rejects once it's closed", async () => {
    const handle = await openDatabase("memory://");
    await expect(pingDatabase(handle.db)).resolves.toBeUndefined();
    await handle.close();
    await expect(pingDatabase(handle.db)).rejects.toThrow();
  });
});
