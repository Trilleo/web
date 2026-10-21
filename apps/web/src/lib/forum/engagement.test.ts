import {
  forums,
  mailMessages,
  openDatabase,
  users,
  type DatabaseHandle,
  type Forum,
  type User,
} from "@trilleo/db";
import { quoteFor } from "@trilleo/forum";
import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { upsertGitHubUser } from "../auth/accounts";
import { ADMIN_PROFILE } from "../auth/testing";
import { getDraft, saveDraft } from "./drafts";
import { postsFeed, topicsFeed } from "./feeds";
import {
  listNotifications,
  markNotificationsRead,
  saveSettings,
  sendForumDigests,
  unreadNotifications,
  watch,
} from "./notifications";
import { acceptAnswer, react, reactionsFor, vote } from "./reactions";
import { markAllRead, markRead, unreadOf } from "./reads";
import { reputationOf } from "./reputation";
import {
  createReply,
  createTopic,
  getTopic,
  listPosts,
  listTopics,
  loadTree,
} from "./store";
import { addPrefix, prefixesOf, tagId, tagsOf } from "./tags";

process.env.ADMIN_GITHUB_IDS = String(ADMIN_PROFILE.id);

const start = new Date("2026-03-01T12:00:00Z");
const minutes = (n: number) => new Date(start.getTime() + n * 60_000);

let handle: DatabaseHandle;
let admin: User;
let alice: User;
let bob: User;

async function withAddress(user: User): Promise<User> {
  const [updated] = await handle.db
    .update(users)
    .set({
      email: `${user.username}@example.com`,
      emailVerifiedAt: start,
      emailToken: `token-${user.username}-0123456789abcdef`,
      trustedAt: start,
      createdAt: new Date("2026-01-01T00:00:00Z"),
    })
    .where(eq(users.id, user.id))
    .returning();
  if (!updated) throw new Error("no user");
  return updated;
}

beforeEach(async () => {
  handle = await openDatabase("memory://");
  admin = await withAddress(await upsertGitHubUser(handle.db, ADMIN_PROFILE));
  alice = await withAddress(
    await upsertGitHubUser(handle.db, { id: 2, login: "alice", name: "Alice" }),
  );
  bob = await withAddress(
    await upsertGitHubUser(handle.db, { id: 3, login: "bob", name: null }),
  );
});
afterEach(async () => {
  await handle.close();
});

async function fresh(user: User): Promise<User> {
  const [row] = await handle.db
    .select()
    .from(users)
    .where(eq(users.id, user.id));
  if (!row) throw new Error("user is gone");
  return row;
}

async function forum(slug = "general"): Promise<Forum> {
  const node = (await loadTree(handle.db)).find(slug);
  if (!node) throw new Error(`no forum ${slug}`);
  return node.forum;
}

async function layout(slug: string, value: string) {
  await handle.db
    .update(forums)
    .set({ layout: value })
    .where(eq(forums.slug, slug));
}

async function topicBy(
  author: User,
  title: string,
  options: {
    forum?: string;
    body?: string;
    tags?: string[];
    prefixId?: number | null;
    now?: Date;
  } = {},
) {
  const result = await createTopic(handle.db, {
    tree: await loadTree(handle.db),
    forum: await forum(options.forum),
    author: await fresh(author),
    title,
    body: options.body ?? `${title} text`,
    tags: options.tags ?? [],
    prefixId: options.prefixId ?? null,
    now: options.now ?? start,
  });
  if (!result.ok) throw new Error(`refused: ${result.error}`);
  return result.value;
}

async function replyBy(
  author: User,
  topicId: number,
  body: string,
  options: { now?: Date; parentId?: number } = {},
) {
  const topic = await getTopic(handle.db, topicId);
  if (!topic) throw new Error("no topic");
  const tree = await loadTree(handle.db);
  const node = tree.get(topic.forumId);
  if (!node) throw new Error("no forum");
  const result = await createReply(handle.db, {
    tree,
    forum: node.forum,
    topic,
    author: await fresh(author),
    body,
    parentId: options.parentId ?? null,
    now: options.now ?? minutes(1),
  });
  if (!result.ok) throw new Error(`refused: ${result.error}`);
  return result.value;
}

const mailOf = async (kind: string) =>
  handle.db.select().from(mailMessages).where(eq(mailMessages.kind, kind));

