import {
  adminAlerts,
  openDatabase,
  mailMessages,
  posts,
  users,
  type Database,
  type DatabaseHandle,
  type MailMessage,
  type User,
} from "@trilleo/db";
import { CaptureDriver } from "@trilleo/mail/server";
import { RecordingDriver } from "@trilleo/mail/testing";
import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { upsertGitHubUser } from "../auth/accounts";
import { createComment, moderateComment } from "../comments/store";
import {
  CODE_LIMITS,
  CODE_RETENTION_DAYS,
  purgeCodes,
  requestEmailCode,
  unsubscribe,
  userForToken,
  verifyEmailCode,
} from "./addresses";
import { ADMIN_ALERT_GAP_MS, alertAdmin, flushAdminAlerts } from "./alerts";
import { resolveMailConfig, type MailConfig } from "./config";
import {
  MAIL_RETENTION_DAYS,
  MAX_ATTEMPTS,
  cancelMail,
  deliverDue,
  deliverMessage,
  getMail,
  purgeMail,
  queueMail,
  retryMail,
  type MailDeps,
} from "./outbox";
import { notifyFileChange, notifyProjectVisibility } from "./notify";

const start = new Date("2026-03-01T12:00:00Z");
const minutes = (n: number) => new Date(start.getTime() + n * 60_000);

const CONFIG: MailConfig = resolveMailConfig(
  {
    SMTP_HOST: "smtp.test",
    SMTP_USER: "u",
    SMTP_PASSWORD: "p",
    MAIL_REPLY_TO: "owner@example.com",
  },
  false,
);

let handle: DatabaseHandle;
let db: Database;
let ada: User;
let bob: User;
let driver: RecordingDriver;
let clock: Date;

function deps(overrides: Partial<MailDeps> = {}): MailDeps {
  return { db, driver, config: CONFIG, now: () => clock, ...overrides };
}

async function withAddress(user: User, email: string): Promise<User> {
  const [updated] = await db
    .update(users)
    .set({
      email,
      emailVerifiedAt: start,
      emailToken: `token-${user.username}-0123456789abcdef`,
    })
    .where(eq(users.id, user.id))
    .returning();
  if (!updated) throw new Error("no user");
  return updated;
}

async function fresh(user: User): Promise<User> {
  const [row] = await db.select().from(users).where(eq(users.id, user.id));
  if (!row) throw new Error("no user");
  return row;
}

async function allMail(): Promise<MailMessage[]> {
  return db.select().from(mailMessages).orderBy(mailMessages.id);
}

function codeIn(message: MailMessage | undefined): string {
  const match = /\b(\d{6})\b/.exec(message?.textBody ?? "");
  if (!match?.[1]) throw new Error("No code in the message");
  return match[1];
}

beforeEach(async () => {
  handle = await openDatabase("memory://");
  db = handle.db;
  ada = await upsertGitHubUser(db, { id: 10, login: "ada", name: "Ada" });
  bob = await upsertGitHubUser(db, { id: 11, login: "bob", name: null });
  driver = new RecordingDriver();
  clock = start;
});

afterEach(async () => {
  await handle.close();
});

describe("resolveMailConfig", () => {
  it("uses SMTP when it's fully set up", () => {
    expect(CONFIG.transport).toEqual({
      kind: "smtp",
      smtp: { host: "smtp.test", port: 465, user: "u", password: "p" },
    });
    expect(CONFIG.available).toBe(true);
    expect(CONFIG.replyTo).toBe("owner@example.com");
    expect(CONFIG.from).toBe(
      '"Trilleo Network" <no-reply@automail.trilleo.net>',
    );
  });

  it("captures in dev and e2e, and is off (but explains why) otherwise", () => {
    expect(resolveMailConfig({}, true)).toMatchObject({
      transport: { kind: "capture" },
      available: true,
      problem: null,
    });
    expect(resolveMailConfig({ MAIL_CAPTURE: "1" }, false).available).toBe(
      true,
    );
    const off = resolveMailConfig({}, false);
    expect(off.available).toBe(false);
    expect(off.problem).toContain("SMTP_HOST");
  });

  it("refuses half a setup", () => {
    const half = resolveMailConfig({ SMTP_HOST: "smtp.test" }, false);
    expect(half.transport.kind).toBe("capture");
    expect(half.available).toBe(false);
    expect(half.problem).toContain("SMTP_USER");
    expect(
      resolveMailConfig(
        { SMTP_HOST: "h", SMTP_USER: "u", SMTP_PASSWORD: "p", SMTP_PORT: "x" },
        false,
      ).problem,
    ).toContain("SMTP_PORT");
    expect(resolveMailConfig({ MAIL_FROM: "nonsense" }, true).available).toBe(
      false,
    );
  });

  it("reads the admin list", () => {
    expect(
      resolveMailConfig(
        { MAIL_ADMIN_TO: "A@example.com, nope, b@example.com" },
        true,
      ).adminTo,
    ).toEqual(["a@example.com", "b@example.com"]);
  });
});

