import {
  forumGroups,
  forumLog,
  forums,
  openDatabase,
  users,
  type DatabaseHandle,
  type Forum,
  type User,
} from "@trilleo/db";
import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { upsertGitHubUser } from "../auth/accounts";
import { ADMIN_PROFILE } from "../auth/testing";
import { saveAvatar } from "../profile/avatar";
import { forumViewer, isForumModerator, moderatesEverywhere } from "./access";
import {
  addMember,
  addModerator,
  createGroup,
  saveOverrides,
  validateGroup,
  groupDraft,
} from "./groups";
import { readLog } from "./log";
import {
  activeBans,
  banUser,
  createReport,
  liftBan,
  mergeTopic,
  mergedTarget,
  moderatedForumIds,
  moveTopic,
  openReports,
  parseTopicReference,
  postHistory,
  resolveReports,
  splitPosts,
} from "./moderation";
import {
  createReply,
  createTopic,
  editPost,
  getPost,
  getTopic,
  listPosts,
  loadTree,
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
  await trust(alice);
  await trust(bob);
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

async function trust(user: User) {
  await handle.db
    .update(users)
    .set({ trustedAt: start })
    .where(eq(users.id, user.id));
}

async function forum(slug = "general"): Promise<Forum> {
  const node = (await loadTree(handle.db)).find(slug);
  if (!node) throw new Error(`no forum ${slug}`);
  return node.forum;
}

async function topicBy(
  author: User,
  title: string,
  forumSlug = "general",
  now = start,
) {
  const result = await createTopic(handle.db, {
    tree: await loadTree(handle.db),
    forum: await forum(forumSlug),
    author: await fresh(author),
    title,
    body: `${title} text`,
    now,
  });
  if (!result.ok) throw new Error(`refused: ${result.error}`);
  return result.value;
}

async function replyBy(
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
  const result = await createReply(handle.db, {
    tree,
    forum: node.forum,
    topic,
    author: await fresh(author),
    body,
    now,
  });
  if (!result.ok) throw new Error(`refused: ${result.error}`);
  return result.value;
}

async function viewer(user: User | null) {
  const tree = await loadTree(handle.db);
  return {
    tree,
    viewer: await forumViewer(
      handle.db,
      tree,
      user && (await fresh(user)),
      start,
    ),
  };
}

describe("groups and permissions", () => {
  it("starts with the built-in groups and their defaults", async () => {
    const tree = await loadTree(handle.db);
    expect([...tree.groups.keys()]).toEqual([
      "guest",
      "newcomer",
      "member",
      "moderator",
      "admin",
    ]);
    expect(tree.groups.get("newcomer")?.editWindowMinutes).toBe(60);
    expect(tree.groups.get("member")?.permissions["post.skip-review"]).toBe(
      true,
    );
  });

  it("makes a forum members-only with overrides, inherited by its subforums", async () => {
    const tree = await loadTree(handle.db);
    const site = await forum("site");
    const groups = await handle.db.select().from(forumGroups);
    const id = (slug: string) =>
      groups.find((group) => group.slug === slug)?.id ?? 0;
    const form = new FormData();
    form.set(`override:${String(id("guest"))}:forum.view`, "deny");
    form.set(`override:${String(id("newcomer"))}:forum.view`, "deny");
    form.set(`override:${String(id("member"))}:topic.create`, "inherit");
    await saveOverrides(
      handle.db,
      site.id,
      form,
      [...tree.groups.values()].map((group) => group.id ?? 0),
    );

    const after = await loadTree(handle.db);
    const help = after.find("help")?.forum;
    if (!help) throw new Error("no help forum");
    expect(after.canView(help, null)).toBe(false);
    expect(after.canView(help, (await viewer(alice)).viewer)).toBe(true);
    expect(after.overridesOf(site.id).get("guest")?.get("forum.view")).toBe(
      false,
    );
    expect(after.overridesOf(help.id).size).toBe(0);
  });

  it("lets a custom group moderate where a forum allows it", async () => {
    const draft = {
      ...groupDraft(),
      name: "Helpers",
      slug: "helpers",
      title: "Helper",
    };
    const checked = await validateGroup(handle.db, draft);
    if (!checked.ok) throw new Error("refused");
    const helpers = await createGroup(handle.db, checked.input);
    expect(await addMember(handle.db, helpers, "bob")).toBeNull();
    expect(await addMember(handle.db, helpers, "nobody-here")).toBe("no-user");

    const tree = await loadTree(handle.db);
    const help = await forum("help");
    const form = new FormData();
    form.set(`override:${String(helpers.id)}:moderate`, "allow");
    await saveOverrides(handle.db, help.id, form, [helpers.id]);

    const { tree: after, viewer: bobView } = await viewer(bob);
    expect(after.moderates(help, bobView)).toBe(true);
    expect(after.moderates(await forum("general"), bobView)).toBe(false);
    expect(moderatesEverywhere(after, bobView)).toBe(false);
    expect([...moderatedForumIds(after, bobView)]).toEqual([help.id]);
    expect(await isForumModerator(handle.db, await fresh(bob))).toBe(true);
    expect(await isForumModerator(handle.db, await fresh(alice))).toBe(false);
    expect(tree.groups.get("helpers")?.title).toBe("Helper");

    // Their title shows on their posts.
    const { topic } = await topicBy(bob, "Helper's topic", "help");
    const full = await getTopic(handle.db, topic.id);
    if (!full) throw new Error("no topic");
    const listed = await listPosts(handle.db, {
      topic: full,
      viewer: null,
      mod: false,
      page: 1,
    });
    expect(listed.posts[0]?.titles).toEqual(["Helper"]);
  });

  it("assigns moderators to a forum and what's inside it", async () => {
    const site = await forum("site");
    expect(await addModerator(handle.db, site.id, "alice")).toBe(true);
    const { tree, viewer: aliceView } = await viewer(alice);
    expect(tree.moderates(await forum("help"), aliceView)).toBe(true);
    expect(tree.moderates(await forum("general"), aliceView)).toBe(false);
  });

  it("puts the Moderator group in charge everywhere", async () => {
    const [moderators] = await handle.db
      .select()
      .from(forumGroups)
      .where(eq(forumGroups.slug, "moderator"));
    if (!moderators) throw new Error("no group");
    await addMember(handle.db, moderators, "alice");
    const { tree, viewer: aliceView } = await viewer(alice);
    expect(moderatesEverywhere(tree, aliceView)).toBe(true);
    expect(tree.moderates(await forum("announcements"), aliceView)).toBe(true);
  });
});

describe("edit windows and history", () => {
  it("keeps every version and stops edits after the window", async () => {
    const { topic, post } = await topicBy(alice, "Versions");
    const edit = async (
      user: User,
      body: string,
      now: Date,
      title?: string,
    ) => {
      const tree = await loadTree(handle.db);
      const current = await getPost(handle.db, post.id);
      const full = await getTopic(handle.db, topic.id);
      if (!current || !full) throw new Error("gone");
      return editPost(handle.db, {
        tree,
        forum: await forum(),
        topic: full,
        post: current,
        editor: await fresh(user),
        body,
        ...(title ? { title } : {}),
        now,
      });
    };
    expect(
      (await edit(alice, "second", minutes(10), "Versions, renamed")).ok,
    ).toBe(true);
    // Members get a day.
    expect(await edit(alice, "too late", minutes(25 * 60))).toEqual({
      ok: false,
      error: "forbidden",
    });
    // Moderators any time; the log says so.
    expect((await edit(admin, "moderated", minutes(30 * 60))).ok).toBe(true);

    const current = await getPost(handle.db, post.id);
    const full = await getTopic(handle.db, topic.id);
    if (!current || !full) throw new Error("gone");
    const history = await postHistory(handle.db, current, full);
    expect(history.map((version) => version.body)).toEqual([
      "Versions text",
      "second",
      "moderated",
    ]);
    expect(history.map((version) => version.title)).toEqual([
      "Versions",
      "Versions, renamed",
      "Versions, renamed",
    ]);
    expect(history.map((version) => version.editor)).toEqual([
      "alice",
      "alice",
      "site-owner",
    ]);
    const { rows } = await readLog(handle.db);
    expect(rows.map((row) => row.entry.action)).toEqual(["edit"]);
  });
});

describe("moving, merging and splitting", () => {
  it("moves a topic and recounts both forums", async () => {
    const { topic } = await topicBy(alice, "Wrong place");
    const full = await getTopic(handle.db, topic.id);
    if (!full) throw new Error("no topic");
    expect(
      await moveTopic(handle.db, {
        topic: full,
        to: await forum("help"),
        by: admin,
      }),
    ).toBe(true);
    expect((await getTopic(handle.db, topic.id))?.forumId).toBe(
      (await forum("help")).id,
    );
    expect((await forum("general")).topicCount).toBe(0);
    expect((await forum("help")).topicCount).toBe(1);
    expect(
      await moveTopic(handle.db, {
        topic: full,
        to: await forum("community"),
        by: admin,
      }),
    ).toBe(false);
  });

  it("merges a topic into another, and its address follows", async () => {
    const a = await topicBy(alice, "Original", "general", minutes(0));
    const b = await topicBy(bob, "Duplicate", "help", minutes(5));
    await replyBy(alice, b.topic.id, "reply in the duplicate", minutes(6));
    const from = await getTopic(handle.db, b.topic.id);
    const into = await getTopic(handle.db, a.topic.id);
    if (!from || !into) throw new Error("no topic");
    expect(await mergeTopic(handle.db, { from, into, by: admin })).toBe(true);
    expect(await getTopic(handle.db, b.topic.id)).toBeUndefined();
    expect((await mergedTarget(handle.db, b.topic.id))?.id).toBe(a.topic.id);
    expect(await mergedTarget(handle.db, a.topic.id)).toBeUndefined();
    const merged = await getTopic(handle.db, a.topic.id);
    expect(merged?.replyCount).toBe(2);
    expect((await forum("help")).topicCount).toBe(0);
  });

  it("splits posts into a new topic, but not every post", async () => {
    const { topic, post } = await topicBy(alice, "Long thread");
    const off = await replyBy(bob, topic.id, "off on a tangent", minutes(2));
    const more = await replyBy(bob, topic.id, "more tangent", minutes(3));
    const full = await getTopic(handle.db, topic.id);
    if (!full) throw new Error("no topic");
    const split = await splitPosts(handle.db, {
      topic: full,
      postIds: [more.id, off.id],
      title: "The tangent",
      to: await forum("help"),
      by: admin,
    });
    if (!split.ok) throw new Error(split.error);
    expect(split.value.authorId).toBe(bob.id);
    const created = await getTopic(handle.db, split.value.id);
    expect(created?.firstPostId).toBe(off.id);
    expect(created?.replyCount).toBe(1);
    expect((await getTopic(handle.db, topic.id))?.replyCount).toBe(0);

    const after = await getTopic(handle.db, topic.id);
    if (!after) throw new Error("no topic");
    expect(
      await splitPosts(handle.db, {
        topic: after,
        postIds: [post.id],
        title: "Everything",
        to: await forum(),
        by: admin,
      }),
    ).toEqual({ ok: false, error: "forbidden" });
  });

  it("reads topic references", () => {
    expect(parseTopicReference("12")).toBe(12);
    expect(
      parseTopicReference("https://www.trilleo.net/forum/general/12-hello/"),
    ).toBe(12);
    expect(parseTopicReference("/forum/general/12-hello/?page=2#post-4")).toBe(
      12,
    );
    expect(parseTopicReference("hello")).toBeNull();
  });
});

describe("bans", () => {
  it("stops someone posting until the ban ends or is lifted", async () => {
    const ban = await banUser(handle.db, {
      userId: bob.id,
      length: "7d",
      reason: "Spam",
      by: admin,
      now: start,
    });
    expect(ban?.until).toEqual(new Date(start.getTime() + 7 * 86_400_000));
    expect((await viewer(bob)).viewer?.banned).toBe(true);
    const tree = await loadTree(handle.db);
    expect(
      await createTopic(handle.db, {
        tree,
        forum: await forum(),
        author: await fresh(bob),
        title: "Let me in",
        body: "x",
        now: minutes(1),
      }),
    ).toEqual({ ok: false, error: "forbidden" });
    expect(
      (await activeBans(handle.db, minutes(1))).map((row) => row.username),
    ).toEqual(["bob"]);
    // Over after seven days.
    expect(await activeBans(handle.db, minutes(8 * 24 * 60))).toEqual([]);

    expect(await liftBan(handle.db, { banId: ban?.id ?? 0, by: admin })).toBe(
      true,
    );
    expect(await activeBans(handle.db, minutes(1))).toEqual([]);
    const { rows } = await readLog(handle.db);
    expect(rows.map((row) => row.entry.action)).toEqual(["unban", "ban"]);
  });

  it("needs a reason, and nobody bans themselves or the admin", async () => {
    expect(
      await banUser(handle.db, {
        userId: bob.id,
        length: "1d",
        reason: " ",
        by: admin,
      }),
    ).toBeNull();
    expect(
      await banUser(handle.db, {
        userId: admin.id,
        length: "1d",
        reason: "x",
        by: admin,
      }),
    ).toBeNull();
    // Nor is the admin banned by a moderator.
    expect(
      await banUser(handle.db, {
        userId: admin.id,
        length: "1d",
        reason: "x",
        by: await fresh(alice),
      }),
    ).toBeNull();
  });
});

describe("reports", () => {
  let made = 0;
  async function reporters(count: number, ageDays: number) {
    const out: User[] = [];
    for (let n = 0; n < count; n++) {
      made += 1;
      const user = await upsertGitHubUser(handle.db, {
        id: 100 + made,
        login: `reporter-${String(made)}`,
        name: null,
      });
      await handle.db
        .update(users)
        .set({ createdAt: new Date(start.getTime() - ageDays * 86_400_000) })
        .where(eq(users.id, user.id));
      out.push(await fresh(user));
    }
    return out;
  }

  it("hides a post after three reports from established accounts", async () => {
    const { topic } = await topicBy(alice, "Reported topic");
    const bad = await replyBy(bob, topic.id, "buy my stuff");
    const full = await getTopic(handle.db, topic.id);
    if (!full) throw new Error("no topic");
    const report = async (user: User) =>
      createReport(handle.db, {
        reporter: user,
        reason: "spam",
        note: "",
        target: {
          kind: "post",
          post: (await getPost(handle.db, bad.id)) ?? bad,
          topic: full,
        },
        now: start,
      });

    // New accounts don't count; the author can't report themselves; one each.
    const [young] = await reporters(1, 1);
    if (!young) throw new Error("no reporter");
    expect(await report(young)).toEqual({ ok: true, hidden: false });
    expect(await report(young)).toEqual({ ok: false, error: "already" });
    expect(await report(await fresh(bob))).toEqual({ ok: false, error: "own" });

    const [first, second, third] = await reporters(3, 30);
    if (!first || !second || !third) throw new Error("no reporters");
    expect(await report(first)).toEqual({ ok: true, hidden: false });
    expect(await report(second)).toEqual({ ok: true, hidden: false });
    expect(await report(third)).toEqual({ ok: true, hidden: true });
    expect((await getPost(handle.db, bad.id))?.state).toBe("hidden");

    const tree = await loadTree(handle.db);
    const groups = await openReports(handle.db, {
      tree,
      moderatedIds: new Set([(await forum()).id]),
      everywhere: false,
    });
    expect(groups).toHaveLength(1);
    expect(groups[0]?.reports).toHaveLength(4);
    expect(
      await openReports(handle.db, {
        tree,
        moderatedIds: new Set(),
        everywhere: false,
      }),
    ).toEqual([]);

    // Dismissing brings back a post the reports hid.
    const post = await getPost(handle.db, bad.id);
    if (!post) throw new Error("no post");
    expect(
      await resolveReports(handle.db, {
        target: { kind: "post", post, topic: full },
        decision: "dismiss",
        by: admin,
      }),
    ).toBe(true);
    expect((await getPost(handle.db, bad.id))?.state).toBe("published");
    const { rows } = await readLog(handle.db);
    expect(rows.map((row) => row.entry.action)).toEqual([
      "report-dismissed",
      "unhide",
      "auto-hide",
    ]);
  });

  it("reports pictures to those who moderate everywhere, who can remove them", async () => {
    const png = new Uint8Array(64);
    png.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13]);
    png.set(new TextEncoder().encode("IHDR"), 12);
    new DataView(png.buffer).setUint32(16, 32);
    new DataView(png.buffer).setUint32(20, 32);
    expect((await saveAvatar(handle.db, bob.id, png)).ok).toBe(true);
    expect(
      await createReport(handle.db, {
        reporter: await fresh(alice),
        reason: "inappropriate",
        note: "not nice",
        target: { kind: "avatar", userId: bob.id },
      }),
    ).toEqual({ ok: true, hidden: false });
    const tree = await loadTree(handle.db);
    expect(
      await openReports(handle.db, {
        tree,
        moderatedIds: new Set([1, 2, 3]),
        everywhere: false,
      }),
    ).toEqual([]);
    const [group] = await openReports(handle.db, {
      tree,
      moderatedIds: new Set(),
      everywhere: true,
    });
    expect(group?.kind).toBe("avatar");
    expect(group?.reports[0]?.note).toBe("not nice");
    // A post's decisions don't apply to a picture.
    expect(
      await resolveReports(handle.db, {
        target: { kind: "avatar", userId: bob.id },
        decision: "hide",
        by: admin,
      }),
    ).toBe(false);
    expect(
      await resolveReports(handle.db, {
        target: { kind: "avatar", userId: bob.id },
        decision: "remove-avatar",
        by: admin,
      }),
    ).toBe(true);
    expect((await fresh(bob)).avatarHash).toBeNull();
    const actions = (await handle.db.select().from(forumLog)).map(
      (row) => row.action,
    );
    expect(actions.sort()).toEqual(["avatar-removed", "report-actioned"]);
  });
});

describe("moderation logging", () => {
  it("records post moderation with who did it", async () => {
    const { topic, post } = await topicBy(alice, "Logged");
    const full = await getTopic(handle.db, topic.id);
    if (!full) throw new Error("no topic");
    const { moderatePost } = await import("./store");
    await moderatePost(handle.db, {
      topic: full,
      post,
      action: "lock",
      by: admin.id,
    });
    await moderatePost(handle.db, {
      topic: full,
      post,
      action: "pin-forum",
      by: admin.id,
    });
    await handle.db.update(forums).set({ locked: false });
    const { rows } = await readLog(handle.db);
    expect(
      rows.map((row) => [row.entry.action, row.actor, row.target]),
    ).toEqual([
      ["pin", "site-owner", "alice"],
      ["lock", "site-owner", "alice"],
    ]);
    expect(rows[0]?.entry.detail).toBe("Pin: forum");
  });
});
