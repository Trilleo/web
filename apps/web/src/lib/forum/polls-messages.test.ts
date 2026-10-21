import {
  files,
  mailMessages,
  openDatabase,
  users,
  type DatabaseHandle,
  type Forum,
  type StoredFile,
  type User,
} from "@trilleo/db";
import { validatePoll } from "@trilleo/forum";
import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { upsertGitHubUser } from "../auth/accounts";
import { ADMIN_PROFILE } from "../auth/testing";
import {
  attachUpload,
  attachmentsFor,
  forumTrustedUpload,
  linkAttachments,
} from "./attachments";
import {
  block,
  leaveConversation,
  listConversations,
  listMessages,
  membershipOf,
  messagingRole,
  reportMessage,
  sendMessage,
  setMuted,
  startConversation,
  unreadConversations,
} from "./conversations";
import { openReports, resolveReports } from "./moderation";
import { listNotifications, saveSettings } from "./notifications";
import {
  closePoll,
  notifyClosedPolls,
  pollFor,
  pollOfTopic,
  votePoll,
} from "./polls";
import { createTopic, loadTree } from "./store";

process.env.ADMIN_GITHUB_IDS = String(ADMIN_PROFILE.id);

const start = new Date("2026-03-01T12:00:00Z");
const minutes = (n: number) => new Date(start.getTime() + n * 60_000);

let handle: DatabaseHandle;
let admin: User;
let alice: User;
let bob: User;
let carol: User;

async function person(
  id: number,
  login: string,
  trusted = true,
): Promise<User> {
  const user = await upsertGitHubUser(handle.db, { id, login, name: null });
  const [updated] = await handle.db
    .update(users)
    .set({
      email: `${login}@example.com`,
      emailVerifiedAt: start,
      emailToken: `token-${login}-0123456789abcdef`,
      trustedAt: trusted ? start : null,
    })
    .where(eq(users.id, user.id))
    .returning();
  if (!updated) throw new Error("no user");
  return updated;
}

