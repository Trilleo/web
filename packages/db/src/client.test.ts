import {
  cpSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { eq, sql, type SQL } from "drizzle-orm";
import { afterEach, describe, expect, it } from "vitest";
import {
  isPostgresUrl,
  openDatabase,
  pingDatabase,
  type Database,
  type DatabaseHandle,
} from "./client";
import { comments, sessions, userIdentities, users } from "./schema";

const open: DatabaseHandle[] = [];
const temporaryDirs: string[] = [];

const journal = JSON.parse(
  readFileSync(
    new URL("../migrations/meta/_journal.json", import.meta.url),
    "utf8",
  ),
) as { entries: unknown[] };

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
    expect(tables.map((row) => row.table_name)).toEqual([
      "admin_alerts",
      "blocked_hashes",
      "comments",
      "contact_messages",
      "email_codes",
      "file_appeals",
      "file_downloads",
      "file_reports",
      "files",
      "mail_messages",
      "mc_dependencies",
      "mc_gallery",
      "mc_previews",
      "mc_project_reports",
      "mc_project_slugs",
      "mc_projects",
      "mc_release_files",
      "mc_releases",
      "media",
      "passkeys",
      "post_slugs",
      "posts",
      "security_events",
      "sessions",
      "skygrid_orders",
      "skygrid_saves",
      "skygrid_trades",
      "storage_events",
      "tool_data",
      "upload_strikes",
      "user_identities",
      "username_history",
      "users",
    ]);
  });

  it("creates a data folder and migrates it only once across restarts", async () => {
    const dir = mkdtempSync(join(tmpdir(), "trilleo-db-"));
    temporaryDirs.push(dir);

    // A nested folder that doesn't exist yet, like .data/pglite on a fresh checkout.
    const dataDir = join(dir, "nested", "pglite");

    const first = await openDatabase(dataDir);
    await first.db.insert(users).values({ githubId: 1, username: "octocat" });
    await first.close();

    const second = await openDatabase(dataDir);
    open.push(second);
    expect(await second.db.select().from(users)).toHaveLength(1);
    const applied = await queryRows(
      second.db,
      sql`select * from drizzle.__drizzle_migrations`,
    );
    expect(applied).toHaveLength(journal.entries.length);
  });

  it("explains a missing migrations folder", async () => {
    await expect(
      openDatabase("memory://", { migrationsFolder: join(tmpdir(), "nope") }),
    ).rejects.toThrow(/No database migrations found.*MIGRATIONS_DIR/);
  });
});

describe("the accounts-by-email migration", () => {
  it("turns existing GitHub accounts into usernames and linked identities", async () => {
    const dir = mkdtempSync(join(tmpdir(), "trilleo-db-"));
    temporaryDirs.push(dir);
    // The migrations as the previous release had them: everything before 0016.
    const before = join(dir, "migrations");
    const folder = fileURLToPath(new URL("../migrations", import.meta.url));
    cpSync(folder, before, { recursive: true });
    const old = JSON.parse(
      readFileSync(join(before, "meta/_journal.json"), "utf8"),
    ) as { entries: { tag: string }[] };
    old.entries = old.entries.filter(
      (entry) => entry.tag < "0016_accounts-by-email",
    );
    writeFileSync(join(before, "meta/_journal.json"), JSON.stringify(old));

    const dataDir = join(dir, "pglite");
    const first = await openDatabase(dataDir, { migrationsFolder: before });
    // Raw SQL: the old table had no username column.
    await first.db
      .execute(sql`insert into users (github_id, github_login, name, last_sign_in_at)
      values (1, 'Octo-Cat', 'Octo', now()),
             (2, 'renamed', null, now() - interval '2 days'),
             (3, 'RENAMED', null, now())`);
    await first.close();

    const second = await openDatabase(dataDir);
    open.push(second);
    const rows = await second.db
      .select({ githubId: users.githubId, username: users.username })
      .from(users)
      .orderBy(users.githubId);
    expect(rows[0]).toEqual({ githubId: 1, username: "octo-cat" });
    // Two logins that differ only in case: the one used most recently keeps it.
    expect(rows[2]?.username).toBe("renamed");
    expect(rows[1]?.username).toMatch(/^renamed-[0-9a-f]{6}$/);
    const identities = await second.db
      .select({
        provider: userIdentities.provider,
        id: userIdentities.providerUserId,
        login: userIdentities.login,
      })
      .from(userIdentities)
      .orderBy(userIdentities.providerUserId);
    expect(identities).toEqual([
      { provider: "github", id: "1", login: "Octo-Cat" },
      { provider: "github", id: "2", login: "renamed" },
      { provider: "github", id: "3", login: "RENAMED" },
    ]);
  });
});

describe("schema", () => {
  it("keeps one user per GitHub account", async () => {
    const { db } = await memoryDb();
    await db.insert(users).values({ githubId: 42, username: "a" });
    await expect(
      db.insert(users).values({ githubId: 42, username: "b" }),
    ).rejects.toThrow();
  });

  it("fills in a username for inserts from the previous release", async () => {
    const { db } = await memoryDb();
    // Raw SQL: the previous release's inserts had no username.
    await db.execute(
      sql`insert into users (github_id, github_login) values (5, 'Octo-Cat')`,
    );
    const [user] = await db.select().from(users);
    expect(user?.username).toBe("octo-cat");
  });

  it("keeps usernames unique", async () => {
    const { db } = await memoryDb();
    await db.insert(users).values({ username: "taken" });
    await expect(
      db.insert(users).values({ username: "taken" }),
    ).rejects.toThrow();
  });

  it("fills in IDs and timestamps", async () => {
    const { db } = await memoryDb();
    const [user] = await db
      .insert(users)
      .values({ githubId: 7, username: "seven" })
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
      .values({ githubId: 9, username: "nine" })
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

describe("comments schema", () => {
  async function withAuthor() {
    const handle = await memoryDb();
    const [author] = await handle.db
      .insert(users)
      .values({ githubId: 11, username: "author" })
      .returning();
    if (!author) throw new Error("insert returned nothing");
    return { db: handle.db, author };
  }

  it("numbers comments and starts them as pending", async () => {
    const { db, author } = await withAuthor();
    const inserted = await db
      .insert(comments)
      .values([
        { postSlug: "a-post", authorId: author.id, body: "First" },
        { postSlug: "a-post", authorId: author.id, body: "Second" },
      ])
      .returning();
    expect(inserted.map((comment) => comment.id)).toEqual([1, 2]);
    expect(inserted.every((comment) => comment.status === "pending")).toBe(
      true,
    );
    expect(inserted[0]?.deletedAt).toBeNull();
  });

  it("keeps comments, without an author, when the author's account goes", async () => {
    const { db, author } = await withAuthor();
    await db
      .insert(comments)
      .values({ postSlug: "p", authorId: author.id, body: "x" });
    await db.delete(users).where(eq(users.id, author.id));
    const [left] = await db.select().from(comments);
    expect(left?.authorId).toBeNull();
  });

  it("removes replies with the comment they belong to", async () => {
    const { db, author } = await withAuthor();
    const [parent] = await db
      .insert(comments)
      .values({ postSlug: "p", authorId: author.id, body: "parent" })
      .returning();
    if (!parent) throw new Error("insert returned nothing");
    await db.insert(comments).values({
      postSlug: "p",
      authorId: author.id,
      body: "reply",
      parentId: parent.id,
    });
    await db.delete(comments).where(eq(comments.id, parent.id));
    expect(await db.select().from(comments)).toEqual([]);
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
