/**
 * Posts in the database: what readers see (published posts whose time has come), and
 * what the admin editor reads and writes. Scheduling needs no job: a post is public
 * once `publishedAt` has passed, checked on every read.
 */
import {
  comments,
  postSlugs,
  posts,
  type Database,
  type Post,
  type PostStatus,
} from "@trilleo/db";
import { and, asc, desc, eq, isNull, lte, ne, sql } from "drizzle-orm";
import type { PostEntry } from "../posts";
import { sortPosts } from "../posts";
import type { PostAction, PostErrors, PostInput } from "./input";
import { publishErrors } from "./input";
import { RENDER_VERSION, renderPost } from "./render";

/** Readers can see it: published, and its time has come. */
export function isPublic(
  post: Pick<Post, "status" | "publishedAt">,
  now: Date,
): boolean {
  return (
    post.status === "published" &&
    post.publishedAt !== null &&
    post.publishedAt.getTime() <= now.getTime()
  );
}

/** Published with a date still ahead. */
export function isScheduled(
  post: Pick<Post, "status" | "publishedAt">,
  now: Date,
): boolean {
  return (
    post.status === "published" &&
    post.publishedAt !== null &&
    post.publishedAt.getTime() > now.getTime()
  );
}

const publicWhere = (now: Date) =>
  and(eq(posts.status, "published"), lte(posts.publishedAt, now));

/** A post row in the shape the listing helpers (posts.ts) work with. */
export interface BlogPost extends PostEntry {
  row: Post;
}

export function toBlogPost(row: Post, now: Date): BlogPost {
  const live = isPublic(row, now);
  return {
    id: row.slug,
    body: row.body,
    row,
    data: {
      title: row.title,
      description: row.description,
      pubDate: live ? (row.publishedAt ?? undefined) : undefined,
      updatedDate: row.revisedAt ?? undefined,
      tags: row.tags,
      draft: !live,
    },
  };
}

/** Everything readers can see, newest first. */
export async function listPublicPosts(
  db: Database,
  now = new Date(),
): Promise<BlogPost[]> {
  const rows = await db
    .select()
    .from(posts)
    .where(publicWhere(now))
    .orderBy(desc(posts.publishedAt), asc(posts.id));
  return sortPosts(rows.map((row) => toBlogPost(row, now)));
}

/** Renders the post again if it was saved by an older renderer (or imported). */
export async function ensureRendered(db: Database, post: Post): Promise<Post> {
  if (post.renderVersion >= RENDER_VERSION) return post;
  const { html, toc } = await renderPost(post.body);
  await db
    .update(posts)
    .set({ html, toc, renderVersion: RENDER_VERSION })
    .where(eq(posts.id, post.id));
  return { ...post, html, toc, renderVersion: RENDER_VERSION };
}

export type PublicLookup =
  | { found: "post"; post: Post }
  | { found: "redirect"; slug: string }
  | { found: "none" };

/** A public post by slug, or where an old slug of one points now. */
export async function findPublicPost(
  db: Database,
  slug: string,
  now = new Date(),
): Promise<PublicLookup> {
  const [post] = await db
    .select()
    .from(posts)
    .where(and(eq(posts.slug, slug), publicWhere(now)))
    .limit(1);
  if (post) return { found: "post", post: await ensureRendered(db, post) };

  const [moved] = await db
    .select({ slug: posts.slug })
    .from(postSlugs)
    .innerJoin(posts, eq(postSlugs.postId, posts.id))
    .where(and(eq(postSlugs.slug, slug), publicWhere(now)))
    .limit(1);
  return moved ? { found: "redirect", slug: moved.slug } : { found: "none" };
}

/** A post by its secret share link, whatever its status. */
export async function findPostByPreviewToken(
  db: Database,
  token: string,
): Promise<Post | undefined> {
  if (!/^[A-Za-z0-9_-]{20,64}$/.test(token)) return undefined;
  const [post] = await db
    .select()
    .from(posts)
    .where(eq(posts.previewToken, token))
    .limit(1);
  return post && ensureRendered(db, post);
}

/** A post by slug, public or not: for comment rules that need its settings. */
export async function findPostBySlug(
  db: Database,
  slug: string,
): Promise<Post | undefined> {
  const [post] = await db
    .select()
    .from(posts)
    .where(eq(posts.slug, slug))
    .limit(1);
  return post;
}

export async function getPost(
  db: Database,
  id: number,
): Promise<Post | undefined> {
  const [post] = await db.select().from(posts).where(eq(posts.id, id)).limit(1);
  return post;
}

export type AdminPostState = "draft" | "scheduled" | "published";