describe("the outbox", () => {
  const message = {
    kind: "test" as const,
    to: "ada@example.com",
    subject: "Hello",
    text: "Hi",
    html: "<p>Hi</p>",
  };

  it("sends what's due and records it", async () => {
    const queued = await queueMail(db, message, start);
    expect(queued.status).toBe("queued");
    expect(await deliverDue(deps())).toBe(1);
    expect(driver.sent).toHaveLength(1);
    expect(driver.sent[0]).toMatchObject({
      to: "ada@example.com",
      subject: "Hello",
      from: CONFIG.from,
    });
    const sent = await getMail(db, queued.id);
    expect(sent).toMatchObject({ status: "sent", attempts: 1, textBody: "Hi" });
    expect(sent?.providerMessageId).toBe("<1@test>");
    // Nothing twice.
    expect(await deliverDue(deps())).toBe(0);
  });

  it("retries with backoff, then gives up", async () => {
    const queued = await queueMail(db, message, start);
    for (let i = 0; i < MAX_ATTEMPTS; i++) driver.failNext("421 try later");
    await deliverDue(deps());
    let row = await getMail(db, queued.id);
    expect(row).toMatchObject({
      status: "queued",
      attempts: 1,
      lastError: "421 try later",
    });
    expect(row?.nextAttemptAt).toEqual(minutes(1));
    // Not due yet.
    clock = minutes(0.5);
    expect(await deliverDue(deps())).toBe(0);
    expect((await getMail(db, queued.id))?.attempts).toBe(1);
    for (let attempt = 2; attempt <= MAX_ATTEMPTS; attempt++) {
      clock = new Date((row?.nextAttemptAt ?? start).getTime());
      await deliverDue(deps());
      row = await getMail(db, queued.id);
    }
    expect(row).toMatchObject({ status: "failed", attempts: MAX_ATTEMPTS });
    expect(driver.sent).toHaveLength(0);
  });

  it("gives up at once on a permanent refusal", async () => {
    const queued = await queueMail(db, message, start);
    driver.failNext("550 no such user", true);
    await deliverDue(deps());
    expect(await getMail(db, queued.id)).toMatchObject({
      status: "failed",
      attempts: 1,
    });
  });

  it("clears a code's body once it has been sent, but keeps captured ones", async () => {
    const code = await queueMail(
      db,
      { ...message, kind: "email-code", text: "123456" },
      start,
    );
    await deliverMessage(deps(), code.id);
    expect(await getMail(db, code.id)).toMatchObject({
      status: "sent",
      textBody: null,
      htmlBody: null,
      bodyPurgedAt: start,
    });
    const captured = await queueMail(
      db,
      { ...message, kind: "email-code", text: "654321" },
      start,
    );
    await deliverMessage(deps({ driver: new CaptureDriver() }), captured.id);
    expect(await getMail(db, captured.id)).toMatchObject({
      status: "captured",
      textBody: "654321",
    });
  });

  it("notes why a captured message didn't go when mail is off", async () => {
    const off = resolveMailConfig({}, false);
    const queued = await queueMail(db, message, start);
    await deliverMessage(
      deps({ driver: new CaptureDriver(), config: off }),
      queued.id,
    );
    expect((await getMail(db, queued.id))?.lastError).toContain("SMTP_HOST");
  });

  it("purges bodies, then rows", async () => {
    const old = await queueMail(db, message, start);
    await deliverDue(deps());
    const waiting = await queueMail(db, message, start);
    const later = new Date(
      start.getTime() + (MAIL_RETENTION_DAYS + 1) * 86_400_000,
    );
    expect(await purgeMail(db, later)).toEqual({ cleared: 1, deleted: 0 });
    expect(await getMail(db, old.id)).toMatchObject({
      textBody: null,
      htmlBody: null,
    });
    // Still queued: kept until it goes.
    expect((await getMail(db, waiting.id))?.textBody).toBe("Hi");
    const muchLater = new Date(start.getTime() + 200 * 86_400_000);
    expect((await purgeMail(db, muchLater)).deleted).toBe(2);
  });

  it("lets the admin cancel and retry", async () => {
    const queued = await queueMail(db, message, start);
    expect(await cancelMail(db, queued.id)).toBe(true);
    expect(await deliverDue(deps())).toBe(0);
    expect(await retryMail(db, queued.id, start)).toBe(true);
    expect(await deliverDue(deps())).toBe(1);
    expect(await retryMail(db, queued.id, start)).toBe(false);
  });

  it("refuses header injection when sending", async () => {
    const queued = await queueMail(
      db,
      { ...message, subject: "Hi\r\nBcc: x@y.z" },
      start,
    );
    await deliverDue(deps());
    expect(await getMail(db, queued.id)).toMatchObject({ status: "failed" });
    expect(driver.sent).toHaveLength(0);
  });
});

