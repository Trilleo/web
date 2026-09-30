import {
  comments,
  openDatabase,
  posts,
  postSlugs,
  type DatabaseHandle,
  type User,
} from "@trilleo/db";
import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { upsertGitHubUser } from "../auth/sessions";
import {
  createComment,
  listThreads,
  moderateComment,
  pinComment,
  unpinComment,
} from "../comments/store";
import type { PostInput } from "./input";
import { RENDER_VERSION } from "./render";
import {
  createPost,
  deletePost,
  ensureRendered,
  findPostByPreviewToken,
  findPublicPost,
  listAdminPosts,
  listPublicPosts,
  newPreviewToken,
  searchPosts,
  setPreviewToken,
  updatePost,
} from "./store";

const now = new Date("2026-06-01T12:00:00Z");
const days = (n: number) => new Date(now.getTime() + n * 86_400_000);

let handle: DatabaseHandle;
let admin: User;

beforeEach(async () => {
  handle = await openDatabase("memory://");
  admin = await upsertGitHubUser(handle.db, {
    id: 1,
    login: "owner",
    name: "Owner",
  });
});
afterEach(async () => {
  await handle.close();
});

function input(overrides: Partial<PostInput> = {}): PostInput {
  return {
    title: "Hello",
    slug: "hello",
    description: "A first post.",
    body: "## Intro\n\nSome *text* about Docker containers.",
    tags: ["Docker"],
    publishedAt: null,
    commentMode: "open",
    revised: false,
    seoTitle: "",
    seoDescription: "",
    ...overrides,
  };
}

async function create(
  overrides: Partial<PostInput> = {},
  action: "save" | "publish" = "publish",
) {
  const result = await createPost(handle.db, input(overrides), action, now);
  if (!result.ok) throw new Error(JSON.stringify(result.errors));
  return result.post;
}

describe("the imported posts", () => {
  it("arrive as drafts and render when first read", async () => {
    const rows = await handle.db.select().from(posts);
    expect(rows.map((row) => row.slug).sort()).toEqual([
      "a-home-for-small-tools",
      "rebuilding-this-site",
      "self-hosting-on-a-small-server",
      "why-i-moved-off-wordpress",
    ]);
    expect(
      rows.every((row) => row.status === "draft" && row.renderVersion === 0),
    ).toBe(true);

    const [first] = rows;
    if (!first) throw new Error("no imported posts");
    const rendered = await ensureRendered(handle.db, first);
    expect(rendered.html).toContain("<h2 id=");
    expect(rendered.renderVersion).toBe(RENDER_VERSION);
  });
});

describe("publishing", () => {
  it("renders on save and publishes now when no date is given", async () => {
    const post = await create();
    expect(post.status).toBe("published");
    expect(post.publishedAt).toEqual(now);
    expect(post.html).toContain('<h2 id="intro">');
    expect(post.toc).toEqual([{ depth: 2, slug: "intro", text: "Intro" }]);
    expect((await listPublicPosts(handle.db, now)).map((p) => p.id)).toEqual([
      "hello",
    ]);
  });

  it("keeps drafts private", async () => {
    await create({}, "save");
    expect(await listPublicPosts(handle.db, now)).toEqual([]);
    expect(await findPublicPost(handle.db, "hello", now)).toEqual({
      found: "none",
    });
  });

  it("schedules a post with a future date: public once its time comes", async () => {
    await create({ publishedAt: days(2) });
    expect(await listPublicPosts(handle.db, days(1))).toEqual([]);
    expect((await findPublicPost(handle.db, "hello", days(1))).found).toBe(
      "none",
    );
    expect(
      (await listPublicPosts(handle.db, days(3))).map((p) => p.id),
    ).toEqual(["hello"]);
    expect((await listAdminPosts(handle.db, days(1)))[0]?.state).toBe("draft");
    const summaries = await listAdminPosts(handle.db, days(1));
    expect(summaries.find((p) => p.slug === "hello")?.state).toBe("scheduled");
  });

  it("needs a description to publish, but not to save a draft", async () => {
    const refused = await createPost(
      handle.db,
      input({ description: "" }),
      "publish",
      now,
    );
    expect(refused.ok).toBe(false);
    const saved = await createPost(
      handle.db,
      input({ description: "" }),
      "save",
      now,
    );
    expect(saved.ok).toBe(true);
  });

  it("unpublishes back to a draft", async () => {
    const post = await create();
    const result = await updatePost(
      handle.db,
      post.id,
      input(),
      "unpublish",
      days(1),
    );
    expect(result.ok && result.post.status).toBe("draft");
    expect(await listPublicPosts(handle.db, days(1))).toEqual([]);
  });

  it("marks an edit as an update only when asked, and only once live", async () => {
    const post = await create();
    const quiet = await updatePost(
      handle.db,
      post.id,
      input({ body: "New" }),
      "save",
      days(1),
    );
    expect(quiet.ok && quiet.post.revisedAt).toBeNull();
    const noted = await updatePost(
      handle.db,
      post.id,
      input({ revised: true }),
      "save",
      days(2),
    );
    expect(noted.ok && noted.post.revisedAt).toEqual(days(2));
    expect(noted.ok && noted.post.publishedAt).toEqual(now);
  });
});