export interface AdminPostSummary {
  id: number;
  slug: string;
  title: string;
  state: AdminPostState;
  publishedAt: Date | null;
  savedAt: Date;
  commentMode: Post["commentMode"];
  comments: number;
  pending: number;
}

export function adminState(
  post: Pick<Post, "status" | "publishedAt">,
  now: Date,
): AdminPostState {
  if (post.status === "draft") return "draft";
  return isScheduled(post, now) ? "scheduled" : "published";
}

/** Every post for /admin/posts: drafts and scheduled first, then by date. */
export async function listAdminPosts(
  db: Database,
  now = new Date(),
): Promise<AdminPostSummary[]> {
  const rows = await db
    .select({
      post: {
        id: posts.id,
        slug: posts.slug,
        title: posts.title,
        status: posts.status,
        publishedAt: posts.publishedAt,
        savedAt: posts.savedAt,
        commentMode: posts.commentMode,
      },
      comments:
        sql<number>`count(${comments.id}) filter (where ${comments.status} = 'published')`.mapWith(
          Number,
        ),
      pending:
        sql<number>`count(${comments.id}) filter (where ${comments.status} = 'pending')`.mapWith(
          Number,
        ),
    })
    .from(posts)
    .leftJoin(
      comments,
      and(eq(comments.postSlug, posts.slug), isNull(comments.deletedAt)),
    )
    .groupBy(posts.id);

  const order: Record<AdminPostState, number> = {
    draft: 0,
    scheduled: 1,
    published: 2,
  };
  return rows
    .map(({ post, comments: total, pending }) => ({
      ...post,
      state: adminState(post, now),
      comments: total,
      pending,
    }))
    .sort(
      (a, b) =>
        order[a.state] - order[b.state] ||
        (b.publishedAt ?? b.savedAt).getTime() -
          (a.publishedAt ?? a.savedAt).getTime(),
    );
}

export type SaveResult =
  { ok: true; post: Post } | { ok: false; errors: PostErrors };

async function slugTaken(db: Database, slug: string, exceptId: number | null) {
  const [row] = await db
    .select({ id: posts.id })
    .from(posts)
    .where(
      exceptId === null
        ? eq(posts.slug, slug)
        : and(eq(posts.slug, slug), ne(posts.id, exceptId)),
    )
    .limit(1);
  return row !== undefined;
}

/** Status and date after the editor's action. Publishing without a date means now. */
function nextStatus(
  action: PostAction,
  current: { status: PostStatus; publishedAt: Date | null } | null,
  input: PostInput,
  now: Date,
): { status: PostStatus; publishedAt: Date | null } {
  switch (action) {
    case "publish":
      return { status: "published", publishedAt: input.publishedAt ?? now };
    case "unpublish":
      return { status: "draft", publishedAt: input.publishedAt };
    case "save":
      return {
        status: current?.status ?? "draft",
        // A published post keeps a date; clearing the field keeps the old one.
        publishedAt:
          current?.status === "published"
            ? (input.publishedAt ?? current.publishedAt ?? now)
            : input.publishedAt,
      };
  }
}

/** Adds a post. */
export async function createPost(
  db: Database,
  input: PostInput,
  action: PostAction,
  now = new Date(),
): Promise<SaveResult> {
  if (action === "publish") {
    const errors = publishErrors(input);
    if (Object.keys(errors).length > 0) return { ok: false, errors };
  }
  if (await slugTaken(db, input.slug, null)) {
    return {
      ok: false,
      errors: { slug: "Another post already uses this slug." },
    };
  }
  const { html, toc } = await renderPost(input.body);
  const state = nextStatus(action, null, input, now);
  const post = await db.transaction(async (tx) => {
    // The slug may have been an old address of another post: it's this one's now.
    await tx.delete(postSlugs).where(eq(postSlugs.slug, input.slug));
    const [row] = await tx
      .insert(posts)
      .values({
        slug: input.slug,
        title: input.title,
        description: input.description,
        body: input.body,
        tags: input.tags,
        commentMode: input.commentMode,
        ...state,
        html,
        toc,
        renderVersion: RENDER_VERSION,
        createdAt: now,
        savedAt: now,
      })
      .returning();
    return row;
  });
  if (!post) throw new Error("Saving the post returned nothing");
  return { ok: true, post };
}

/**
 * Saves the editor's changes. A new slug for a post readers have seen keeps the old
 * one as a redirect; its comments move with it.
 */
