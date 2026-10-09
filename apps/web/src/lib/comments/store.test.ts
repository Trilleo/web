import {
  comments,
  openDatabase,
  sessions,
  users,
  type DatabaseHandle,
  type User,
} from "@trilleo/db";
import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { upsertGitHubUser } from "../auth/accounts";
import { createSession } from "../auth/sessions";
import {
  COMMENT_MAX_LENGTH,
  LIMITS,
  blockUser,
  createComment,
  deleteAccount,
  deleteComment,
  listThreads,
  moderateComment,
  moderationOverview,
  unblockUser,
  userComments,
} from "./store";

const POST = "a-post";
const start = new Date("2026-01-01T12:00:00Z");
const minutes = (n: number) => new Date(start.getTime() + n * 60_000);

let handle: DatabaseHandle;
let admin: User;
let alice: User;
let bob: User;

beforeEach(async () => {
  handle = await openDatabase("memory://");
  admin = await upsertGitHubUser(handle.db, {
    id: 1,
    login: "owner",
    name: "Owner",
  });
  alice = await upsertGitHubUser(handle.db, {
    id: 2,
    login: "alice",
    name: "Alice",
  });
  bob = await upsertGitHubUser(handle.db, { id: 3, login: "bob", name: null });
});
afterEach(async () => {
  await handle.close();
});

/** Reloads a user, as the middleware would on the next request. */
async function fresh(user: User): Promise<User> {
  const [row] = await handle.db
    .select()
    .from(users)
    .where(eq(users.id, user.id));
  if (!row) throw new Error("user is gone");
  return row;
}

async function post(
  author: User,
  body: string,
  options: {
    parentId?: number;
    now?: Date;
    isAdmin?: boolean;
    postSlug?: string;
  } = {},
) {
  return createComment(handle.db, {
    author: await fresh(author),
    isAdmin: options.isAdmin ?? author.id === admin.id,
    postSlug: options.postSlug ?? POST,
    parentId: options.parentId ?? null,
    body,
    now: options.now ?? start,
  });
}

async function posted(
  author: User,
  body: string,
  options: Parameters<typeof post>[2] = {},
) {
  const result = await post(author, body, options);
  if (!result.ok) throw new Error(`comment refused: ${result.error}`);
  return result.comment;
}

/**
 * Makes someone trusted the way it happens for real: the admin approves a comment.
 * It's dated over a day back, so it doesn't count towards the tests' rate limits.
 */
async function trust(user: User) {
  const first = await posted(user, "hello", { now: minutes(-25 * 60) });
  await moderateComment(handle.db, first.id, "approve");
}

const bodies = async (viewer: User | null) =>
  (await listThreads(handle.db, POST, viewer?.id ?? null)).threads.map(
    (thread) => [
      thread.comment.removed ? "(removed)" : thread.comment.body,
      thread.replies.map((reply) => reply.body),
    ],
  );

describe("authors", () => {
  it("signs comments as each person chose, and says whose profile is public", async () => {
    await posted(admin, "From the owner");
    await posted(bob, "Hi", { isAdmin: true });
    await handle.db
      .update(users)
      .set({ displayName: "The Owner", profilePublic: false })
      .where(eq(users.id, admin.id));
    await handle.db
      .update(users)
      .set({ commentName: "username", displayName: "Bobby" })
      .where(eq(users.id, bob.id));

    const { threads } = await listThreads(handle.db, POST, null);
    expect(threads.map((thread) => thread.comment.author)).toEqual([
      { login: "owner", name: "The Owner", profile: false },
      { login: "bob", name: null, profile: true },
    ]);
  });
});

describe("posting", () => {
  it("holds a newcomer's comment for review, visible only to them", async () => {
    const comment = await posted(alice, "First!");
    expect(comment.status).toBe("pending");

    expect(await bodies(null)).toEqual([]);
    expect(await bodies(bob)).toEqual([]);
    const own = await listThreads(handle.db, POST, alice.id);
    expect(own.threads[0]?.comment).toMatchObject({
      body: "First!",
      pending: true,
      mine: true,
    });
    expect(own.count).toBe(0);
  });

  it("publishes at once for the admin and for people the admin has approved", async () => {
    expect((await posted(admin, "From the owner")).status).toBe("published");
    await trust(alice);
    expect((await posted(alice, "Again")).status).toBe("published");
    expect(await bodies(null)).toEqual([
      ["hello", []],
      ["From the owner", []],
      ["Again", []],
    ]);
  });

  it("tidies what was typed, and refuses empty or overlong comments", async () => {
    expect((await posted(alice, "  line one\r\nline two  \n")).body).toBe(
      "line one\nline two",
    );
    expect(await post(alice, " \n\t ")).toEqual({ ok: false, error: "empty" });
    expect(await post(alice, "x".repeat(COMMENT_MAX_LENGTH + 1))).toEqual({
      ok: false,
      error: "too-long",
    });
    expect((await post(alice, "x".repeat(COMMENT_MAX_LENGTH))).ok).toBe(true);
  });
});

