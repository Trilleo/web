import { openDatabase, posts, type DatabaseHandle } from "@trilleo/db";
import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { upsertGitHubUser } from "./auth/sessions";
import type { PostInput } from "./blog/input";
import { createPost, updatePost } from "./blog/store";
import {
  INDEXNOW_ENDPOINT,
  announcePosts,
  indexNowKey,
  submitUrls,
} from "./indexnow";

const KEY = "0123456789abcdef";
const now = new Date("2026-06-01T12:00:00Z");
const later = (minutes: number) => new Date(now.getTime() + minutes * 60_000);

interface Ping {
  url: string;
  body: { host: string; key: string; keyLocation: string; urlList: string[] };
}

/** A fetch that records pings and answers with `status`. */
function fakeFetch(status = 200) {
  const pings: Ping[] = [];
  const send = ((url: string, init: RequestInit) => {
    pings.push({
      url,
      body: JSON.parse(init.body as string) as Ping["body"],
    });
    return Promise.resolve(new Response(null, { status }));
  }) as typeof fetch;
  return { pings, send };
}

describe("indexNowKey", () => {
  it("accepts 8–128 letters, digits and dashes only", () => {
    expect(indexNowKey({ INDEXNOW_KEY: ` ${KEY} ` })).toBe(KEY);
    expect(indexNowKey({})).toBeUndefined();
    expect(indexNowKey({ INDEXNOW_KEY: "short" })).toBeUndefined();
    expect(indexNowKey({ INDEXNOW_KEY: "has/slash-in-it" })).toBeUndefined();
  });
});

describe("submitUrls", () => {
  it("sends absolute, unique URLs with the key's location", async () => {
    const { pings, send } = fakeFetch();
    expect(
      await submitUrls(["/writing/a/", "/writing/a/", "/writing/"], {
        key: KEY,
        fetch: send,
      }),
    ).toBe(true);
    expect(pings).toEqual([
      {
        url: INDEXNOW_ENDPOINT,
        body: {
          host: "www.trilleo.net",
          key: KEY,
          keyLocation: `https://www.trilleo.net/${KEY}.txt`,
          urlList: [
            "https://www.trilleo.net/writing/a/",
            "https://www.trilleo.net/writing/",
          ],
        },
      },
    ]);
  });

  it("reports a refusal", async () => {
    const { send } = fakeFetch(403);
    expect(await submitUrls(["/"], { key: KEY, fetch: send })).toBe(false);
  });
});

describe("announcePosts", () => {
  let handle: DatabaseHandle;

  beforeEach(async () => {
    handle = await openDatabase("memory://");
    await upsertGitHubUser(handle.db, { id: 1, login: "owner", name: "Owner" });
  });
  afterEach(async () => {
    await handle.close();
  });

  function input(overrides: Partial<PostInput> = {}): PostInput {
    return {
      title: "Hello",
      slug: "hello",
      description: "A post.",
      body: "Text.",
      tags: [],
      publishedAt: null,
      commentMode: "open",
      revised: false,
      seoTitle: "",
      seoDescription: "",
      ...overrides,
    };
  }

  async function publish(overrides: Partial<PostInput> = {}) {
    const result = await createPost(
      handle.db,
      input(overrides),
      "publish",
      now,
    );
    if (!result.ok) throw new Error(JSON.stringify(result.errors));
    return result.post;
  }

  const urls = (pings: Ping[]) => pings.flatMap((ping) => ping.body.urlList);

  it("announces a published post once, then again after an edit", async () => {
    const post = await publish();
    const { pings, send } = fakeFetch();
    const options = { key: KEY, fetch: send };

    await announcePosts(handle.db, { ...options, now: later(1) });
    expect(urls(pings)).toEqual([
      "https://www.trilleo.net/writing/hello/",
      "https://www.trilleo.net/writing/",
    ]);

    await announcePosts(handle.db, { ...options, now: later(2) });
    expect(pings).toHaveLength(1);

    await updatePost(
      handle.db,
      post.id,
      input({ body: "New." }),
      "save",
      later(3),
    );
    await announcePosts(handle.db, { ...options, now: later(4) });
    expect(pings).toHaveLength(2);
  });

  it("waits for a scheduled post's time", async () => {
    await publish({ publishedAt: later(60) });
    const { pings, send } = fakeFetch();
    await announcePosts(handle.db, { key: KEY, fetch: send, now: later(1) });
    expect(pings).toHaveLength(0);
    await announcePosts(handle.db, { key: KEY, fetch: send, now: later(61) });
    expect(urls(pings)).toContain("https://www.trilleo.net/writing/hello/");
  });

  it("sends extra addresses, and tries again after a failure", async () => {
    const post = await publish();
    const failing = fakeFetch(500);
    expect(
      await announcePosts(handle.db, {
        key: KEY,
        fetch: failing.send,
        extra: ["/writing/old/"],
        now: later(1),
      }),
    ).toBe(false);
    expect(urls(failing.pings)).toContain(
      "https://www.trilleo.net/writing/old/",
    );
    const [row] = await handle.db
      .select()
      .from(posts)
      .where(eq(posts.id, post.id));
    expect(row?.indexNowAt).toBeNull();

    const working = fakeFetch();
    await announcePosts(handle.db, {
      key: KEY,
      fetch: working.send,
      now: later(2),
    });
    expect(urls(working.pings)).toContain(
      "https://www.trilleo.net/writing/hello/",
    );
  });

  it("leaves drafts out", async () => {
    await createPost(handle.db, input(), "save", now);
    const { pings, send } = fakeFetch();
    await announcePosts(handle.db, { key: KEY, fetch: send, now: later(1) });
    expect(pings).toHaveLength(0);
  });
});
