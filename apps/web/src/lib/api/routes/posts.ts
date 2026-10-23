/** The Posts group: the blog's public posts and tags (lib/blog/). Public: no key needed. */
import type { Post } from "@trilleo/db";
import { findPublicPost, listPublicPosts, searchPosts } from "../../blog/store";
import { absolutizeUrls } from "../../post-html";
import {
  collectTags,
  hasTag,
  numberPosts,
  postHref,
  readingMinutes,
  tagHref,
} from "../../posts";
import { describe } from "../../seo";
import { SITE_URL } from "../../site";
import { ApiError } from "../errors";
import { defineRoute } from "../registry";
import { t } from "../schema";

const LIST_MAX = 50;

const absolute = (path: string) => new URL(path, SITE_URL).href;

const summaryFields = {
  slug: t.string({ description: "Its address: /writing/<slug>/." }),
  number: t.string({
    description:
      'Its place in order of publishing, as the site shows it: "007".',
  }),
  title: t.string(),
  description: t.string({
    description: "A sentence or two (the post's own, or its opening).",
  }),
  url: t.string({ format: "uri" }),
  tags: t.array(t.string()),
  readingMinutes: t.integer(),
  publishedAt: t.dateTime(),
  updatedAt: t.nullable(t.dateTime("When it was last marked as updated.")),
};

function summaryOf(post: Post, numbers: Map<string, string>) {
  return {
    slug: post.slug,
    number: numbers.get(post.slug) ?? "",
    title: post.title,
    description: describe(post.description, post.html),
    url: absolute(postHref(post.slug)),
    tags: post.tags,
    readingMinutes: readingMinutes(post.body),
    publishedAt: (post.publishedAt ?? post.createdAt).toISOString(),
    updatedAt: post.revisedAt?.toISOString() ?? null,
  };
}

const EXAMPLE_SUMMARY = {
  slug: "rebuilding-this-site",
  number: "001",
  title: "Rebuilding this site",
  description: "Why the site moved to Astro, and what changed.",
  url: "https://www.trilleo.net/writing/rebuilding-this-site/",
  tags: ["astro", "web"],
  readingMinutes: 6,
  publishedAt: "2026-10-01T08:00:00.000Z",
  updatedAt: null,
};

function offsetCursor(offset: number): string {
  return Buffer.from(`offset:${String(offset)}`).toString("base64url");
}

function readOffsetCursor(cursor: string): number {
  const text = Buffer.from(cursor, "base64url").toString();
  const offset = Number(text.startsWith("offset:") ? text.slice(7) : "");
  if (!Number.isSafeInteger(offset) || offset < 0)
    throw new ApiError(
      "invalid_input",
      "That cursor isn't one this route gave.",
      {
        problems: [
          { path: "cursor", message: "That cursor isn't one this route gave." },
        ],
      },
    );
  return offset;
}

export const listPosts = defineRoute({
  method: "GET",
  path: "/v1/posts",
  operationId: "listPosts",
  group: "posts",
  summary: "List posts",
  description:
    "Public posts, newest first, optionally with a tag. With `q`, the best matches for a search instead (up to `limit`, one page). Scheduled posts appear once their time comes.",
  auth: "public",
  cacheSeconds: 300,
  query: t.object({
    tag: t.optional(
      t.string({ max: 60, description: "A tag's slug (see List tags)." }),
    ),
    q: t.optional(t.string({ max: 200, description: "Search words." })),
    limit: t.optional(
      t.integer({
        min: 1,
        max: LIST_MAX,
        description: "How many (default 20).",
      }),
    ),
    cursor: t.optional(
      t.string({ max: 100, description: "`nextCursor` from the page before." }),
    ),
  }),
  response: t.object({
    items: t.array(t.object(summaryFields)),
    nextCursor: t.nullable(t.string()),
  }),
  example: {
    query: { tag: "astro", limit: 1 },
    response: { items: [EXAMPLE_SUMMARY], nextCursor: "b2Zmc2V0OjE" },
  },
  handler: async ({ db, query, now }) => {
    const limit = query.limit ?? 20;
    const all = await listPublicPosts(db, now);
    const numbers = numberPosts(all);
    if (query.q?.trim()) {
      const found = await searchPosts(db, query.q, now, limit);
      const bySlug = new Map(all.map((post) => [post.row.slug, post.row]));
      return {
        items: found.flatMap((hit) => {
          const post = bySlug.get(hit.slug);
          return post ? [summaryOf(post, numbers)] : [];
        }),
        nextCursor: null,
      };
    }
    const tagged = query.tag
      ? all.filter((post) => hasTag(post, query.tag ?? ""))
      : all;
    const offset = query.cursor ? readOffsetCursor(query.cursor) : 0;
    const page = tagged.slice(offset, offset + limit);
    return {
      items: page.map((post) => summaryOf(post.row, numbers)),
      nextCursor:
        offset + limit < tagged.length ? offsetCursor(offset + limit) : null,
    };
  },
});

export const getPost = defineRoute({
  method: "GET",
  path: "/v1/posts/{slug}",
  operationId: "getPost",
  group: "posts",
  summary: "Get a post",
  description:
    "One public post with its text, as HTML (links made absolute) and as the Markdown it was written in. A slug the post had before still finds it (`slug` in the answer is the current one). Drafts and scheduled posts are `404 not_found`.",
  auth: "public",
  cacheSeconds: 300,
  params: t.object({
    slug: t.string({ min: 1, max: 200, description: "The post's slug." }),
  }),
  response: t.object({
    ...summaryFields,
    html: t.string({ description: "The text as the site renders it." }),
    markdown: t.string({ description: "The text as written." }),
  }),
  errors: ["not_found"],
  example: {
    params: { slug: "rebuilding-this-site" },
    response: {
      ...EXAMPLE_SUMMARY,
      html: "<p>This site started as …</p>",
      markdown: "This site started as …",
    },
  },
  handler: async ({ db, params, now }) => {
    let found = await findPublicPost(db, params.slug, now);
    if (found.found === "redirect")
      found = await findPublicPost(db, found.slug, now);
    if (found.found !== "post")
      throw new ApiError("not_found", "There's no such post.");
    const numbers = numberPosts(await listPublicPosts(db, now));
    return {
      ...summaryOf(found.post, numbers),
      html: absolutizeUrls(found.post.html, SITE_URL),
      markdown: found.post.body,
    };
  },
});

export const listTags = defineRoute({
  method: "GET",
  path: "/v1/tags",
  operationId: "listTags",
  group: "posts",
  summary: "List tags",
  description:
    "Every tag on a public post, alphabetically, with how many posts have it.",
  auth: "public",
  cacheSeconds: 300,
  response: t.object({
    items: t.array(
      t.object({
        name: t.string(),
        slug: t.string({ description: "For `GET /v1/posts?tag=`." }),
        count: t.integer(),
        url: t.string({ format: "uri" }),
      }),
    ),
  }),
  example: {
    response: {
      items: [
        {
          name: "Astro",
          slug: "astro",
          count: 3,
          url: "https://www.trilleo.net/writing/tags/astro/",
        },
      ],
    },
  },
  handler: async ({ db, now }) => ({
    items: collectTags(await listPublicPosts(db, now)).map((tag) => ({
      ...tag,
      url: absolute(tagHref(tag.name)),
    })),
  }),
});
