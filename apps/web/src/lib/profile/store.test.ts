import {
  comments,
  openDatabase,
  posts,
  skygridSaves,
  toolData,
  type DatabaseHandle,
  type User,
} from "@trilleo/db";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createSession, upsertGitHubUser } from "../auth/sessions";
import { blockUser, deleteAccount } from "../comments/store";
import type { ProfileInput } from "./profile";
import {
  PROFILE_COMMENTS,
  exportUserData,
  findProfile,
  updateProfile,
} from "./store";

const now = new Date("2026-03-01T12:00:00Z");
const hoursAgo = (n: number) => new Date(now.getTime() - n * 3_600_000);

const PROFILE: ProfileInput = {
  displayName: "Ada",
  pronouns: "she/her",
  location: "London",
  status: "Computing",
  bio: "Hi *there*",
  links: [{ label: "Site", url: "https://example.com/" }],
  profilePublic: true,
  commentName: "display",
};

let handle: DatabaseHandle;
let ada: User;
let bob: User;

beforeEach(async () => {
  handle = await openDatabase("memory://");
  ada = await upsertGitHubUser(handle.db, {
    id: 10,
    login: "Ada-L",
    name: "Augusta Ada",
  });
  bob = await upsertGitHubUser(handle.db, { id: 11, login: "bob", name: null });
  await handle.db.insert(posts).values([
    {
      slug: "live",
      title: "Live post",
      status: "published",
      publishedAt: hoursAgo(48),
    },
    {
      slug: "later",
      title: "Scheduled",
      status: "published",
      publishedAt: hoursAgo(-48),
    },
    { slug: "draft", title: "Draft", status: "draft" },
  ]);
});
afterEach(async () => {
  await handle.close();
});

describe("updateProfile", () => {
  it("saves the profile, and a later GitHub sign-in keeps it", async () => {
    const saved = await updateProfile(handle.db, ada.id, PROFILE, now);
    expect(saved).toMatchObject({ ...PROFILE, profileUpdatedAt: now });

    const again = await upsertGitHubUser(handle.db, {
      id: 10,
      login: "ada-l",
      name: "New GitHub name",
    });
    expect(again).toMatchObject({
      displayName: "Ada",
      name: "New GitHub name",
      bio: "Hi *there*",
    });
  });

  it("returns null for an account that's gone", async () => {
    await deleteAccount(handle.db, bob.id);
    expect(await updateProfile(handle.db, bob.id, PROFILE)).toBeNull();
  });
});

describe("findProfile", () => {
  it("finds people by login, ignoring case", async () => {
    const found = await findProfile(handle.db, "ada-l", null, now);
    expect(found?.user.id).toBe(ada.id);
    expect(await findProfile(handle.db, "nobody", null, now)).toBeNull();
  });

  it("hides a private profile from everyone but its owner", async () => {
    await updateProfile(handle.db, ada.id, {
      ...PROFILE,
      profilePublic: false,
    });
    expect(await findProfile(handle.db, "Ada-L", null, now)).toBeNull();
    expect(await findProfile(handle.db, "Ada-L", bob.id, now)).toBeNull();
    expect((await findProfile(handle.db, "Ada-L", ada.id, now))?.user.id).toBe(
      ada.id,
    );
  });

  it("hides blocked accounts, even from themselves", async () => {
    await blockUser(handle.db, ada.id);
    expect(await findProfile(handle.db, "Ada-L", ada.id, now)).toBeNull();
  });

  it("lists only published comments on public posts, newest first", async () => {
    const comment = (
      postSlug: string,
      body: string,
      hours: number,
      extra: Partial<typeof comments.$inferInsert> = {},
    ) => ({
      postSlug,
      body,
      authorId: ada.id,
      status: "published" as const,
      createdAt: hoursAgo(hours),
      ...extra,
    });
    await handle.db
      .insert(comments)
      .values([
        comment("live", "old", 10),
        comment("live", "new", 1),
        comment("live", "waiting", 2, { status: "pending" }),
        comment("live", "hidden", 3, { status: "hidden" }),
        comment("live", "gone", 4, { deletedAt: hoursAgo(1) }),
        comment("later", "on a scheduled post", 5),
        comment("draft", "on a draft", 6),
        comment("live", "bob's", 1, { authorId: bob.id }),
      ]);

    const found = await findProfile(handle.db, "ada-l", null, now);
    expect(found?.comments.map((c) => c.body)).toEqual(["new", "old"]);
    expect(found?.comments[0]).toMatchObject({
      postSlug: "live",
      postTitle: "Live post",
    });
    expect(found?.commentCount).toBe(2);
  });

  it("shows a limited number of comments but counts them all", async () => {
    await handle.db.insert(comments).values(
      Array.from({ length: PROFILE_COMMENTS + 2 }, (_, index) => ({
        postSlug: "live",
        body: `c${String(index)}`,
        authorId: ada.id,
        status: "published" as const,
        createdAt: hoursAgo(index + 1),
      })),
    );
    const found = await findProfile(handle.db, "ada-l", null, now);
    expect(found?.comments).toHaveLength(PROFILE_COMMENTS);
    expect(found?.commentCount).toBe(PROFILE_COMMENTS + 2);
  });
});

describe("exportUserData", () => {
  it("includes their account, profile, sessions, comments, tool data and games", async () => {
    await updateProfile(handle.db, ada.id, PROFILE, now);
    const { session } = await createSession(handle.db, ada.id, now, "Firefox");
    await createSession(handle.db, bob.id, now);
    await handle.db.insert(comments).values([
      { postSlug: "live", body: "mine", authorId: ada.id, status: "pending" },
      { postSlug: "live", body: "bob's", authorId: bob.id },
    ]);
    await handle.db.insert(toolData).values([
      { userId: ada.id, tool: "notes", key: "a", value: { text: "hi" } },
      { userId: bob.id, tool: "notes", key: "b", value: { text: "no" } },
    ]);
    await handle.db
      .insert(skygridSaves)
      .values({ userId: ada.id, state: { coins: 5 }, version: 3 });

    const data = await exportUserData(handle.db, ada.id, now);
    expect(data).toMatchObject({
      exportedAt: now.toISOString(),
      account: { username: "Ada-L", githubId: 10, githubName: "Augusta Ada" },
      profile: { displayName: "Ada", public: true, links: PROFILE.links },
      sessions: [{ userAgent: "Firefox", createdAt: now }],
      comments: [{ body: "mine", status: "pending", post: "live" }],
      toolData: [{ tool: "notes", key: "a", value: { text: "hi" } }],
      games: { skygrid: { state: { coins: 5 }, version: 3 } },
    });
    expect(data?.comments).toHaveLength(1);
    expect(data?.toolData).toHaveLength(1);
    // Session ids are what the cookie proves; they stay out of the file.
    expect(JSON.stringify(data)).not.toContain(session.id);
  });

  it("has no island for someone who never played", async () => {
    const data = await exportUserData(handle.db, bob.id, now);
    expect(data?.games).toEqual({ skygrid: null });
  });

  it("returns null for an unknown account", async () => {
    await deleteAccount(handle.db, bob.id);
    expect(await exportUserData(handle.db, bob.id)).toBeNull();
  });
});
