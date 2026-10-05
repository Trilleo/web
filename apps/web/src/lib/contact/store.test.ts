import {
  contactMessages,
  openDatabase,
  users,
  type DatabaseHandle,
  type User,
} from "@trilleo/db";
import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { upsertGitHubUser } from "../auth/sessions";
import { exportUserData } from "../profile/store";
import {
  CONTACT_LIMITS,
  CONTACT_RETENTION_DAYS,
  VisitorLimiter,
  checkContact,
  deleteMessage,
  inboxCounts,
  listMessages,
  purgeOldMessages,
  sendContactMessage,
  setMessageStatus,
  type ContactInput,
} from "./store";

const start = new Date("2026-01-01T12:00:00Z");
const minutes = (n: number) => new Date(start.getTime() + n * 60_000);

const valid: ContactInput = {
  topic: "general",
  name: "  Ada   Lovelace ",
  email: "ada@example.com",
  body: "Hello there, a question about the site.",
  website: "",
};

let handle: DatabaseHandle;
let alice: User;

beforeEach(async () => {
  handle = await openDatabase("memory://");
  alice = await upsertGitHubUser(handle.db, {
    id: 2,
    login: "alice",
    name: "Alice",
  });
});

afterEach(async () => {
  await handle.close();
});

describe("checkContact", () => {
  it("trims and accepts a good message", () => {
    const result = checkContact({ ...valid, body: " Hi\r\nthere, friend \n" });
    expect(result).toEqual({
      ok: true,
      draft: {
        topic: "general",
        name: "Ada Lovelace",
        email: "ada@example.com",
        body: "Hi\nthere, friend",
      },
    });
  });

  it("treats the email as optional", () => {
    const result = checkContact({ ...valid, email: "  " });
    expect(result.ok && result.draft.email).toBeNull();
  });

  it("says what's wrong, field by field", () => {
    const result = checkContact({
      topic: "lottery",
      name: "",
      email: "not an email",
      body: "short",
      website: "",
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(Object.keys(result.errors).sort()).toEqual([
      "body",
      "email",
      "name",
      "topic",
    ]);
  });

  it("refuses very long messages", () => {
    const result = checkContact({ ...valid, body: "x".repeat(5001) });
    expect(result.ok).toBe(false);
  });
});

describe("VisitorLimiter", () => {
  it("allows a few an hour, then refuses until the hour has passed", () => {
    const limiter = new VisitorLimiter();
    const key = VisitorLimiter.key("203.0.113.9");
    for (let i = 0; i < CONTACT_LIMITS.hourly; i++)
      expect(limiter.take(key, minutes(i))).toBe(true);
    expect(limiter.take(key, minutes(10))).toBe(false);
    expect(limiter.take(VisitorLimiter.key("203.0.113.10"), minutes(10))).toBe(
      true,
    );
    expect(limiter.take(key, minutes(61))).toBe(true);
  });

  it("caps the day too", () => {
    const limiter = new VisitorLimiter();
    const key = VisitorLimiter.key("203.0.113.9");
    let sent = 0;
    for (let hour = 0; hour < 24; hour++)
      for (let i = 0; i < CONTACT_LIMITS.hourly; i++)
        if (limiter.take(key, minutes(hour * 60 + i))) sent++;
    expect(sent).toBe(CONTACT_LIMITS.daily);
  });

  it("doesn't keep the address itself", () => {
    expect(VisitorLimiter.key("203.0.113.9")).not.toContain("203");
  });
});

describe("sendContactMessage", () => {
  it("saves a signed-out message without an account", async () => {
    const result = await sendContactMessage(
      handle.db,
      valid,
      { user: null, ip: "198.51.100.1" },
      start,
      new VisitorLimiter(),
    );
    expect(result.ok).toBe(true);
    const rows = await handle.db.select().from(contactMessages);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      userId: null,
      name: "Ada Lovelace",
      status: "new",
    });
  });

  it("links a signed-in sender's account, and limits them by it", async () => {
    for (let i = 0; i < CONTACT_LIMITS.hourly; i++) {
      const result = await sendContactMessage(
        handle.db,
        valid,
        { user: alice, ip: "" },
        minutes(i),
      );
      expect(result.ok).toBe(true);
    }
    const refused = await sendContactMessage(
      handle.db,
      valid,
      { user: alice, ip: "" },
      minutes(5),
    );
    expect(refused).toEqual({ ok: false, error: "too-many" });
    const rows = await handle.db
      .select()
      .from(contactMessages)
      .where(eq(contactMessages.userId, alice.id));
    expect(rows).toHaveLength(CONTACT_LIMITS.hourly);
  });

  it("drops a message that filled the honeypot, but says it was sent", async () => {
    const result = await sendContactMessage(
      handle.db,
      { ...valid, website: "https://spam.example" },
      { user: null, ip: "198.51.100.1" },
      start,
      new VisitorLimiter(),
    );
    expect(result).toEqual({ ok: true, message: null });
    expect(await handle.db.select().from(contactMessages)).toHaveLength(0);
  });

  it("returns field errors for a bad message", async () => {
    const result = await sendContactMessage(
      handle.db,
      { ...valid, body: "" },
      { user: null, ip: "198.51.100.1" },
      start,
      new VisitorLimiter(),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe("invalid");
  });

  it("closes to signed-out senders after a busy day", async () => {
    await handle.db.insert(contactMessages).values(
      Array.from({ length: CONTACT_LIMITS.anonymousDaily }, (_, i) => ({
        topic: "general",
        name: `Bot ${String(i)}`,
        body: "Buy things now please.",
        createdAt: minutes(-i),
      })),
    );
    const result = await sendContactMessage(
      handle.db,
      valid,
      { user: null, ip: "198.51.100.1" },
      start,
      new VisitorLimiter(),
    );
    expect(result).toEqual({ ok: false, error: "busy" });
  });
});

describe("the inbox", () => {
  it("lists by status, moves and deletes messages", async () => {
    await sendContactMessage(handle.db, valid, { user: alice, ip: "" }, start);
    const [message] = await listMessages(handle.db, "new");
    expect(message?.login).toBe("alice");
    if (!message) return;

    expect(await setMessageStatus(handle.db, message.id, "archived")).toBe(
      true,
    );
    expect(await inboxCounts(handle.db)).toEqual({
      new: 0,
      read: 0,
      archived: 1,
    });
    expect(await deleteMessage(handle.db, message.id)).toBe(true);
    expect(await deleteMessage(handle.db, message.id)).toBe(false);
    expect(await setMessageStatus(handle.db, message.id, "read")).toBe(false);
  });

  it("forgets messages after the retention period", async () => {
    await handle.db.insert(contactMessages).values([
      {
        topic: "general",
        name: "Old",
        body: "From long ago.",
        createdAt: new Date(
          start.getTime() - (CONTACT_RETENTION_DAYS + 1) * 86_400_000,
        ),
      },
      { topic: "general", name: "New", body: "From today.", createdAt: start },
    ]);
    expect(await purgeOldMessages(handle.db, start)).toBe(1);
    const left = await handle.db.select().from(contactMessages);
    expect(left.map((row) => row.name)).toEqual(["New"]);
  });
});

describe("accounts", () => {
  it("puts a sender's messages in their export, and deletes them with the account", async () => {
    await sendContactMessage(handle.db, valid, { user: alice, ip: "" }, start);
    const data = await exportUserData(handle.db, alice.id, start);
    expect(data?.contactMessages).toHaveLength(1);
    expect(data?.contactMessages[0]?.body).toBe(valid.body);

    await handle.db.delete(users).where(eq(users.id, alice.id));
    expect(await handle.db.select().from(contactMessages)).toHaveLength(0);
  });
});