beforeEach(async () => {
  handle = await openDatabase("memory://");
  admin = await person(ADMIN_PROFILE.id, ADMIN_PROFILE.login);
  alice = await person(2, "alice");
  bob = await person(3, "bob");
  carol = await person(4, "carol", false);
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

describe("polls", () => {
  async function pollTopic(
    options: {
      multiple?: boolean;
      maxChoices?: string;
      resultsBeforeVote?: boolean;
      length?: string;
    } = {},
  ) {
    const checked = validatePoll(
      {
        question: "Best block?",
        options: "Stone\nDirt\nGlass",
        multiple: options.multiple ?? false,
        maxChoices: options.maxChoices ?? "",
        length: options.length ?? "never",
        resultsBeforeVote: options.resultsBeforeVote ?? false,
      },
      start,
    );
    if (!checked.ok) throw new Error("bad poll");
    const result = await createTopic(handle.db, {
      tree: await loadTree(handle.db),
      forum: await forum(),
      author: await fresh(alice),
      title: "A poll topic",
      body: "Vote!",
      poll: checked.poll,
      now: start,
    });
    if (!result.ok) throw new Error(result.error);
    const poll = await pollOfTopic(handle.db, result.value.topic.id);
    if (!poll) throw new Error("no poll");
    return { topic: result.value.topic, poll };
  }

  it("takes one vote each, lets it change, and shows results after voting", async () => {
    const { topic, poll } = await pollTopic();
    const view = await pollFor(handle.db, topic.id, bob.id);
    expect(view?.showResults).toBe(false);
    const [stone, dirt] = view?.options ?? [];
    if (!stone || !dirt) throw new Error("no options");
    expect(
      await votePoll(handle.db, {
        poll,
        userId: bob.id,
        optionIds: [stone.id, dirt.id],
      }),
    ).toBe("invalid");
    expect(
      await votePoll(handle.db, {
        poll,
        userId: bob.id,
        optionIds: [stone.id],
      }),
    ).toBeNull();
    expect(
      await votePoll(handle.db, { poll, userId: bob.id, optionIds: [dirt.id] }),
    ).toBeNull();
    const after = await pollFor(handle.db, topic.id, bob.id, {
      withVoters: true,
    });
    expect(after?.showResults).toBe(true);
    expect(after?.mine).toEqual([dirt.id]);
    expect(
      after?.options.map((option) => [
        option.label,
        option.votes,
        option.voters,
      ]),
    ).toEqual([
      ["Stone", 0, []],
      ["Dirt", 1, ["bob"]],
      ["Glass", 0, []],
    ]);
    // Members don't see names.
    expect(
      (await pollFor(handle.db, topic.id, alice.id))?.options[1]?.voters,
    ).toEqual([]);
  });

  it("allows several choices up to its limit, and stops when closed", async () => {
    const { topic, poll } = await pollTopic({
      multiple: true,
      maxChoices: "2",
    });
    const ids = ((await pollFor(handle.db, topic.id, null))?.options ?? []).map(
      (option) => option.id,
    );
    expect(
      await votePoll(handle.db, { poll, userId: bob.id, optionIds: ids }),
    ).toBe("invalid");
    expect(
      await votePoll(handle.db, {
        poll,
        userId: bob.id,
        optionIds: ids.slice(0, 2),
      }),
    ).toBeNull();
    await closePoll(handle.db, poll, minutes(1));
    const closed = await pollOfTopic(handle.db, topic.id);
    if (!closed) throw new Error("gone");
    expect(
      await votePoll(handle.db, {
        poll: closed,
        userId: alice.id,
        optionIds: ids.slice(0, 1),
        now: minutes(2),
      }),
    ).toBe("closed");
    expect((await pollFor(handle.db, topic.id, null))?.showResults).toBe(true);
    // Its asker hears it closed, once.
    expect(await notifyClosedPolls(handle.db, minutes(3))).toBe(1);
    expect(await notifyClosedPolls(handle.db, minutes(4))).toBe(0);
    expect(
      (await listNotifications(handle.db, alice.id)).map((item) => item.kind),
    ).toEqual(["poll-closed"]);
  });

  it("closes on its date", async () => {
    const { topic } = await pollTopic({
      length: "1d",
      resultsBeforeVote: true,
    });
    expect(
      (await pollFor(handle.db, topic.id, null, { now: minutes(60) }))?.open,
    ).toBe(true);
    expect(
      (await pollFor(handle.db, topic.id, null, { now: minutes(25 * 60) }))
        ?.open,
    ).toBe(false);
  });
});

describe("attachments", () => {
  async function upload(
    owner: User,
    name: string,
    status: StoredFile["status"] = "uploading",
  ) {
    const id = `file${Math.random().toString(36).slice(2, 10)}`;
    await handle.db.insert(files).values({
      id,
      ownerId: owner.id,
      purpose: "forum",
      name,
      key: `forum/${id}`,
      size: 1234,
      contentType: "image/png",
      kind: "image",
      label: name,
      status,
    });
    return id;
  }

  it("keeps uploads for the uploader's next post, and shows what's public", async () => {
    const picture = await upload(bob, "shot.png");
    const other = await upload(alice, "theirs.png");
    expect(
      await attachUpload(handle.db, { userId: bob.id, fileId: picture }),
    ).toEqual({ ok: true });
    expect(
      (await attachUpload(handle.db, { userId: bob.id, fileId: other })).ok,
    ).toBe(false);

    const result = await createTopic(handle.db, {
      tree: await loadTree(handle.db),
      forum: await forum(),
      author: await fresh(bob),
      title: "With a picture",
      body: "Look",
      attachments: [picture, other],
      now: start,
    });
    if (!result.ok) throw new Error(result.error);
    const postId = result.value.post.id;
    // Still uploading: only bob (and moderators) see it, marked as waiting.
    const forBob = await attachmentsFor(handle.db, null, [postId], {
      id: bob.id,
      mod: false,
    });
    expect(
      forBob.get(postId)?.map((item) => [item.name, item.image, item.waiting]),
    ).toEqual([["shot.png", true, true]]);
    expect(
      (
        await attachmentsFor(handle.db, null, [postId], {
          id: alice.id,
          mod: false,
        })
      ).get(postId),
    ).toBeUndefined();
    expect(
      (
        await attachmentsFor(handle.db, null, [postId], {
          id: admin.id,
          mod: true,
        })
      ).get(postId),
    ).toHaveLength(1);

    await handle.db
      .update(files)
      .set({ status: "published" })
      .where(eq(files.id, picture));
    expect(
      (
        await attachmentsFor(handle.db, null, [postId], {
          id: null,
          mod: false,
        })
      ).get(postId)?.[0]?.waiting,
    ).toBe(false);
    await handle.db
      .update(files)
      .set({ status: "removed" })
      .where(eq(files.id, picture));
    expect(
      (
        await attachmentsFor(handle.db, null, [postId], {
          id: bob.id,
          mod: false,
        })
      ).get(postId),
    ).toBeUndefined();
  });

  it("caps files per post, and waives review for members the forum trusts", async () => {
    const ids: string[] = [];
    for (let n = 0; n < 7; n++) {
      const id = await upload(bob, `${String(n)}.png`);
      await attachUpload(handle.db, { userId: bob.id, fileId: id });
      ids.push(id);
    }
    const result = await createTopic(handle.db, {
      tree: await loadTree(handle.db),
      forum: await forum(),
      author: await fresh(bob),
      title: "Many files",
      body: "x",
      now: start,
    });
    if (!result.ok) throw new Error(result.error);
    expect(
      await linkAttachments(handle.db, {
        userId: bob.id,
        postId: result.value.post.id,
        fileIds: ids,
      }),
    ).toBe(5);
    expect(
      await forumTrustedUpload(handle.db, {
        ownerId: bob.id,
        purpose: "forum",
      }),
    ).toBe(true);
    expect(
      await forumTrustedUpload(handle.db, {
        ownerId: carol.id,
        purpose: "forum",
      }),
    ).toBe(false);
    expect(
      await forumTrustedUpload(handle.db, {
        ownerId: bob.id,
        purpose: "wiki-media",
      }),
    ).toBe(false);
  });
});

describe("private messages", () => {
  async function converse(sender: User, to: string[], body = "Hello") {
    return startConversation(handle.db, {
      tree: await loadTree(handle.db),
      sender: await fresh(sender),
      to,
      subject: "Hi there",
      body,
      now: start,
    });
  }

  it("lets trusted members talk, and tells the others", async () => {
    const started = await converse(alice, ["bob", "admin"]);
    expect(started.ok).toBe(false);
    const result = await converse(alice, ["bob", "site-owner"]);
    if (!result.ok) throw new Error(result.error);
    const id = result.value.id;
    expect(await unreadConversations(handle.db, bob.id)).toBe(1);
    expect(await unreadConversations(handle.db, alice.id)).toBe(0);
    expect(
      (await listNotifications(handle.db, bob.id)).map((item) => [
        item.kind,
        item.href,
      ]),
    ).toEqual([["message", `/account/messages/${String(id)}/`]]);
    // Emailed at once, without the message in it.
    const mail = await handle.db
      .select()
      .from(mailMessages)
      .where(eq(mailMessages.toAddress, "bob@example.com"));
    expect(mail[0]?.subject).toBe("@alice sent you a message");
    expect(mail[0]?.textBody).not.toContain("Hello");

    const reply = await sendMessage(handle.db, {
      tree: await loadTree(handle.db),
      sender: await fresh(bob),
      conversationId: id,
      body: "Hi alice",
      now: minutes(1),
    });
    expect(reply.ok).toBe(true);
    const membership = await membershipOf(handle.db, id, alice.id);
    if (!membership) throw new Error("not a member");
    expect(
      (await listMessages(handle.db, membership, alice.id)).map(
        (view) => view.message.body,
      ),
    ).toEqual(["Hello", "Hi alice"]);
    expect(
      (await listConversations(handle.db, alice.id))[0]?.people.sort(),
    ).toEqual(["bob", "site-owner"]);
  });

  it("keeps newcomers from sending, and follows people's settings", async () => {
    expect(
      (
        await messagingRole(
          handle.db,
          await loadTree(handle.db),
          await fresh(carol),
        )
      ).problem,
    ).toBe("not-allowed");
    expect(await converse(carol, ["bob"])).toEqual({
      ok: false,
      error: "not-allowed",
    });

    await saveSettings(handle.db, bob.id, { messages: "nobody" });
    expect(await converse(alice, ["bob"])).toEqual({
      ok: false,
      error: "cannot-reach",
    });
    // Staff can always reach people.
    expect((await converse(admin, ["bob"])).ok).toBe(true);

    await saveSettings(handle.db, bob.id, { messages: "contacts" });
    expect(await converse(alice, ["bob"])).toEqual({
      ok: false,
      error: "cannot-reach",
    });
    // The admin and bob have talked; alice and bob haven't.
    await saveSettings(handle.db, alice.id, { messages: "contacts" });
    expect((await converse(bob, ["site-owner"])).ok).toBe(true);
  });

  it("blocks both ways, mutes and leaves", async () => {
    const result = await converse(alice, ["bob"]);
    if (!result.ok) throw new Error(result.error);
    const id = result.value.id;
    await block(handle.db, bob.id, alice.id);
    expect(await converse(alice, ["bob"])).toEqual({
      ok: false,
      error: "cannot-reach",
    });
    const bobView = await membershipOf(handle.db, id, bob.id);
    if (!bobView) throw new Error("not a member");
    expect(await listMessages(handle.db, bobView, bob.id)).toEqual([]);

    await setMuted(handle.db, id, alice.id, true);
    await sendMessage(handle.db, {
      tree: await loadTree(handle.db),
      sender: await fresh(bob),
      conversationId: id,
      body: "quiet",
      now: minutes(1),
    });
    expect(await listNotifications(handle.db, alice.id)).toEqual([]);

    await leaveConversation(handle.db, id, alice.id, minutes(2));
    expect(await listConversations(handle.db, alice.id)).toEqual([]);
    expect(
      await sendMessage(handle.db, {
        tree: await loadTree(handle.db),
        sender: await fresh(alice),
        conversationId: id,
        body: "back?",
      }),
    ).toEqual({ ok: false, error: "not-member" });
  });

  it("shows reported messages to the admin only, who can delete them", async () => {
    const result = await converse(alice, ["bob"], "Rude words");
    if (!result.ok) throw new Error(result.error);
    const membership = await membershipOf(handle.db, result.value.id, bob.id);
    if (!membership) throw new Error("not a member");
    const [message] = await listMessages(handle.db, membership, bob.id);
    if (!message) throw new Error("no message");
    expect(
      await reportMessage(handle.db, {
        reporter: await fresh(alice),
        messageId: message.message.id,
        reason: "harassment",
        note: "",
      }),
    ).toBe("own");
    expect(
      await reportMessage(handle.db, {
        reporter: await fresh(carol),
        messageId: message.message.id,
        reason: "harassment",
        note: "",
      }),
    ).toBe("not-found");
    expect(
      await reportMessage(handle.db, {
        reporter: await fresh(bob),
        messageId: message.message.id,
        reason: "harassment",
        note: "rude",
      }),
    ).toBe("ok");

    const tree = await loadTree(handle.db);
    const everyForum = new Set(tree.flat().map((node) => node.forum.id));
    expect(
      await openReports(handle.db, {
        tree,
        moderatedIds: everyForum,
        everywhere: true,
      }),
    ).toEqual([]);
    const [group] = await openReports(handle.db, {
      tree,
      moderatedIds: everyForum,
      everywhere: true,
      admin: true,
    });
    expect(group?.kind).toBe("message");
    expect(group?.message?.thread.map((item) => item.author)).toEqual([
      "alice",
    ]);

    expect(
      await resolveReports(handle.db, {
        target: { kind: "message", messageId: message.message.id },
        decision: "delete-message",
        by: admin,
      }),
    ).toBe(true);
    expect(await listMessages(handle.db, membership, bob.id)).toEqual([]);
  });

  it("caps how many people a conversation has", async () => {
    const names: string[] = [];
    for (let n = 0; n < 10; n++) {
      const extra = await person(100 + n, `member-${String(n)}`);
      names.push(extra.username);
    }
    expect(await converse(alice, names)).toEqual({
      ok: false,
      error: "too-many",
    });
  });
});