describe("replies", () => {
  it("keeps one level: a reply to a reply joins the thread", async () => {
    const top = await posted(admin, "Top");
    const reply = await posted(admin, "Reply", { parentId: top.id });
    const replyToReply = await posted(admin, "Reply to reply", {
      parentId: reply.id,
    });
    expect(replyToReply.parentId).toBe(top.id);
    expect(await bodies(null)).toEqual([["Top", ["Reply", "Reply to reply"]]]);
  });

  it("only replies to comments the replier can see, on the same post", async () => {
    const elsewhere = await posted(admin, "Other post", { postSlug: "other" });
    expect(await post(admin, "x", { parentId: elsewhere.id })).toEqual({
      ok: false,
      error: "no-parent",
    });

    const pending = await posted(alice, "Pending");
    expect((await post(bob, "x", { parentId: pending.id })).ok).toBe(false);
    expect(
      (await post(alice, "Adding to my own", { parentId: pending.id })).ok,
    ).toBe(true);

    const hidden = await posted(admin, "Hidden");
    await moderateComment(handle.db, hidden.id, "hide");
    expect((await post(admin, "x", { parentId: hidden.id })).ok).toBe(false);
    expect((await post(admin, "x", { parentId: 9999 })).ok).toBe(false);
  });
});

describe("limits", () => {
  it(`allows ${String(LIMITS.burst.count)} comments per 10 minutes`, async () => {
    await trust(alice);
    for (let i = 0; i < LIMITS.burst.count; i++)
      await posted(alice, `#${String(i)}`);
    expect(await post(alice, "one more")).toEqual({
      ok: false,
      error: "rate-limited",
    });
    expect((await post(alice, "later", { now: minutes(11) })).ok).toBe(true);
  });

  it(`allows ${String(LIMITS.daily.count)} comments a day`, async () => {
    await trust(alice);
    for (let i = 0; i < LIMITS.daily.count; i++) {
      await posted(alice, `#${String(i)}`, { now: minutes(i * 11) });
    }
    const nextDay = LIMITS.daily.count * 11;
    expect(await post(alice, "more", { now: minutes(nextDay) })).toEqual({
      ok: false,
      error: "rate-limited",
    });
    expect(
      (await post(alice, "tomorrow", { now: minutes(nextDay + 24 * 60) })).ok,
    ).toBe(true);
  });

  it(`holds at most ${String(LIMITS.pending)} unreviewed comments from a newcomer`, async () => {
    for (let i = 0; i < LIMITS.pending; i++) {
      await posted(alice, `#${String(i)}`, { now: minutes(i * 11) });
    }
    expect(await post(alice, "more", { now: minutes(60) })).toEqual({
      ok: false,
      error: "too-many-pending",
    });
  });

  it("doesn't limit the admin", async () => {
    for (let i = 0; i < LIMITS.burst.count + 3; i++)
      await posted(admin, `#${String(i)}`);
  });
});

describe("moderation", () => {
  it("hides and unhides comments", async () => {
    const comment = await posted(admin, "Visible");
    expect(await moderateComment(handle.db, comment.id, "hide")).toBe(true);
    expect(await bodies(null)).toEqual([]);
    expect(await moderateComment(handle.db, comment.id, "unhide")).toBe(true);
    expect(await bodies(null)).toEqual([["Visible", []]]);
    expect(await moderateComment(handle.db, comment.id, "approve")).toBe(false);
  });

  it("keeps a deleted comment as a placeholder while it has replies", async () => {
    const thread = await posted(admin, "Thread");
    const reply = await posted(admin, "Answer", { parentId: thread.id });
    await moderateComment(handle.db, thread.id, "delete");

    const { threads, count } = await listThreads(handle.db, POST, null);
    expect(threads).toHaveLength(1);
    expect(threads[0]?.comment).toMatchObject({
      removed: true,
      body: "",
      author: null,
    });
    expect(threads[0]?.replies.map((r) => r.body)).toEqual(["Answer"]);
    expect(count).toBe(1);

    // Once its last reply goes, the placeholder goes too.
    await moderateComment(handle.db, reply.id, "delete");
    expect(await handle.db.select().from(comments)).toEqual([]);
  });

  it("shows a hidden comment's replies under a placeholder", async () => {
    const thread = await posted(admin, "Thread");
    await posted(admin, "Answer", { parentId: thread.id });
    await moderateComment(handle.db, thread.id, "hide");
    expect(await bodies(null)).toEqual([["(removed)", ["Answer"]]]);
  });

  it("lists the review queue, recent comments and blocked accounts", async () => {
    const first = await posted(alice, "Waiting 1", { now: minutes(1) });
    await posted(bob, "Waiting 2", { now: minutes(2) });
    await posted(admin, "Live", { now: minutes(3) });
    await blockUser(handle.db, bob.id);

    const overview = await moderationOverview(handle.db);
    expect(overview.pending.map((c) => c.body)).toEqual(["Waiting 1"]);
    expect(overview.pending[0]).toMatchObject({
      id: first.id,
      author: { login: "alice", trusted: false },
    });
    expect(overview.recent.map((c) => [c.body, c.status])).toEqual([
      ["Live", "published"],
      ["Waiting 2", "hidden"],
    ]);
    expect(overview.blocked.map((user) => user.username)).toEqual(["bob"]);
  });
});

