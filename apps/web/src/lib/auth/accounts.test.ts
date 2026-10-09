import {
  openDatabase,
  userIdentities,
  users,
  type DatabaseHandle,
} from "@trilleo/db";
import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  adoptVerifiedEmail,
  createAccount,
  identitiesOf,
  linkIdentity,
  unlinkIdentity,
  upsertGitHubUser,
  type ProviderProfile,
} from "./accounts";
import { accountMigration, adminAdvice } from "./migration";
import { emailSetupRedirect } from "./setup";

let handle: DatabaseHandle;
beforeEach(async () => {
  handle = await openDatabase("memory://");
});
afterEach(async () => {
  await handle.close();
});

const github = (id: number, login: string): ProviderProfile => ({
  provider: "github",
  id: String(id),
  login,
  name: null,
  verifiedEmail: null,
});

describe("linked accounts", () => {
  it("links, refuses a second GitHub, and unlinks", async () => {
    const ada = await createAccount(handle.db, {
      username: "ada",
      email: "ada@example.com",
    });
    expect(await linkIdentity(handle.db, ada.id, github(5, "ada-gh"))).toEqual({
      ok: true,
    });
    expect(await linkIdentity(handle.db, ada.id, github(6, "other"))).toEqual({
      ok: false,
      error: "already-linked",
    });
    expect(await identitiesOf(handle.db, ada.id)).toHaveLength(1);

    expect(await unlinkIdentity(handle.db, ada, "github")).toEqual({
      ok: true,
    });
    const [row] = await handle.db
      .select()
      .from(users)
      .where(eq(users.id, ada.id));
    expect(row?.githubId).toBeNull();
    expect(await unlinkIdentity(handle.db, ada, "github")).toEqual({
      ok: false,
      error: "not-linked",
    });
  });

  it("never unlinks the only way into an account without an address", async () => {
    const old = await upsertGitHubUser(handle.db, {
      id: 7,
      login: "old",
      name: null,
    });
    expect(old.email).toBeNull();
    expect(await unlinkIdentity(handle.db, old, "github")).toEqual({
      ok: false,
      error: "last-way-in",
    });
    expect(await handle.db.select().from(userIdentities)).toHaveLength(1);
  });

  it("adopts a verified address only when it's free", async () => {
    const old = await upsertGitHubUser(handle.db, {
      id: 7,
      login: "old",
      name: null,
    });
    await createAccount(handle.db, {
      username: "taken",
      email: "taken@example.com",
    });
    expect(
      await adoptVerifiedEmail(handle.db, old, "taken@example.com"),
    ).toBeNull();
    expect(await adoptVerifiedEmail(handle.db, old, null)).toBeNull();
    const moved = await adoptVerifiedEmail(handle.db, old, "old@example.com");
    expect(moved).toMatchObject({ email: "old@example.com" });
    // Only once: an account with an address keeps it.
    if (moved)
      expect(
        await adoptVerifiedEmail(handle.db, moved, "new@example.com"),
      ).toBeNull();
  });
});

describe("emailSetupRedirect", () => {
  const url = (path: string) => new URL(path, "https://www.trilleo.net");

  it("sends accounts without an address to add one, then back", () => {
    expect(
      emailSetupRedirect({ email: null }, "GET", url("/writing/?q=x")),
    ).toBe("/account/email/?setup=1&next=%2Fwriting%2F%3Fq%3Dx");
  });

  it("leaves everyone else, APIs, posts and the way out alone", () => {
    expect(emailSetupRedirect(null, "GET", url("/writing/"))).toBeNull();
    expect(
      emailSetupRedirect({ email: "a@example.com" }, "GET", url("/writing/")),
    ).toBeNull();
    for (const path of [
      "/account/email/",
      "/api/tools/notes/data",
      "/auth/logout",
      "/legal/privacy/",
      "/_server-islands/HeaderAccount",
    ])
      expect(emailSetupRedirect({ email: null }, "GET", url(path))).toBeNull();
    expect(
      emailSetupRedirect({ email: null }, "POST", url("/comments")),
    ).toBeNull();
  });
});

describe("accountMigration", () => {
  it("counts who has moved over and lists who hasn't", async () => {
    await upsertGitHubUser(handle.db, { id: 1, login: "first", name: null });
    await upsertGitHubUser(handle.db, {
      id: 2,
      login: "second",
      name: null,
      email: "second@example.com",
    });
    const blocked = await upsertGitHubUser(handle.db, {
      id: 3,
      login: "blocked",
      name: null,
    });
    await handle.db
      .update(users)
      .set({ blockedAt: new Date() })
      .where(eq(users.id, blocked.id));

    const config = { adminEmails: new Set(["second@example.com"]) };
    const report = await accountMigration(
      handle.db,
      { email: "second@example.com" },
      config,
    );
    expect(report).toMatchObject({
      total: 3,
      withEmail: 1,
      waiting: 1,
      recent: [{ username: "first" }],
      admin: null,
    });
  });

  it("tells the admin what's left for their own account", () => {
    const config = { adminEmails: new Set(["me@example.com"]) };
    expect(adminAdvice({ email: null }, config)).toBe("add-email");
    expect(adminAdvice({ email: "other@example.com" }, config)).toBe(
      "set-admin-emails",
    );
    expect(adminAdvice({ email: "me@example.com" }, config)).toBeNull();
  });
});