describe("Q&A forums", () => {
  it("orders answers by score, accepts one, and gives points", async () => {
    await layout("help", "qa");
    const { topic } = await topicBy(alice, "How do clocks work?", {
      forum: "help",
    });
    const first = await replyBy(bob, topic.id, "First answer", {
      now: minutes(1),
    });
    const second = await replyBy(admin, topic.id, "Better answer", {
      now: minutes(2),
    });

    expect(
      await vote(handle.db, { post: second, userId: alice.id, value: 1 }),
    ).toBe(1);
    expect(
      await vote(handle.db, { post: second, userId: bob.id, value: 1 }),
    ).toBe(2);
    expect(
      await vote(handle.db, { post: first, userId: alice.id, value: -1 }),
    ).toBe(-1);
    // The same vote again takes it back.
    expect(
      await vote(handle.db, { post: first, userId: alice.id, value: -1 }),
    ).toBe(0);

    const order = async () => {
      const current = await getTopic(handle.db, topic.id);
      if (!current) throw new Error("no topic");
      return (
        await listPosts(handle.db, {
          topic: current,
          layout: "qa",
          viewer: null,
          mod: false,
          page: 1,
        })
      ).posts.map((view) => view.post.body);
    };
    expect(await order()).toEqual([
      "How do clocks work? text",
      "Better answer",
      "First answer",
    ]);

    const current = await getTopic(handle.db, topic.id);
    if (!current) throw new Error("no topic");
    expect(
      await acceptAnswer(handle.db, {
        topic: current,
        post: first,
        by: alice.id,
        now: minutes(5),
      }),
    ).toBe(true);
    expect(await order()).toEqual([
      "How do clocks work? text",
      "First answer",
      "Better answer",
    ]);
    expect((await getTopic(handle.db, topic.id))?.solvedAt).toEqual(minutes(5));

    const reputation = await reputationOf(handle.db, [bob.id]);
    expect(reputation.get(bob.id)?.points).toBe(1 + 15);
    expect(reputation.get(bob.id)?.badges).toContain("helpful");
    expect(
      (await listNotifications(handle.db, bob.id)).map((item) => item.kind),
    ).toContain("accepted");
  });
});

describe("threaded forums", () => {
  it("keeps replies under what they answer", async () => {
    await layout("general", "threaded");
    const { topic } = await topicBy(alice, "Threads");
    const a = await replyBy(bob, topic.id, "A", { now: minutes(1) });
    await replyBy(admin, topic.id, "B", { now: minutes(2) });
    await replyBy(alice, topic.id, "A1", { now: minutes(3), parentId: a.id });
    const current = await getTopic(handle.db, topic.id);
    if (!current) throw new Error("no topic");
    const listed = await listPosts(handle.db, {
      topic: current,
      layout: "threaded",
      viewer: null,
      mod: false,
      page: 1,
    });
    expect(listed.posts.map((view) => [view.post.body, view.depth])).toEqual([
      ["Threads text", 0],
      ["A", 1],
      ["A1", 2],
      ["B", 1],
    ]);
  });

  it("ignores a parent in other layouts", async () => {
    const { topic, post } = await topicBy(alice, "Flat");
    const reply = await replyBy(bob, topic.id, "reply", { parentId: post.id });
    expect(reply.parentId).toBeNull();
  });
});

describe("reactions", () => {
  it("toggles one reaction per person, and counts toward points", async () => {
    const { post } = await topicBy(alice, "React to me");
    expect(
      await react(handle.db, { post, userId: bob.id, reaction: "like" }),
    ).toBe("like");
    expect(
      await react(handle.db, { post, userId: bob.id, reaction: "love" }),
    ).toBe("love");
    expect(
      await react(handle.db, { post, userId: admin.id, reaction: "love" }),
    ).toBe("love");
    const summary = (await reactionsFor(handle.db, [post.id], bob.id)).get(
      post.id,
    );
    expect(summary?.map((item) => [item.key, item.count, item.mine])).toEqual([
      ["love", 2, true],
    ]);
    expect(summary?.[0]?.people.sort()).toEqual(["bob", "site-owner"]);
    expect(
      await react(handle.db, { post, userId: bob.id, reaction: "love" }),
    ).toBeNull();
    expect(
      (await reputationOf(handle.db, [alice.id])).get(alice.id)?.points,
    ).toBe(1 + 2);
    // Reactions are noticed, never emailed.
    const kinds = (await listNotifications(handle.db, alice.id)).map(
      (item) => item.kind,
    );
    expect(kinds).toEqual(["reaction", "reaction"]);
    expect(await mailOf("forum-notification")).toEqual([]);
  });
});