describe("deleting", () => {
  it("lets authors and the admin delete, and nobody else", async () => {
    const comment = await posted(admin, "Mine");
    const forbidden = await deleteComment(handle.db, {
      id: comment.id,
      by: alice,
      isAdmin: false,
    });
    expect(forbidden).toEqual({ ok: false, error: "forbidden" });

    const own = await posted(alice, "Alice's");
    expect(
      await deleteComment(handle.db, { id: own.id, by: alice, isAdmin: false }),
    ).toEqual({
      ok: true,
      postSlug: POST,
    });
    expect(
      await deleteComment(handle.db, {
        id: comment.id,
        by: admin,
        isAdmin: true,
      }),
    ).toEqual({
      ok: true,
      postSlug: POST,
    });
    expect(
      await deleteComment(handle.db, {
        id: comment.id,
        by: admin,
        isAdmin: true,
      }),
    ).toEqual({
      ok: false,
      error: "not-found",
    });
  });
});

describe("blocking", () => {
  it("hides their comments, signs them out, and stops them commenting", async () => {
    await trust(alice);
    await posted(alice, "Before");
    await createSession(handle.db, alice.id);
    await blockUser(handle.db, alice.id);

    expect(await bodies(null)).toEqual([]);
    expect(
      await handle.db
        .select()
        .from(sessions)
        .where(eq(sessions.userId, alice.id)),
    ).toEqual([]);
    expect(await post(alice, "After")).toEqual({ ok: false, error: "blocked" });

    await unblockUser(handle.db, alice.id);
    expect((await post(alice, "Back", { now: minutes(30) })).ok).toBe(true);
  });
});

describe("deleteAccount", () => {
  it("removes the user and what they wrote, keeping threads others replied to", async () => {
    const started = await posted(alice, "Alice's thread", { now: minutes(1) });
    await moderateComment(handle.db, started.id, "approve");
    await posted(alice, "Alice replies", {
      parentId: started.id,
      now: minutes(2),
    });
    await posted(admin, "Owner replies", {
      parentId: started.id,
      now: minutes(3),
    });
    const solo = await posted(alice, "Alone", { now: minutes(4) });
    const elsewhere = await posted(admin, "Owner's thread", {
      now: minutes(5),
    });
    await posted(alice, "Alice on owner's", {
      parentId: elsewhere.id,
      now: minutes(6),
    });
    await createSession(handle.db, alice.id);

    await deleteAccount(handle.db, alice.id);

    expect(await bodies(null)).toEqual([
      ["(removed)", ["Owner replies"]],
      ["Owner's thread", []],
    ]);
    expect(
      await handle.db.select().from(users).where(eq(users.id, alice.id)),
    ).toEqual([]);
    expect(await handle.db.select().from(sessions)).toEqual([]);
    expect(
      await handle.db.select().from(comments).where(eq(comments.id, solo.id)),
    ).toEqual([]);
  });
});

describe("userComments", () => {
  it("lists someone's comments, newest first, including pending ones", async () => {
    await posted(alice, "Older", { now: minutes(1) });
    await posted(alice, "Newer", { now: minutes(2) });
    await posted(bob, "Not hers", { now: minutes(3) });
    const own = await userComments(handle.db, alice.id);
    expect(own.map((c) => [c.body, c.status])).toEqual([
      ["Newer", "pending"],
      ["Older", "pending"],
    ]);
  });
});