describe("email addresses", () => {
  const available = { available: true, now: start };

  it("sends a code and proves the address with it", async () => {
    const result = await requestEmailCode(
      db,
      ada,
      " Ada@Example.com ",
      available,
    );
    expect(result).toMatchObject({ ok: true, email: "ada@example.com" });
    const [sent] = await allMail();
    expect(sent).toMatchObject({
      kind: "email-code",
      toAddress: "ada@example.com",
      userId: ada.id,
    });
    expect(sent?.subject).toMatch(/^\d{6} is your Trilleo Network code$/);
    const code = codeIn(sent);
    expect(
      await verifyEmailCode(
        db,
        ada,
        "000000" === code ? "111111" : "000000",
        start,
      ),
    ).toEqual({
      ok: false,
      error: "wrong",
    });
    expect(
      await verifyEmailCode(
        db,
        ada,
        `${code.slice(0, 3)} ${code.slice(3)}`,
        start,
      ),
    ).toEqual({
      ok: true,
      email: "ada@example.com",
    });
    const [row] = await db.select().from(users).where(eq(users.id, ada.id));
    expect(row).toMatchObject({
      email: "ada@example.com",
      emailVerifiedAt: start,
    });
    expect(row?.emailToken).toMatch(/^[A-Za-z0-9_-]{43}$/);
    // Used once.
    expect((await verifyEmailCode(db, ada, code, start)).ok).toBe(false);
  });

  it("refuses bad input, and says when mail can't work", async () => {
    expect(await requestEmailCode(db, ada, "nope", available)).toEqual({
      ok: false,
      error: "invalid",
    });
    expect(
      await requestEmailCode(db, ada, "ada@example.com", {
        available: false,
        now: start,
      }),
    ).toEqual({ ok: false, error: "unavailable" });
    const withEmail = await withAddress(ada, "ada@example.com");
    expect(
      await requestEmailCode(db, withEmail, "ADA@example.com", available),
    ).toEqual({
      ok: false,
      error: "same",
    });
  });

  it("limits how often codes are sent", async () => {
    expect(
      (await requestEmailCode(db, ada, "a@example.com", available)).ok,
    ).toBe(true);
    expect(await requestEmailCode(db, ada, "a@example.com", available)).toEqual(
      { ok: false, error: "wait" },
    );
    for (let i = 1; i < CODE_LIMITS.hourly; i++) {
      const now = minutes(i * 2);
      expect(
        (
          await requestEmailCode(db, ada, `a${String(i)}@example.com`, {
            available: true,
            now,
          })
        ).ok,
      ).toBe(true);
    }
    expect(
      await requestEmailCode(db, ada, "z@example.com", {
        available: true,
        now: minutes(20),
      }),
    ).toEqual({ ok: false, error: "too-many" });
    // One address can't be pestered from many accounts either.
    for (let i = 0; i < CODE_LIMITS.perAddressDaily - 1; i++) {
      const person = await upsertGitHubUser(db, {
        id: 100 + i,
        login: `p${String(i)}`,
        name: null,
      });
      expect(
        (await requestEmailCode(db, person, "a@example.com", available)).ok,
      ).toBe(true);
    }
    expect(await requestEmailCode(db, bob, "a@example.com", available)).toEqual(
      { ok: false, error: "too-many" },
    );
  });

  it("only the newest code works, for a while, for a few guesses", async () => {
    await requestEmailCode(db, ada, "a@example.com", available);
    const first = codeIn((await allMail())[0]);
    await requestEmailCode(db, ada, "b@example.com", {
      available: true,
      now: minutes(2),
    });
    const second = codeIn((await allMail())[1]);
    if (first !== second)
      expect((await verifyEmailCode(db, ada, first, minutes(3))).ok).toBe(
        false,
      );
    expect((await verifyEmailCode(db, ada, second, minutes(2 + 16))).ok).toBe(
      false,
    );

    await requestEmailCode(db, ada, "c@example.com", {
      available: true,
      now: minutes(30),
    });
    const third = codeIn((await allMail())[2]);
    const wrong = third === "999999" ? "999998" : "999999";
    for (let i = 0; i < CODE_LIMITS.attempts; i++)
      await verifyEmailCode(db, ada, wrong, minutes(31));
    expect(await verifyEmailCode(db, ada, third, minutes(31))).toEqual({
      ok: false,
      error: "none",
    });
  });

  it("forgets codes after a couple of days", async () => {
    await requestEmailCode(db, ada, "a@example.com", available);
    expect(await purgeCodes(db, minutes(60))).toBe(0);
    const later = new Date(
      start.getTime() + (CODE_RETENTION_DAYS * 24 + 1) * 3_600_000,
    );
    expect(await purgeCodes(db, later)).toBe(1);
  });

  it("an address belongs to one account", async () => {
    await withAddress(bob, "shared@example.com");
    await requestEmailCode(db, ada, "shared@example.com", available);
    const code = codeIn((await allMail())[0]);
    expect(await verifyEmailCode(db, ada, code, start)).toEqual({
      ok: false,
      error: "taken",
    });
  });

  it("unsubscribes by link, one topic or all", async () => {
    const withEmail = await withAddress(ada, "ada@example.com");
    const token = withEmail.emailToken ?? "";
    expect(await userForToken(db, "short")).toBeUndefined();
    expect(await unsubscribe(db, token, "replies")).toMatchObject({
      ok: true,
      topic: "replies",
    });
    let [row] = await db.select().from(users).where(eq(users.id, ada.id));
    expect(row?.emailNotifications).toMatchObject({
      replies: false,
      reviews: true,
    });
    expect(await unsubscribe(db, token, "everything")).toMatchObject({
      ok: true,
      topic: "all",
    });
    [row] = await db.select().from(users).where(eq(users.id, ada.id));
    expect(row?.emailNotifications).toEqual({
      security: false,
      replies: false,
      comments: false,
      reviews: false,
      admin: false,
    });
    expect((await unsubscribe(db, "x".repeat(40), "replies")).ok).toBe(false);
  });
});