describe("watching and notifications", () => {
  it("tells watchers, the mentioned and the quoted, once each", async () => {
    const { topic, post } = await topicBy(alice, "Watched topic");
    // Alice watches her own topic; bob watches the forum.
    await watch(handle.db, bob.id, { forumId: (await forum()).id });
    await topicBy(admin, "Another", { now: minutes(1) });
    expect(
      (await listNotifications(handle.db, bob.id)).map((item) => [
        item.kind,
        item.topicTitle,
      ]),
    ).toEqual([["topic", "Another"]]);

    // A reply that quotes alice and mentions bob.
    await replyBy(
      admin,
      topic.id,
      `${quoteFor(post, "alice", `/forum/post/${String(post.id)}/`)}Agreed, @bob?`,
      { now: minutes(2) },
    );
    expect(
      (await listNotifications(handle.db, alice.id)).map((item) => item.kind),
    ).toEqual(["quote"]);
    expect(
      (await listNotifications(handle.db, bob.id)).map((item) => item.kind),
    ).toEqual(["mention", "topic"]);
    // Emailed at once (the default), with the forum topic.
    const sent = await mailOf("forum-notification");
    expect(sent.map((row) => row.toAddress).sort()).toEqual([
      "alice@example.com",
      "bob@example.com",
      "bob@example.com",
    ]);
    expect(await unreadNotifications(handle.db, bob.id)).toBe(2);
    await markNotificationsRead(handle.db, bob.id);
    expect(await unreadNotifications(handle.db, bob.id)).toBe(0);
  });

  it("watches topics people reply to, unless they said not to", async () => {
    const { topic } = await topicBy(alice, "Replied to");
    await saveSettings(handle.db, admin.id, { watchReplies: false });
    await replyBy(bob, topic.id, "Bob's reply", { now: minutes(1) });
    await replyBy(admin, topic.id, "Admin's reply", { now: minutes(2) });
    await replyBy(alice, topic.id, "Alice again", { now: minutes(3) });
    // Bob watches now; the admin doesn't.
    expect(
      (await listNotifications(handle.db, bob.id)).map((item) => item.kind),
    ).toEqual(["reply", "reply"]);
    expect(await listNotifications(handle.db, admin.id)).toEqual([]);
  });

  it("sends a digest instead, when asked", async () => {
    await saveSettings(handle.db, alice.id, { email: "daily" });
    const { topic } = await topicBy(alice, "Digest me");
    await replyBy(bob, topic.id, "one", { now: minutes(1) });
    await replyBy(admin, topic.id, "two", { now: minutes(2) });
    // Bob (watching since he replied) hears at once; alice waits for her digest.
    expect(
      (await mailOf("forum-notification")).map((row) => row.toAddress),
    ).toEqual(["bob@example.com"]);
    expect(await sendForumDigests(handle.db, minutes(10))).toBe(1);
    const [digest] = await mailOf("forum-digest");
    expect(digest?.subject).toBe("2 things happened in the forum");
    // Nothing new: nothing sent; too soon anyway.
    expect(await sendForumDigests(handle.db, minutes(20))).toBe(0);
  });

  it("tells nobody about posts they can't see", async () => {
    await handle.db
      .update(forums)
      .set({ hidden: true })
      .where(eq(forums.slug, "site"));
    await watch(handle.db, bob.id, { forumId: (await forum("help")).id });
    await topicBy(admin, "Secret", { forum: "help" });
    expect(await listNotifications(handle.db, bob.id)).toEqual([]);
  });
});

