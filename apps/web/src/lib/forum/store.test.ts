import {
  forumPosts,
  forumTopics,
  forums,
  openDatabase,
  users,
  type DatabaseHandle,
  type Forum,
  type User,
} from "@trilleo/db";
import { FORUM_LIMITS, FORUM_RENDER_VERSION } from "@trilleo/forum";
import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { upsertGitHubUser } from "../auth/accounts";
import { ADMIN_PROFILE } from "../auth/testing";
import {
  createForum,
  deleteForum,
  forumDraft,
  moveForum,
  validateForum,
} from "./admin";
import {
  createReply,
  createTopic,
  deletePost,
  editPost,
  forumExport,
  forumViewer,
  getPost,
  getTopic,
  listPosts,
  listTopics,
  loadTree,
  moderatePost,
  pageOfPost,
  recentTopics,
  searchForum,
  waitingPosts,
} from "./store";

process.env.ADMIN_GITHUB_IDS = String(ADMIN_PROFILE.id);

const start = new Date("2026-03-01T12:00:00Z");
const minutes = (n: number) => new Date(start.getTime() + n * 60_000);

let handle: DatabaseHandle;
let admin: User;
let alice: User;
let bob: User;

beforeEach(async () => {
  handle = await openDatabase("memory://");
  admin = await upsertGitHubUser(handle.db, ADMIN_PROFILE);
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

async function trust(user: User) {
  await handle.db
    .update(users)
    .set({ trustedAt: start })
    .where(eq(users.id, user.id));
}

async function startTopic(
  author: User,
  title: string,
  body: string,
  options: { forum?: string; now?: Date } = {},
) {
  const tree = await loadTree(handle.db);
  const result = await createTopic(handle.db, {
    tree,
    forum: await forum(options.forum),
    author: await fresh(author),
    title,
    body,
    now: options.now ?? start,
  });
  if (!result.ok) throw new Error(`topic refused: ${result.error}`);
  return result.value;
}

async function reply(
  author: User,
  topicId: number,
  body: string,
  now = minutes(1),
) {
  const topic = await getTopic(handle.db, topicId);
  if (!topic) throw new Error("no topic");
  const tree = await loadTree(handle.db);
  const node = tree.get(topic.forumId);
  if (!node) throw new Error("no forum");
  return createReply(handle.db, {
    tree,
    forum: node.forum,
    topic,
    author: await fresh(author),
    body,
    now,
  });
}

describe("the seeded forum", () => {
  it("starts with categories and forums", async () => {
    const tree = await loadTree(handle.db);
    expect(tree.roots.map((node) => node.forum.slug)).toEqual([
      "community",
      "site",
    ]);
    expect(tree.find("announcements")?.forum.locked).toBe(true);
    expect(tree.ancestors((await forum("help")).id).map((f) => f.slug)).toEqual(
      ["site"],
    );
  });
});

describe("topics and replies", () => {
  it("publishes a trusted member's topic at once and counts it", async () => {
    await trust(alice);
    const { topic, post } = await startTopic(
      alice,
      "Hello there",
      "My **first** post",
    );
    expect(topic.state).toBe("published");
    expect(topic.slug).toBe("hello-there");
    expect(post.html).toContain("<strong>first</strong>");
    expect(post.renderVersion).toBe(FORUM_RENDER_VERSION);

    const result = await reply(bob, topic.id, "Welcome @alice!");
    expect(result.ok).toBe(true);
    // Bob is a newcomer: his reply waits.
    if (result.ok) expect(result.value.state).toBe("pending");

    await trust(bob);
    await reply(bob, topic.id, "Second reply", minutes(2));
    const general = await forum();
    expect(general.topicCount).toBe(1);
    expect(general.postCount).toBe(2);
    const counted = await getTopic(handle.db, topic.id);
    expect(counted?.replyCount).toBe(1);
    expect(counted?.firstPostId).toBe(post.id);
  });

  it("holds a newcomer's topic until it's approved, which trusts them", async () => {
    const { topic, post } = await startTopic(bob, "Newcomer topic", "Hi");
    expect(topic.state).toBe("pending");
    const general = await forum();
    expect(
      (
        await listTopics(handle.db, {
          forum: general,
          viewer: null,
          mod: false,
          page: 1,
        })
      ).total,
    ).toBe(0);
    // Bob sees his own, the admin sees it, Alice doesn't.
    const as = async (user: User | null) =>
      (
        await listTopics(handle.db, {
          forum: general,
          viewer: await forumViewer(
            handle.db,
            await loadTree(handle.db),
            user && (await fresh(user)),
          ),
          mod: user?.id === admin.id,
          page: 1,
        })
      ).total;
    expect(await as(bob)).toBe(1);
    expect(await as(alice)).toBe(0);
    expect(await as(admin)).toBe(1);
    expect((await waitingPosts(handle.db)).map((item) => item.post.id)).toEqual(
      [post.id],
    );

    // His reply to his own waiting topic waits with it, and goes live with it.
    const own = await reply(bob, topic.id, "More detail");
    expect(own.ok && own.value.state).toBe("pending");

    const fullTopic = await getTopic(handle.db, topic.id);
    if (!fullTopic) throw new Error("no topic");
    expect(
      await moderatePost(handle.db, {
        topic: fullTopic,
        post,
        action: "approve",
        by: admin.id,
      }),
    ).toBe(true);
    expect((await getTopic(handle.db, topic.id))?.state).toBe("published");
    expect((await getTopic(handle.db, topic.id))?.replyCount).toBe(1);
    expect((await fresh(bob)).trustedAt).not.toBeNull();
  });

  it("follows each forum's moderation setting", async () => {
    await trust(alice);
    await handle.db
      .update(forums)
      .set({ moderation: "all" })
      .where(eq(forums.slug, "general"));
    expect((await startTopic(alice, "Waits anyway", "text")).topic.state).toBe(
      "pending",
    );
    expect((await startTopic(admin, "Admin's topic", "text")).topic.state).toBe(
      "published",
    );
    await handle.db
      .update(forums)
      .set({ moderation: "none" })
      .where(eq(forums.slug, "help"));
    expect(
      (await startTopic(bob, "Straight in", "text", { forum: "help" })).topic
        .state,
    ).toBe("published");
  });

  it("refuses bad titles, empty posts, locked forums and categories", async () => {
    const tree = await loadTree(handle.db);
    const attempt = async (slug: string, title: string, body: string) =>
      createTopic(handle.db, {
        tree,
        forum: await forum(slug),
        author: await fresh(alice),
        title,
        body,
        now: start,
      });
    expect(await attempt("general", "", "x")).toEqual({
      ok: false,
      error: "empty-title",
    });
    expect(await attempt("general", "Hi", "x")).toEqual({
      ok: false,
      error: "short-title",
    });
    expect(await attempt("general", "A fine title", "  ")).toEqual({
      ok: false,
      error: "empty",
    });
    expect(
      await attempt(
        "general",
        "A fine title",
        "x".repeat(FORUM_LIMITS.body.max + 1),
      ),
    ).toEqual({ ok: false, error: "too-long" });
    expect(await attempt("announcements", "A fine title", "x")).toEqual({
      ok: false,
      error: "forbidden",
    });
    expect(await attempt("community", "A fine title", "x")).toEqual({
      ok: false,
      error: "forbidden",
    });
  });

  it("limits how many posts wait and how fast people post", async () => {
    for (let n = 0; n < FORUM_LIMITS.pending; n++)
      await startTopic(bob, `Waiting topic ${String(n)}`, "x", {
        now: minutes(n),
      });
    const tree = await loadTree(handle.db);
    expect(
      await createTopic(handle.db, {
        tree,
        forum: await forum(),
        author: await fresh(bob),
        title: "One too many",
        body: "x",
        now: minutes(5),
      }),
    ).toEqual({ ok: false, error: "too-many-pending" });

    await trust(alice);
    const { topic } = await startTopic(alice, "Busy topic", "x");
    let last;
    for (let n = 0; n < FORUM_LIMITS.burst.count; n++)
      last = await reply(alice, topic.id, `reply ${String(n)}`, minutes(1));
    expect(last).toEqual({ ok: false, error: "rate-limited" });
  });

  it("stops replies to locked topics, except from moderators", async () => {
    await trust(alice);
    const { topic, post } = await startTopic(alice, "Will be locked", "x");
    const full = await getTopic(handle.db, topic.id);
    if (!full) throw new Error("no topic");
    await moderatePost(handle.db, {
      topic: full,
      post,
      action: "lock",
      by: admin.id,
    });
    expect(await reply(alice, topic.id, "can I?")).toEqual({
      ok: false,
      error: "forbidden",
    });
    expect((await reply(admin, topic.id, "I can")).ok).toBe(true);
  });

  it("links mentions only to public profiles", async () => {
    await trust(alice);
    await handle.db
      .update(users)
      .set({ profilePublic: false })
      .where(eq(users.id, bob.id));
    const { post } = await startTopic(alice, "Mentions", "Hi @bob and @alice");
    expect(post.html).toContain('href="/people/alice/"');
    expect(post.html).not.toContain('href="/people/bob/"');
  });
});

describe("editing and deleting", () => {
  it("lets authors edit their posts and the opening post's title", async () => {
    await trust(alice);
    const { topic, post } = await startTopic(alice, "Old title", "old text");
    const tree = await loadTree(handle.db);
    const general = await forum();
    const full = await getTopic(handle.db, topic.id);
    if (!full) throw new Error("no topic");
    const edited = await editPost(handle.db, {
      tree,
      forum: general,
      topic: full,
      post,
      editor: await fresh(alice),
      body: "new *text*",
      title: "New title",
      now: minutes(3),
    });
    expect(edited.ok && edited.value.html).toContain("<em>text</em>");
    expect(edited.ok && edited.value.editedAt).toEqual(minutes(3));
    expect((await getTopic(handle.db, topic.id))?.slug).toBe("new-title");

    expect(
      await editPost(handle.db, {
        tree,
        forum: general,
        topic: full,
        post,
        editor: await fresh(bob),
        body: "hijack",
      }),
    ).toEqual({ ok: false, error: "forbidden" });
    expect(
      (
        await editPost(handle.db, {
          tree,
          forum: general,
          topic: full,
          post,
          editor: admin,
          body: "moderated",
        })
      ).ok,
    ).toBe(true);
  });

  it("deletes a reply, and a topic only while nobody else replied", async () => {
    await trust(alice);
    await trust(bob);
    const { topic, post } = await startTopic(alice, "Short-lived", "x");
    const answer = await reply(bob, topic.id, "an answer");
    if (!answer.ok) throw new Error("reply refused");
    const tree = await loadTree(handle.db);
    const general = await forum();
    const full = await getTopic(handle.db, topic.id);
    if (!full) throw new Error("no topic");

    expect(
      await deletePost(handle.db, {
        tree,
        forum: general,
        topic: full,
        post,
        by: await fresh(alice),
      }),
    ).toEqual({ ok: false, error: "forbidden" });

    expect(
      await deletePost(handle.db, {
        tree,
        forum: general,
        topic: full,
        post: answer.value,
        by: await fresh(bob),
      }),
    ).toEqual({ ok: true, value: { topicDeleted: false } });
    expect(await getPost(handle.db, answer.value.id)).toBeUndefined();
    expect((await getTopic(handle.db, topic.id))?.replyCount).toBe(0);

    expect(
      await deletePost(handle.db, {
        tree,
        forum: general,
        topic: full,
        post,
        by: await fresh(alice),
      }),
    ).toEqual({ ok: true, value: { topicDeleted: true } });
    expect(await getTopic(handle.db, topic.id)).toBeUndefined();
    expect((await forum()).topicCount).toBe(0);
  });

  it("hides posts from everyone but moderators", async () => {
    await trust(alice);
    const { topic, post } = await startTopic(alice, "To be hidden", "x");
    const full = await getTopic(handle.db, topic.id);
    if (!full) throw new Error("no topic");
    await moderatePost(handle.db, {
      topic: full,
      post,
      action: "hide",
      by: admin.id,
    });
    const hidden = await getTopic(handle.db, topic.id);
    if (!hidden) throw new Error("no topic");
    expect(hidden.state).toBe("hidden");
    const posts = async (mod: boolean) =>
      (
        await listPosts(handle.db, {
          topic: hidden,
          viewer: null,
          mod,
          page: 1,
        })
      ).total;
    expect(await posts(false)).toBe(0);
    expect(await posts(true)).toBe(1);
  });
});

describe("reading", () => {
  it("pins topics first, then the latest activity", async () => {
    await trust(alice);
    const a = await startTopic(alice, "Topic A", "x", { now: minutes(0) });
    await startTopic(alice, "Topic B", "x", { now: minutes(1) });
    const c = await startTopic(alice, "Topic C", "x", { now: minutes(2) });
    await reply(alice, a.topic.id, "bump", minutes(3));
    const general = await forum();
    const titles = async () =>
      (
        await listTopics(handle.db, {
          forum: general,
          viewer: null,
          mod: false,
          page: 1,
        })
      ).topics.map((row) => row.topic.title);
    expect(await titles()).toEqual(["Topic A", "Topic C", "Topic B"]);
    const full = await getTopic(handle.db, c.topic.id);
    if (!full) throw new Error("no topic");
    await moderatePost(handle.db, {
      topic: full,
      post: c.post,
      action: "pin-global",
      by: admin.id,
    });
    expect(await titles()).toEqual(["Topic C", "Topic A", "Topic B"]);
    const tree = await loadTree(handle.db);
    expect(
      (
        await recentTopics(handle.db, {
          tree,
          viewer: null,
          limit: 5,
          announcements: true,
        })
      ).map((row) => row.topic.title),
    ).toEqual(["Topic C"]);
  });

  it("finds the page a post is on", async () => {
    await trust(alice);
    const { topic } = await startTopic(alice, "Long topic", "x");
    for (let n = 0; n < FORUM_LIMITS.postsPerPage; n++) {
      await handle.db.insert(forumPosts).values({
        topicId: topic.id,
        authorId: alice.id,
        body: `reply ${String(n)}`,
        state: "published",
        createdAt: minutes(n + 1),
      });
    }
    const [last] = await handle.db
      .select()
      .from(forumPosts)
      .where(eq(forumPosts.topicId, topic.id))
      .orderBy(forumPosts.id);
    if (!last) throw new Error("no posts");
    const current = await getTopic(handle.db, topic.id);
    if (!current) throw new Error("no topic");
    expect(
      await pageOfPost(handle.db, last, current, "classic", null, false),
    ).toBe(1);
    const all = await handle.db
      .select()
      .from(forumPosts)
      .where(eq(forumPosts.topicId, topic.id))
      .orderBy(forumPosts.id);
    const final = all.at(-1);
    if (!final) throw new Error("no posts");
    expect(
      await pageOfPost(handle.db, final, current, "classic", null, false),
    ).toBe(2);
  });

  it("keeps hidden forums out of lists, search and the tree", async () => {
    await trust(alice);
    await startTopic(alice, "Secret plans", "about rockets", { forum: "help" });
    await handle.db
      .update(forums)
      .set({ hidden: true })
      .where(eq(forums.slug, "site"));
    const tree = await loadTree(handle.db);
    expect(tree.visible(null).find("help")).toBeUndefined();
    expect(
      tree.visible(await forumViewer(handle.db, tree, admin)).find("help"),
    ).toBeDefined();
    expect(
      await recentTopics(handle.db, { tree, viewer: null, limit: 5 }),
    ).toEqual([]);
    expect(
      await searchForum(handle.db, { q: "rockets", tree, viewer: null }),
    ).toEqual([]);
    expect(
      (
        await searchForum(handle.db, {
          q: "rockets",
          tree,
          viewer: await forumViewer(handle.db, tree, admin),
        })
      ).length,
    ).toBe(1);
  });

  it("searches titles and posts", async () => {
    await trust(alice);
    await startTopic(alice, "Redstone clocks", "How do I build one?");
    const { topic } = await startTopic(alice, "Other things", "Nothing here");
    await reply(alice, topic.id, "Use a comparator for the clock", minutes(1));
    const tree = await loadTree(handle.db);
    const hits = await searchForum(handle.db, {
      q: "clock",
      tree,
      viewer: null,
    });
    expect(hits.map((hit) => hit.topic.title).sort()).toEqual([
      "Other things",
      "Redstone clocks",
    ]);
    expect(
      hits.find((hit) => hit.topic.title === "Other things")?.snippet,
    ).toContain("comparator");
  });

  it("leaves blocked accounts' posts out", async () => {
    await trust(bob);
    await startTopic(bob, "Bob's topic", "x");
    await handle.db
      .update(users)
      .set({ blockedAt: start })
      .where(eq(users.id, bob.id));
    const general = await forum();
    expect(
      (
        await listTopics(handle.db, {
          forum: general,
          viewer: null,
          mod: false,
          page: 1,
        })
      ).total,
    ).toBe(0);
  });
});

describe("accounts", () => {
  it("exports what someone wrote, and keeps posts when the account goes", async () => {
    await trust(alice);
    const { topic } = await startTopic(alice, "Mine", "my text");
    const exported = await forumExport(handle.db, alice.id);
    expect(exported.topics.map((row) => row.title)).toEqual(["Mine"]);
    expect(exported.posts.map((row) => row.body)).toEqual(["my text"]);

    await handle.db.delete(users).where(eq(users.id, alice.id));
    const [kept] = await handle.db
      .select()
      .from(forumTopics)
      .where(eq(forumTopics.id, topic.id));
    expect(kept?.authorId).toBeNull();
  });
});

describe("the admin's tree", () => {
  it("checks forms against the tree", async () => {
    const tree = await loadTree(handle.db);
    const general = await forum();
    const bad = await validateForum(handle.db, tree, {
      ...forumDraft(undefined, general.id),
      name: "Off-topic",
      slug: "search",
    });
    expect(!bad.ok && bad.errors.slug).toBeTruthy();
    const taken = await validateForum(handle.db, tree, {
      ...forumDraft(undefined, general.id),
      name: "General again",
      slug: "general",
    });
    expect(!taken.ok && taken.errors.slug).toBeTruthy();
    const community = await forum("community");
    const loop = await validateForum(
      handle.db,
      tree,
      { ...forumDraft(general), parentId: String(general.id) },
      general,
    );
    expect(!loop.ok && loop.errors.parentId).toBeTruthy();

    const good = await validateForum(handle.db, tree, {
      ...forumDraft(undefined, community.id),
      name: "Off-topic chat",
    });
    expect(good.ok && good.input.slug).toBe("off-topic-chat");
    if (!good.ok) throw new Error("refused");
    const created = await createForum(handle.db, good.input);
    expect(created.sort).toBe(3);
  });

  it("reorders siblings and deletes only empty forums", async () => {
    const tree = await loadTree(handle.db);
    const general = await forum();
    expect(await moveForum(handle.db, tree, general, "up")).toBe(true);
    const after = await loadTree(handle.db);
    expect(
      after.find("community")?.children.map((node) => node.forum.slug),
    ).toEqual(["general", "announcements", "introductions"]);
    expect(await moveForum(handle.db, after, await forum(), "up")).toBe(false);

    expect(await deleteForum(handle.db, after, await forum("community"))).toBe(
      "has-children",
    );
    await trust(alice);
    await startTopic(alice, "Keeps it", "x", { forum: "introductions" });
    expect(
      await deleteForum(handle.db, after, await forum("introductions")),
    ).toBe("has-topics");
    expect(await deleteForum(handle.db, after, await forum("help"))).toBeNull();
    expect((await loadTree(handle.db)).find("help")).toBeUndefined();
  });
});