describe("notifications", () => {
  beforeEach(async () => {
    await db.insert(posts).values({
      slug: "hello",
      title: "Hello world",
      body: "Hi",
      status: "published",
      publishedAt: new Date("2026-01-01T00:00:00Z"),
    });
  });

  it("tells the thread about a reply, but not its author or those who opted out", async () => {
    ada = await withAddress(ada, "ada@example.com");
    bob = await withAddress(bob, "bob@example.com");
    const carol = await withAddress(
      await upsertGitHubUser(db, { id: 12, login: "carol", name: "Carol" }),
      "carol@example.com",
    );
    await db.update(users).set({ trustedAt: start });
    ada = await fresh(ada);
    bob = await fresh(bob);
    const root = await createComment(db, {
      author: ada,
      isAdmin: false,
      postSlug: "hello",
      parentId: null,
      body: "First!",
      now: start,
    });
    if (!root.ok) throw new Error("no root");
    await createComment(db, {
      author: await fresh(carol),
      isAdmin: false,
      postSlug: "hello",
      parentId: root.comment.id,
      body: "Me too",
      now: start,
    });
    await db
      .update(users)
      .set({ emailNotifications: { replies: false } })
      .where(eq(users.id, carol.id));
    await createComment(db, {
      author: bob,
      isAdmin: false,
      postSlug: "hello",
      parentId: root.comment.id,
      body: "Welcome, Ada",
      now: start,
    });

    const sent = (await allMail()).filter((m) => m.kind === "comment-reply");
    // Carol's reply told Ada; Bob's told Ada again, but not Carol (off) or Bob (his own).
    expect(sent.map((m) => m.toAddress)).toEqual([
      "ada@example.com",
      "ada@example.com",
    ]);
    const last = sent[1];
    expect(last?.subject).toBe("New reply on “Hello world”");
    expect(last?.textBody).toContain("> Welcome, Ada");
    expect(last?.textBody).toContain(
      "https://www.trilleo.net/writing/hello/#comment-",
    );
    expect(last?.headers["List-Unsubscribe"]).toBe(
      `<https://www.trilleo.net/mail/unsubscribe/${ada.emailToken ?? ""}/?topic=replies>`,
    );
    expect(last?.headers["List-Unsubscribe-Post"]).toBe(
      "List-Unsubscribe=One-Click",
    );
  });

  it("waits for approval before telling anyone, and tells the author it's live", async () => {
    ada = await withAddress(ada, "ada@example.com");
    bob = await withAddress(bob, "bob@example.com");
    await db
      .update(users)
      .set({ trustedAt: start })
      .where(eq(users.id, ada.id));
    ada = await fresh(ada);
    const root = await createComment(db, {
      author: ada,
      isAdmin: false,
      postSlug: "hello",
      parentId: null,
      body: "First!",
      now: start,
    });
    if (!root.ok) throw new Error("no root");
    const reply = await createComment(db, {
      author: bob,
      isAdmin: false,
      postSlug: "hello",
      parentId: root.comment.id,
      body: "Pending reply",
      now: start,
    });
    if (!reply.ok) throw new Error("no reply");
    expect((await allMail()).length).toBe(0);
    // A newcomer's comment waits: the admin hears about it.
    const [alert] = await db.select().from(adminAlerts);
    expect(alert).toMatchObject({ kind: "comment", path: "/admin#moderation" });

    await moderateComment(db, reply.comment.id, "approve", start);
    const sent = await allMail();
    expect(sent.map((m) => [m.kind, m.toAddress])).toEqual([
      ["comment-review", "bob@example.com"],
      ["comment-reply", "ada@example.com"],
    ]);
    await moderateComment(db, reply.comment.id, "hide", start);
    expect((await allMail()).at(-1)?.subject).toBe(
      "Your comment on “Hello world” was hidden",
    );
  });

  it("nobody without a proved address gets anything", async () => {
    await db.update(users).set({ trustedAt: start });
    ada = await fresh(ada);
    bob = await fresh(bob);
    const root = await createComment(db, {
      author: ada,
      isAdmin: false,
      postSlug: "hello",
      parentId: null,
      body: "First!",
      now: start,
    });
    if (!root.ok) throw new Error("no root");
    await createComment(db, {
      author: bob,
      isAdmin: false,
      postSlug: "hello",
      parentId: root.comment.id,
      body: "Hi",
      now: start,
    });
    expect(await allMail()).toHaveLength(0);
  });

  it("writes file decisions, quiet about the uploader's own actions", async () => {
    ada = await withAddress(ada, "ada@example.com");
    const file = {
      id: "file1",
      ownerId: ada.id,
      name: "castle.zip",
    } as Parameters<typeof notifyFileChange>[1];
    expect(
      await notifyFileChange(
        db,
        file,
        {
          action: "reject",
          from: "pending_review",
          to: "rejected",
          reason: "Not yours",
          actorId: bob.id,
        },
        start,
      ),
    ).toBe(true);
    expect(
      await notifyFileChange(
        db,
        file,
        {
          action: "delete",
          from: "published",
          to: "deleted",
          reason: null,
          actorId: ada.id,
        },
        start,
      ),
    ).toBe(false);
    expect(
      await notifyFileChange(
        db,
        file,
        {
          action: "processed",
          from: "processing",
          to: "published",
          reason: null,
          actorId: null,
        },
        start,
      ),
    ).toBe(false);
    const [sent] = await allMail();
    expect(sent?.subject).toBe("Your file was refused: castle.zip");
    expect(sent?.textBody).toContain("Why: Not yours");
    expect(sent?.textBody).toContain("https://www.trilleo.net/account/files/");
  });

  it("tells creators when a project is hidden and shown again", async () => {
    ada = await withAddress(ada, "ada@example.com");
    const project = {
      id: 7,
      ownerId: ada.id,
      name: "Sky Castle",
      type: "build",
      slug: "sky-castle",
    } as Parameters<typeof notifyProjectVisibility>[1];
    await notifyProjectVisibility(
      db,
      project,
      "Copied from someone else",
      start,
    );
    await notifyProjectVisibility(db, project, null, start);
    const sent = await allMail();
    expect(sent.map((m) => m.subject)).toEqual([
      "“Sky Castle” is hidden",
      "“Sky Castle” is visible again",
    ]);
    expect(sent[0]?.textBody).toContain("> Copied from someone else");
    expect(sent[1]?.textBody).toContain(
      "https://www.trilleo.net/minecraft/builds/sky-castle/",
    );
  });

  it("skips blocked accounts", async () => {
    ada = await withAddress(ada, "ada@example.com");
    await db
      .update(users)
      .set({ blockedAt: start })
      .where(eq(users.id, ada.id));
    const [blocked] = await db.select().from(users).where(eq(users.id, ada.id));
    const project = {
      id: 7,
      ownerId: blocked?.id ?? "",
      name: "X",
      type: "build",
      slug: "x",
    } as Parameters<typeof notifyProjectVisibility>[1];
    expect(await notifyProjectVisibility(db, project, "Nope", start)).toBe(
      false,
    );
  });
});