describe("unread", () => {
  it("marks what's new since someone last read", async () => {
    const { topic } = await topicBy(alice, "Unread one", { now: minutes(1) });
    const fresh1 = await getTopic(handle.db, topic.id);
    if (!fresh1) throw new Error("no topic");
    const bobUser = await fresh(bob);
    expect(await unreadOf(handle.db, bobUser, [fresh1])).toEqual(
      new Set([topic.id]),
    );
    expect(await markRead(handle.db, bob.id, fresh1)).toBeNull();
    expect(await unreadOf(handle.db, bobUser, [fresh1])).toEqual(new Set());

    await replyBy(alice, topic.id, "news", { now: minutes(5) });
    const fresh2 = await getTopic(handle.db, topic.id);
    if (!fresh2) throw new Error("no topic");
    expect(await unreadOf(handle.db, bobUser, [fresh2])).toEqual(
      new Set([topic.id]),
    );
    expect(await markRead(handle.db, bob.id, fresh2)).toBe(fresh1.lastPostId);

    await replyBy(alice, topic.id, "more", { now: minutes(6) });
    await markAllRead(handle.db, bob.id, minutes(7));
    const fresh3 = await getTopic(handle.db, topic.id);
    if (!fresh3) throw new Error("no topic");
    expect(await unreadOf(handle.db, bobUser, [fresh3])).toEqual(new Set());
  });
});

describe("tags, prefixes and drafts", () => {
  it("tags topics, lists them by tag, and keeps prefixes to their forum", async () => {
    const general = await forum();
    expect(
      await addPrefix(handle.db, general.id, "[Guide]", "accent"),
    ).toBeNull();
    expect(await addPrefix(handle.db, general.id, "", "accent")).toBe(
      "Give it a label.",
    );
    const [guide] = await prefixesOf(handle.db, general.id);
    if (!guide) throw new Error("no prefix");
    expect(guide.label).toBe("Guide");

    const { topic } = await topicBy(alice, "Tagged", {
      tags: ["Redstone Clocks", "help", "help"],
      prefixId: guide.id,
    });
    const other = await topicBy(alice, "Elsewhere", {
      forum: "help",
      prefixId: guide.id,
    });
    expect((await tagsOf(handle.db, [topic.id])).get(topic.id)).toEqual([
      "help",
      "redstone-clocks",
    ]);
    expect((await getTopic(handle.db, topic.id))?.prefixId).toBe(guide.id);
    // Another forum's prefix doesn't stick.
    expect((await getTopic(handle.db, other.topic.id))?.prefixId).toBeNull();

    const tree = await loadTree(handle.db);
    const id = await tagId(handle.db, "redstone-clocks");
    const listed = await listTopics(handle.db, {
      forum: null,
      forumIds: tree.visibleIds(null),
      viewer: null,
      mod: false,
      page: 1,
      tagId: id,
    });
    expect(
      listed.topics.map((row) => [row.topic.title, row.prefix?.label]),
    ).toEqual([["Tagged", "Guide"]]);
    const solved = await listTopics(handle.db, {
      forum: general,
      viewer: null,
      mod: false,
      page: 1,
      filter: "solved",
    });
    expect(solved.total).toBe(0);
  });

  it("drops the draft once posted", async () => {
    const general = await forum();
    expect(
      await saveDraft(handle.db, alice.id, {
        key: `topic:${String(general.id)}`,
        title: "Half",
        body: "written",
      }),
    ).toBe(true);
    expect(
      await saveDraft(handle.db, alice.id, {
        key: "nope",
        title: "",
        body: "x",
      }),
    ).toBe(false);
    expect(
      (await getDraft(handle.db, alice.id, `topic:${String(general.id)}`))
        ?.title,
    ).toBe("Half");
    await topicBy(alice, "Finished");
    expect(
      await getDraft(handle.db, alice.id, `topic:${String(general.id)}`),
    ).toBeUndefined();
  });
});

describe("feeds", () => {
  it("lists what visitors may see", async () => {
    const { topic } = await topicBy(alice, "Feed me & you");
    await replyBy(bob, topic.id, "A reply");
    await topicBy(alice, "Hidden away", { forum: "help" });
    await handle.db
      .update(forums)
      .set({ hidden: true })
      .where(eq(forums.slug, "site"));
    const tree = await loadTree(handle.db);
    const all = await (
      await topicsFeed(handle.db, {
        tree,
        forum: null,
        site: "https://www.trilleo.net",
      })
    ).text();
    expect(all).toContain("Feed me &amp; you");
    expect(all).not.toContain("Hidden away");
    const current = await getTopic(handle.db, topic.id);
    if (!current) throw new Error("no topic");
    const posts = await (
      await postsFeed(handle.db, {
        topic: current,
        forum: await forum(),
        site: "https://www.trilleo.net",
      })
    ).text();
    expect(posts).toContain("@bob replied");
  });
});
