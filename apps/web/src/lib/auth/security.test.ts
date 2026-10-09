import {
  emailCodes,
  mailMessages,
  openDatabase,
  passkeys,
  securityEvents,
  sessions,
  userIdentities,
  users,
  type DatabaseHandle,
  type User,
} from "@trilleo/db";
import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { purgeCodes } from "../mail/addresses";
import { createAccount, linkIdentity } from "./accounts";
import {
  NEW_DEVICE_DAYS,
  SECURITY_LOG_DAYS,
  isNewDevice,
  purgeSecurityEvents,
  recentEvents,
  recordSignIn,
} from "./activity";
import {
  UNDO_EMAIL_DAYS,
  afterEmailChange,
  undoEmailChange,
  undoTicket,
} from "./email-change";
import { createSession } from "./sessions";
import {
  MAX_PASSKEYS,
  addPasskey,
  listPasskeys,
  removePasskey,
  renamePasskey,
  signInWithPasskey,
} from "./passkeys";
import { FakeAuthenticator } from "./webauthn-testing";

const DAY_MS = 24 * 60 * 60 * 1000;
const start = new Date("2026-10-01T12:00:00Z");
const later = (days: number) => new Date(start.getTime() + days * DAY_MS);
const FIREFOX =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:140.0) Gecko/20100101 Firefox/140.0";
const SAFARI =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1";

const expected = {
  challenge: "challenge-0123456789abcdefghij",
  origin: "https://www.trilleo.net",
  rpId: "www.trilleo.net",
};

let handle: DatabaseHandle;
let ada: User;
beforeEach(async () => {
  handle = await openDatabase("memory://");
  ada = await createAccount(handle.db, {
    username: "ada",
    email: "ada@example.com",
    now: start,
  });
});
afterEach(async () => {
  await handle.close();
});

async function mail(kind: string) {
  return handle.db
    .select()
    .from(mailMessages)
    .where(eq(mailMessages.kind, kind));
}

describe("passkeys", () => {
  it("are added, sign in, renamed and removed", async () => {
    const authenticator = new FakeAuthenticator();
    const added = await addPasskey(
      handle.db,
      ada,
      authenticator.register(expected),
      { expected, userAgent: FIREFOX, now: start },
    );
    expect(added).toMatchObject({
      ok: true,
      passkey: { name: "Firefox on Windows", userId: ada.id },
    });

    const userHandle = Buffer.from(ada.id.replaceAll("-", ""), "hex").toString(
      "base64url",
    );
    const signedIn = await signInWithPasskey(
      handle.db,
      authenticator.assert(expected, userHandle),
      { expected, now: later(1) },
    );
    expect(signedIn).toMatchObject({ ok: true, user: { id: ada.id } });
    const [stored] = await listPasskeys(handle.db, ada.id);
    expect(stored?.lastUsedAt).toEqual(later(1));

    const id = authenticator.id.toString("base64url");
    expect(await renamePasskey(handle.db, ada.id, id, "  My   laptop ")).toBe(
      true,
    );
    expect((await listPasskeys(handle.db, ada.id))[0]?.name).toBe("My laptop");
    expect(
      await removePasskey(
        handle.db,
        "00000000-0000-4000-8000-000000000000",
        id,
      ),
    ).toBeNull();
    expect(await removePasskey(handle.db, ada.id, id)).toBe("My laptop");
    expect(
      await signInWithPasskey(handle.db, authenticator.assert(expected), {
        expected,
      }),
    ).toEqual({ ok: false, error: "unknown" });
  });

  it("refuse a forged answer, a passkey another account claims, and the blocked", async () => {
    const authenticator = new FakeAuthenticator();
    await addPasskey(handle.db, ada, authenticator.register(expected), {
      expected,
      userAgent: null,
    });
    expect(
      await signInWithPasskey(
        handle.db,
        authenticator.assert({ ...expected, origin: "https://evil.example" }),
        { expected },
      ),
    ).toEqual({ ok: false, error: "invalid" });
    // The user handle names another account.
    expect(
      await signInWithPasskey(
        handle.db,
        authenticator.assert(
          expected,
          Buffer.alloc(16, 7).toString("base64url"),
        ),
        { expected },
      ),
    ).toEqual({ ok: false, error: "invalid" });
    // The same passkey can't be added twice.
    expect(
      await addPasskey(handle.db, ada, authenticator.register(expected), {
        expected,
        userAgent: null,
      }),
    ).toEqual({ ok: false, error: "already-added" });

    await handle.db.update(users).set({ blockedAt: start });
    expect(
      await signInWithPasskey(handle.db, authenticator.assert(expected), {
        expected,
      }),
    ).toEqual({ ok: false, error: "not-allowed" });
  });

  it(`stop at ${String(MAX_PASSKEYS)} per account`, async () => {
    for (let i = 0; i < MAX_PASSKEYS; i++)
      await addPasskey(
        handle.db,
        ada,
        new FakeAuthenticator(-8).register(expected),
        { expected, userAgent: null },
      );
    expect(
      await addPasskey(
        handle.db,
        ada,
        new FakeAuthenticator(-8).register(expected),
        { expected, userAgent: null },
      ),
    ).toEqual({ ok: false, error: "too-many" });
  });
});