describe("admin alerts", () => {
  const ADMIN_ID = 10;

  it("bundles alerts into one email, at most one per gap", async () => {
    ada = await withAddress(ada, "ada@example.com");
    await alertAdmin(
      db,
      {
        kind: "contact",
        summary: "Message from Bob",
        path: "/admin/messages/",
      },
      start,
    );
    await alertAdmin(
      db,
      {
        kind: "appeal",
        summary: "@bob appealed “x.png”",
        path: "/admin/files/review?tab=appeals",
      },
      start,
    );
    const input = {
      adminTo: [],
      admins: {
        adminEmails: new Set<string>(),
        adminGithubIds: new Set([ADMIN_ID]),
      },
    };
    expect(await flushAdminAlerts(db, input, start)).toBe(2);
    let sent = (await allMail()).filter((m) => m.kind === "admin-alert");
    expect(sent).toHaveLength(1);
    expect(sent[0]).toMatchObject({
      toAddress: "ada@example.com",
      subject: "Trilleo Network: 2 things to look at",
    });
    expect(sent[0]?.textBody).toContain(
      "- Message from Bob\n  https://www.trilleo.net/admin/messages/",
    );

    await alertAdmin(
      db,
      {
        kind: "contact",
        summary: "Message from Carol",
        path: "/admin/messages/",
      },
      minutes(1),
    );
    expect(await flushAdminAlerts(db, input, minutes(2))).toBe(0);
    const later = new Date(start.getTime() + ADMIN_ALERT_GAP_MS + 1);
    expect(await flushAdminAlerts(db, input, later)).toBe(1);
    sent = (await allMail()).filter((m) => m.kind === "admin-alert");
    expect(sent.at(-1)?.subject).toBe("Trilleo Network: Message from Carol");
  });

  it("goes to MAIL_ADMIN_TO when set, and nowhere when nobody wants it", async () => {
    await alertAdmin(
      db,
      { kind: "contact", summary: "One", path: "/admin/" },
      start,
    );
    expect(
      await flushAdminAlerts(
        db,
        {
          adminTo: ["ops@example.com"],
          admins: {
            adminEmails: new Set<string>(),
            adminGithubIds: new Set<number>(),
          },
        },
        start,
      ),
    ).toBe(1);
    expect((await allMail()).map((m) => m.toAddress)).toEqual([
      "ops@example.com",
    ]);

    await alertAdmin(
      db,
      { kind: "contact", summary: "Two", path: "/admin/" },
      minutes(30),
    );
    // The admin has no address: the alert is marked done, nothing is sent.
    expect(
      await flushAdminAlerts(
        db,
        {
          adminTo: [],
          admins: {
            adminEmails: new Set<string>(),
            adminGithubIds: new Set([ADMIN_ID]),
          },
        },
        minutes(30),
      ),
    ).toBe(1);
    expect(await allMail()).toHaveLength(1);
    const left = await db
      .select()
      .from(adminAlerts)
      .where(eq(adminAlerts.summary, "Two"));
    expect(left[0]?.mailedAt).toEqual(minutes(30));
  });
});
