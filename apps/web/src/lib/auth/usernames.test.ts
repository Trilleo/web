import {
  openDatabase,
  usernameHistory,
  users,
  type DatabaseHandle,
} from "@trilleo/db";
import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createAccount } from "./accounts";
import {
  USERNAME_COOLDOWN_DAYS,
  USERNAME_HOLD_DAYS,
  changeUsername,
  checkNewUsername,
  movedUsername,
  nextUsernameChange,
  normalizeUsername,
  suggestUsername,
  usernameBase,
  usernameShapeProblem,
} from "./usernames";

const DAY_MS = 24 * 60 * 60 * 1000;
const start = new Date("2026-10-01T12:00:00Z");
const later = (days: number) => new Date(start.getTime() + days * DAY_MS);

let handle: DatabaseHandle;
beforeEach(async () => {
  handle = await openDatabase("memory://");
});
afterEach(async () => {
  await handle.close();
});

const account = (username: string, email: string | null = null) =>
  createAccount(handle.db, { username, email, now: start });

describe("username shapes", () => {
  it("accepts lower-case letters, digits and single inner hyphens", () => {
    for (const name of ["ada", "ada-l", "a1b2c3", "x".repeat(30)])
      expect(usernameShapeProblem(name)).toBeNull();
  });

  it("names what's wrong", () => {
    expect(usernameShapeProblem("ab")).toBe("short");
    expect(usernameShapeProblem("x".repeat(31))).toBe("long");
    for (const name of ["Ada", "-ada", "ada-", "a--b", "a_b", "a b", "ädä"])
      expect(usernameShapeProblem(name)).toBe("characters");
    expect(usernameShapeProblem("admin")).toBe("reserved");
    expect(usernameShapeProblem("sign-in")).toBe("reserved");
  });

  it("forgives capitals, spaces and a leading @ when typed", () => {
    expect(normalizeUsername("  @Ada-L ")).toBe("ada-l");
  });

  it("makes a username's shape out of anything", () => {
    expect(usernameBase("Octo_Cat")).toBe("octo-cat");
    expect(usernameBase("--x.y--")).toBe("x-y");
    expect(usernameBase("cy")).toBe("cy-user");
    expect(usernameBase("admin")).toBe("admin-user");
    expect(usernameBase("ü")).toBe("user");
    expect(usernameShapeProblem(usernameBase("a".repeat(60)))).toBeNull();
  });
});

describe("suggestUsername", () => {
  it("numbers a taken name", async () => {
    await account("ada");
    await account("ada-2");
    expect(await suggestUsername(handle.db, "Ada", start)).toBe("ada-3");
    expect(await suggestUsername(handle.db, "bob", start)).toBe("bob");
  });
});

describe("changeUsername", () => {
  it("renames, keeps the old name for them, and redirects it", async () => {
    const ada = await account("ada");
    expect(await changeUsername(handle.db, ada, "Lovelace", start)).toEqual({
      ok: true,
      username: "lovelace",
    });
    const [row] = await handle.db
      .select()
      .from(users)
      .where(eq(users.id, ada.id));
    expect(row).toMatchObject({
      username: "lovelace",
      // Mirrored for the previous release.
      githubLogin: "lovelace",
      usernameChangedAt: start,
    });

    // Nobody else can take "ada" while it's held, and it redirects.
    expect(await checkNewUsername(handle.db, "ada", later(1))).toEqual({
      ok: false,
      problem: "taken",
    });
    expect(await movedUsername(handle.db, "ADA", null, later(1))).toBe(
      "lovelace",
    );
    // After the hold, it's free and no longer redirects.
    const after = later(USERNAME_HOLD_DAYS + 1);
    expect(await movedUsername(handle.db, "ada", null, after)).toBeNull();
    expect(await checkNewUsername(handle.db, "ada", after)).toEqual({
      ok: true,
      username: "ada",
    });
  });

  it("waits out the cooldown between changes", async () => {
    const ada = await account("ada");
    await changeUsername(handle.db, ada, "lovelace", start);
    const [renamed] = await handle.db
      .select()
      .from(users)
      .where(eq(users.id, ada.id));
    if (!renamed) throw new Error("no user");
    expect(nextUsernameChange(renamed, later(1))).toEqual(
      later(USERNAME_COOLDOWN_DAYS),
    );
    expect(
      await changeUsername(handle.db, renamed, "countess", later(1)),
    ).toEqual({
      ok: false,
      problem: "cooldown",
    });
    const ok = await changeUsername(
      handle.db,
      renamed,
      "ada",
      later(USERNAME_COOLDOWN_DAYS),
    );
    // Taking back your own old name is fine, and it's no longer held.
    expect(ok).toEqual({ ok: true, username: "ada" });
    expect(
      await handle.db
        .select()
        .from(usernameHistory)
        .where(eq(usernameHistory.username, "ada")),
    ).toEqual([]);
  });

  it("refuses someone else's, a bad shape, and the same name", async () => {
    await account("bob");
    const ada = await account("ada");
    for (const [name, problem] of [
      ["bob", "taken"],
      ["a", "short"],
      ["Ada", "same"],
      ["root", "reserved"],
    ] as const)
      expect(await changeUsername(handle.db, ada, name, start)).toEqual({
        ok: false,
        problem,
      });
  });

  it("doesn't give a private profile's new name away", async () => {
    const ada = await account("ada");
    await changeUsername(handle.db, ada, "lovelace", start);
    await handle.db
      .update(users)
      .set({ profilePublic: false })
      .where(eq(users.id, ada.id));
    expect(await movedUsername(handle.db, "ada", null, later(1))).toBeNull();
    expect(await movedUsername(handle.db, "ada", ada.id, later(1))).toBe(
      "lovelace",
    );
  });
});