describe("sign-in alerts", () => {
  it("only for a browser the account hasn't used lately, never the first time", async () => {
    await recordSignIn(handle.db, ada, {
      method: "email",
      created: true,
      userAgent: FIREFOX,
      now: start,
    });
    // The same browser again: no alert.
    await recordSignIn(handle.db, ada, {
      method: "email",
      userAgent: FIREFOX,
      now: later(1),
    });
    expect(await mail("new-sign-in")).toHaveLength(0);

    // Another one: an email, with what and how.
    await recordSignIn(handle.db, ada, {
      method: "passkey",
      userAgent: SAFARI,
      now: later(2),
    });
    const [alert] = await mail("new-sign-in");
    expect(alert?.toAddress).toBe("ada@example.com");
    expect(alert?.textBody).toContain("Safari on iPhone");
    expect(alert?.textBody).toContain("a passkey");

    // The first browser after a long while counts as new again.
    expect(
      await isNewDevice(
        handle.db,
        ada.id,
        "Firefox on Windows",
        later(NEW_DEVICE_DAYS + 2),
      ),
    ).toBe(true);
  });

  it("stay quiet for accounts with no sign-ins on record yet", async () => {
    await recordSignIn(handle.db, ada, {
      method: "github",
      userAgent: SAFARI,
      now: start,
    });
    expect(await mail("new-sign-in")).toHaveLength(0);
  });

  it("respect the switch", async () => {
    await handle.db
      .update(users)
      .set({ emailNotifications: { security: false } })
      .where(eq(users.id, ada.id));
    const [quiet] = await handle.db
      .select()
      .from(users)
      .where(eq(users.id, ada.id));
    if (!quiet) throw new Error("no user");
    await recordSignIn(handle.db, quiet, {
      method: "email",
      created: true,
      userAgent: FIREFOX,
      now: start,
    });
    await recordSignIn(handle.db, quiet, {
      method: "email",
      userAgent: SAFARI,
      now: later(1),
    });
    expect(await mail("new-sign-in")).toHaveLength(0);
  });
});

describe("the security log", () => {
  it("lists the newest first and forgets after a year", async () => {
    await recordSignIn(handle.db, ada, {
      method: "email",
      created: true,
      userAgent: FIREFOX,
      now: start,
    });
    await recordSignIn(handle.db, ada, {
      method: "github",
      userAgent: FIREFOX,
      now: later(10),
    });
    expect(
      (await recentEvents(handle.db, ada.id)).map((event) => [
        event.kind,
        event.detail,
        event.device,
      ]),
    ).toEqual([
      ["sign-in", "github", "Firefox on Windows"],
      ["sign-up", "email", "Firefox on Windows"],
    ]);
    await purgeSecurityEvents(handle.db, later(SECURITY_LOG_DAYS + 5));
    expect(await recentEvents(handle.db, ada.id)).toHaveLength(1);
  });
});

describe("changing the address", () => {
  async function moved(now = start) {
    const [row] = await handle.db
      .update(users)
      .set({ email: "new@example.com" })
      .where(eq(users.id, ada.id))
      .returning();
    if (!row) throw new Error("no user");
    await afterEmailChange(handle.db, ada, "new@example.com", {
      userAgent: FIREFOX,
      now,
    });
    const [notice] = await mail("email-changed");
    const token =
      /\/account\/email\/undo\/([\w-]+)\//.exec(notice?.textBody ?? "")?.[1] ??
      "";
    return { notice, token };
  }

  it("tells the old address, with a link that undoes it", async () => {
    const { notice, token } = await moved();
    expect(notice?.toAddress).toBe("ada@example.com");
    expect(token).not.toBe("");
    expect(await undoTicket(handle.db, token, later(1))).toMatchObject({
      email: "ada@example.com",
    });

    // Since the change: a session, a passkey, a linked GitHub account.
    await createSession(handle.db, ada.id, later(1));
    const authenticator = new FakeAuthenticator();
    await addPasskey(handle.db, ada, authenticator.register(expected), {
      expected,
      userAgent: null,
      now: later(1),
    });
    await linkIdentity(
      handle.db,
      ada.id,
      {
        provider: "github",
        id: "99",
        login: "intruder",
        name: null,
        verifiedEmail: null,
      },
      later(1),
    );

    expect(await undoEmailChange(handle.db, token, later(2))).toEqual({
      ok: true,
      email: "ada@example.com",
    });
    const [row] = await handle.db
      .select()
      .from(users)
      .where(eq(users.id, ada.id));
    expect(row).toMatchObject({ email: "ada@example.com", githubId: null });
    expect(await handle.db.select().from(sessions)).toEqual([]);
    expect(await handle.db.select().from(passkeys)).toEqual([]);
    expect(await handle.db.select().from(userIdentities)).toEqual([]);
    const kinds = (await handle.db.select().from(securityEvents)).map(
      (event) => event.kind,
    );
    expect(kinds).toEqual(["email-changed", "email-restored"]);
    // Once only.
    expect(await undoEmailChange(handle.db, token, later(3))).toEqual({
      ok: false,
      error: "expired",
    });
  });

  it("can't undo after the window, or onto an address someone took", async () => {
    const { token } = await moved();
    expect(
      await undoEmailChange(handle.db, token, later(UNDO_EMAIL_DAYS + 1)),
    ).toEqual({ ok: false, error: "expired" });

    await handle.db.delete(mailMessages);
    const second = await moved(later(1));
    await createAccount(handle.db, {
      username: "taker",
      email: "ada@example.com",
    }).catch(() => undefined);
    // ada@example.com is free now (Ada moved), so someone took it.
    expect(await undoEmailChange(handle.db, second.token, later(2))).toEqual({
      ok: false,
      error: "taken",
    });
  });

  it("keeps undo links past the usual code purge, until they expire", async () => {
    await moved();
    await purgeCodes(handle.db, later(3));
    expect(
      await handle.db
        .select()
        .from(emailCodes)
        .where(eq(emailCodes.purpose, "undo-email")),
    ).toHaveLength(1);
    await purgeCodes(handle.db, later(UNDO_EMAIL_DAYS + 1));
    expect(await handle.db.select().from(emailCodes)).toEqual([]);
  });
});