describe("slugs", () => {
  it("refuses a slug another post has", async () => {
    await create();
    const again = await createPost(
      handle.db,
      input({ title: "Other" }),
      "save",
      now,
    );
    expect(again).toEqual({
      ok: false,
      errors: { slug: expect.any(String) as string },
    });
  });

  it("redirects a published post's old slug and moves its comments", async () => {
    const post = await create();
    const made = await createComment(handle.db, {
      author: admin,
      isAdmin: true,
      postSlug: "hello",
      parentId: null,
      body: "First!",
    });
    if (!made.ok) throw new Error("comment refused");

    await updatePost(
      handle.db,
      post.id,
      input({ slug: "hello-there" }),
      "save",
      days(1),
    );
    expect(await findPublicPost(handle.db, "hello", days(1))).toEqual({
      found: "redirect",
      slug: "hello-there",
    });
    const { count } = await listThreads(handle.db, "hello-there", null);
    expect(count).toBe(1);

    // Taking the old slug back replaces the redirect.
    await updatePost(
      handle.db,
      post.id,
      input({ slug: "hello" }),
      "save",
      days(2),
    );
    expect((await findPublicPost(handle.db, "hello", days(2))).found).toBe(
      "post",
    );
    expect(
      (await findPublicPost(handle.db, "hello-there", days(2))).found,
    ).toBe("redirect");
  });

  it("doesn't keep redirects for drafts nobody could see", async () => {
    const post = await create({}, "save");
    await updatePost(
      handle.db,
      post.id,
      input({ slug: "renamed" }),
      "save",
      now,
    );
    expect(await handle.db.select().from(postSlugs)).toEqual([]);
  });
});

describe("deletePost", () => {
  it("removes the post with its comments and old slugs", async () => {
    const post = await create();
    await createComment(handle.db, {
      author: admin,
      isAdmin: true,
      postSlug: "hello",
      parentId: null,
      body: "Bye",
    });
    await updatePost(
      handle.db,
      post.id,
      input({ slug: "moved" }),
      "save",
      days(1),
    );
    expect(await deletePost(handle.db, post.id)).toBe(true);
    expect(await handle.db.select().from(comments)).toEqual([]);
    expect(await handle.db.select().from(postSlugs)).toEqual([]);
    expect(await deletePost(handle.db, post.id)).toBe(false);
  });
});

describe("preview links", () => {
  it("find a draft by its token until it's revoked", async () => {
    const post = await create({}, "save");
    const token = newPreviewToken();
    expect(token).toMatch(/^[A-Za-z0-9_-]{32}$/);
    await setPreviewToken(handle.db, post.id, token);
    expect((await findPostByPreviewToken(handle.db, token))?.id).toBe(post.id);
    expect(await findPostByPreviewToken(handle.db, "short")).toBeUndefined();
    await setPreviewToken(handle.db, post.id, null);
    expect(await findPostByPreviewToken(handle.db, token)).toBeUndefined();
  });
});

describe("searchPosts", () => {
  it("finds public posts by word stem and highlights the match safely", async () => {
    await create({ body: "Running containers with Docker & friends." });
    await create(
      { title: "Hidden", slug: "hidden", body: "Docker draft" },
      "save",
    );
    const results = await searchPosts(handle.db, "run docker", now);
    expect(results.map((r) => r.slug)).toEqual(["hello"]);
    expect(results[0]?.excerpt).toContain("<mark>Docker</mark>");
    expect(results[0]?.excerpt).toContain("&amp; friends");
    expect(await searchPosts(handle.db, "   ", now)).toEqual([]);
  });
});

describe("pinning", () => {
  async function comment(body: string, parentId: number | null = null) {
    const made = await createComment(handle.db, {
      author: admin,
      isAdmin: true,
      postSlug: "hello",
      parentId,
      body,
    });
    if (!made.ok) throw new Error("comment refused");
    return made.comment;
  }

  async function pinnedId() {
    const [row] = await handle.db
      .select()
      .from(posts)
      .where(eq(posts.slug, "hello"));
    return row?.pinnedCommentId ?? null;
  }

  it("shows the pinned thread first; pinning another replaces it", async () => {
    await create();
    const first = await comment("one");
    const second = await comment("two");

    expect(await pinComment(handle.db, second.id)).toBe("hello");
    const { threads } = await listThreads(
      handle.db,
      "hello",
      null,
      await pinnedId(),
    );
    expect(threads.map((t) => [t.comment.id, t.comment.pinned])).toEqual([
      [second.id, true],
      [first.id, false],
    ]);

    await pinComment(handle.db, first.id);
    expect(await pinnedId()).toBe(first.id);
    expect(await unpinComment(handle.db, first.id)).toBe(true);
    expect(await pinnedId()).toBeNull();
  });

  it("won't pin replies, and hiding a pinned comment unpins it", async () => {
    await create();
    const top = await comment("top");
    const reply = await comment("reply", top.id);
    expect(await pinComment(handle.db, reply.id)).toBeNull();

    await pinComment(handle.db, top.id);
    await moderateComment(handle.db, top.id, "hide");
    expect(await pinnedId()).toBeNull();
  });
});