export async function updatePost(
  db: Database,
  id: number,
  input: PostInput,
  action: PostAction,
  now = new Date(),
): Promise<SaveResult | { ok: false; errors: "not-found" }> {
  const current = await getPost(db, id);
  if (!current) return { ok: false, errors: "not-found" };
  const state = nextStatus(action, current, input, now);
  if (state.status === "published") {
    const errors = publishErrors(input);
    if (Object.keys(errors).length > 0) return { ok: false, errors };
  }
  if (input.slug !== current.slug && (await slugTaken(db, input.slug, id))) {
    return {
      ok: false,
      errors: { slug: "Another post already uses this slug." },
    };
  }

  const rendered =
    input.body === current.body && current.renderVersion >= RENDER_VERSION
      ? { html: current.html, toc: current.toc }
      : await renderPost(input.body);

  const post = await db.transaction(async (tx) => {
    if (input.slug !== current.slug) {
      await tx.delete(postSlugs).where(eq(postSlugs.slug, input.slug));
      if (isPublic(current, now)) {
        await tx
          .insert(postSlugs)
          .values({ slug: current.slug, postId: id, createdAt: now });
      }
      await tx
        .update(comments)
        .set({ postSlug: input.slug })
        .where(eq(comments.postSlug, current.slug));
    }
    const [row] = await tx
      .update(posts)
      .set({
        slug: input.slug,
        title: input.title,
        description: input.description,
        body: input.body,
        tags: input.tags,
        commentMode: input.commentMode,
        ...state,
        revisedAt:
          input.revised && isPublic(current, now) ? now : current.revisedAt,
        ...rendered,
        renderVersion: RENDER_VERSION,
        savedAt: now,
      })
      .where(eq(posts.id, id))
      .returning();
    return row;
  });
  if (!post) return { ok: false, errors: "not-found" };
  return { ok: true, post };
}

/** Deletes a post, its comments and its old addresses. Returns whether it existed. */
export async function deletePost(db: Database, id: number): Promise<boolean> {
  return db.transaction(async (tx) => {
    const [post] = await tx
      .delete(posts)
      .where(eq(posts.id, id))
      .returning({ slug: posts.slug });
    if (!post) return false;
    // Replies go with their thread (parent_id cascades).
    await tx.delete(comments).where(eq(comments.postSlug, post.slug));
    return true;
  });
}

/** A fresh share link secret: 32 URL-safe characters. */
export function newPreviewToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  return Buffer.from(bytes).toString("base64url");
}

/** Creates (or replaces) a post's share link, or revokes it with `null`. */
export async function setPreviewToken(
  db: Database,
  id: number,
  token: string | null,
): Promise<boolean> {
  const updated = await db
    .update(posts)
    .set({ previewToken: token })
    .where(eq(posts.id, id))
    .returning({ id: posts.id });
  return updated.length > 0;
}

export interface SearchResult {
  slug: string;
  title: string;
  description: string;
  /** Safe HTML: escaped text with the matches in <mark>. */
  excerpt: string;
}

const START = "\u0001";
const STOP = "\u0002";

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Markdown syntax that would read as noise in an excerpt. */
function plainExcerpt(text: string): string {
  return text
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/[`*_#>]+/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Public posts matching a search, best first (Postgres full-text search, in English). */
export async function searchPosts(
  db: Database,
  query: string,
  now = new Date(),
  limit = 20,
): Promise<SearchResult[]> {
  const q = query.trim().slice(0, 200);
  if (!q) return [];
  const tsquery = sql`websearch_to_tsquery('english', ${q})`;
  const document = sql`setweight(to_tsvector('english', ${posts.title}), 'A') || setweight(to_tsvector('english', ${posts.description} || ' ' || array_to_string(${posts.tags}, ' ')), 'B') || setweight(to_tsvector('english', ${posts.body}), 'C')`;
  const rows = await db
    .select({
      slug: posts.slug,
      title: posts.title,
      description: posts.description,
      excerpt: sql<string>`ts_headline('english', ${posts.body}, ${tsquery}, ${`StartSel=${START}, StopSel=${STOP}, MaxWords=30, MinWords=12, MaxFragments=1`})`,
      rank: sql<number>`ts_rank(${document}, ${tsquery})`.mapWith(Number),
    })
    .from(posts)
    .where(and(publicWhere(now), sql`${document} @@ ${tsquery}`))
    .orderBy(
      desc(sql`ts_rank(${document}, ${tsquery})`),
      desc(posts.publishedAt),
    )
    .limit(limit);

  return rows.map((row) => ({
    slug: row.slug,
    title: row.title,
    description: row.description,
    excerpt: escapeHtml(plainExcerpt(row.excerpt))
      .replaceAll(START, "<mark>")
      .replaceAll(STOP, "</mark>"),
  }));
}

/** Every post's title by slug (for comment lists that link to their post). */
export async function postTitles(db: Database): Promise<Map<string, string>> {
  const rows = await db
    .select({ slug: posts.slug, title: posts.title })
    .from(posts);
  return new Map(rows.map((row) => [row.slug, row.title]));
}
