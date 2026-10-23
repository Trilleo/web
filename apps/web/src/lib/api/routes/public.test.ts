import {
  openDatabase,
  postSlugs,
  posts,
  type DatabaseHandle,
} from "@trilleo/db";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { TOOLS } from "../../tools/registry";
import { studySubjects } from "../../study/content";
import { dispatch } from "../dispatch";
import { RateLimiter } from "../rate-limit";
import { ROUTES } from "./index";

const NOW = new Date("2026-10-23T08:00:00.000Z");
const HOUR = 3600_000;

interface Body {
  items: Record<string, unknown>[];
  nextCursor: string | null;
  error: { code: string };
  [field: string]: unknown;
}

let handle: DatabaseHandle;

beforeEach(async () => {
  handle = await openDatabase("memory://");
});
afterEach(async () => {
  await handle.close();
});

async function get(
  path: string,
): Promise<{ status: number; headers: Headers; body: Body }> {
  const url = new URL(path, "https://api.trilleo.net");
  const response = await dispatch(new Request(url), url, {
    getDb: () => Promise.resolve(handle.db),
    limiter: new RateLimiter(),
    routes: ROUTES,
    clientIp: "203.0.113.1",
    apiOrigin: "https://api.trilleo.net",
    siteOrigin: "https://www.trilleo.net",
    now: () => NOW,
    purge: false,
  });
  return {
    status: response.status,
    headers: response.headers,
    body: (await response.json()) as Body,
  };
}

async function seedPosts() {
  const at = (hours: number) => new Date(NOW.getTime() + hours * HOUR);
  const rows = await handle.db
    .insert(posts)
    .values([
      {
        slug: "first",
        title: "First",
        description: "The first one.",
        body: "Hello [there](/writing/second/).",
        html: '<p>Hello <a href="/writing/second/">there</a>.</p>',
        renderVersion: 99,
        tags: ["Astro", "Web"],
        status: "published",
        publishedAt: at(-48),
      },
      {
        slug: "second",
        title: "Second",
        body: "Some words about Postgres.",
        html: "<p>Some words about Postgres.</p>",
        renderVersion: 99,
        tags: ["Web"],
        status: "published",
        publishedAt: at(-24),
      },
      {
        slug: "soon",
        title: "Soon",
        tags: ["Web"],
        status: "published",
        publishedAt: at(2),
      },
      { slug: "draft", title: "Draft", tags: ["Web"], status: "draft" },
    ])
    .returning();
  const first = rows.find((row) => row.slug === "first");
  if (first)
    await handle.db
      .insert(postSlugs)
      .values({ slug: "old-first", postId: first.id });
}

describe("posts", () => {
  it("lists public posts, newest first, in pages", async () => {
    await seedPosts();
    const page = await get("/v1/posts?limit=1");
    expect(page.status).toBe(200);
    expect(page.headers.get("Cache-Control")).toBe("public, max-age=300");
    expect(page.headers.get("Access-Control-Allow-Origin")).toBe("*");
    expect(page.body.items).toEqual([
      {
        slug: "second",
        number: "002",
        title: "Second",
        description: "Some words about Postgres.",
        url: "https://www.trilleo.net/writing/second/",
        tags: ["Web"],
        readingMinutes: 1,
        publishedAt: "2026-10-22T08:00:00.000Z",
        updatedAt: null,
      },
    ]);
    const next = await get(
      `/v1/posts?limit=1&cursor=${page.body.nextCursor ?? ""}`,
    );
    expect(next.body.items.map((post) => post.slug)).toEqual(["first"]);
    expect(next.body.nextCursor).toBeNull();
    expect(
      (await get("/v1/posts?tag=astro")).body.items.map((post) => post.slug),
    ).toEqual(["first"]);
    expect(
      (await get("/v1/posts?q=postgres")).body.items.map((post) => post.slug),
    ).toEqual(["second"]);
  });

  it("shows one, by its slug or an old one, with absolute links", async () => {
    await seedPosts();
    const post = await get("/v1/posts/old-first");
    expect(post.body).toMatchObject({
      slug: "first",
      number: "001",
      html: '<p>Hello <a href="https://www.trilleo.net/writing/second/">there</a>.</p>',
      markdown: "Hello [there](/writing/second/).",
    });
    expect((await get("/v1/posts/soon")).status).toBe(404);
    expect((await get("/v1/posts/draft")).body.error.code).toBe("not_found");
  });

  it("lists tags with their counts", async () => {
    await seedPosts();
    expect((await get("/v1/tags")).body.items).toEqual([
      {
        name: "Astro",
        slug: "astro",
        count: 1,
        url: "https://www.trilleo.net/writing/tags/astro/",
      },
      {
        name: "Web",
        slug: "web",
        count: 2,
        url: "https://www.trilleo.net/writing/tags/web/",
      },
    ]);
  });
});

describe("the site", () => {
  it("describes itself, its tools and its games", async () => {
    const site = await get("/v1/site");
    expect(site.body).toMatchObject({
      name: "Trilleo Network",
      url: "https://www.trilleo.net/",
      docs: "https://api.trilleo.net/",
    });
    const tools = await get("/v1/tools");
    expect(tools.body.items.map((tool) => tool.slug)).toEqual(
      TOOLS.map((tool) => tool.slug),
    );
    expect(tools.body.items[0]).toMatchObject({
      url: expect.stringMatching(
        /^https:\/\/www\.trilleo\.net\/tools\//,
      ) as unknown,
    });
    expect((await get("/v1/games")).body.items.length).toBeGreaterThan(0);
  });
});

describe("study", () => {
  it("lists subjects and shows one's contents", async () => {
    const subjects = studySubjects();
    const list = await get("/v1/study/subjects");
    expect(list.body.items.map((subject) => subject.slug)).toEqual(
      subjects.map((s) => s.slug),
    );
    const first = subjects[0];
    if (!first) return;
    const one = await get(`/v1/study/subjects/${first.slug}`);
    expect(one.body).toMatchObject({
      slug: first.slug,
      url: `https://www.trilleo.net/study/${first.slug}/`,
    });
    expect((one.body.units as unknown[]).length).toBe(first.units.length);
    expect((await get("/v1/study/subjects/nothing")).status).toBe(404);
  });
});
