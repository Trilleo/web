/**
 * The forum's data: reading the tree, topics and posts as one viewer may see them,
 * and writing (new topics, replies, edits, deletions, moderation). Who may do what
 * is decided by @trilleo/forum's `can`; the pages ask it before calling here, and
 * the writes here ask again, so a forged form can't get past.
 *
 * Counts and "last post" on topics and forums are caches: every write that changes
 * them calls `refreshTopic`, which recounts that topic and its forum from the rows.
 */
import {
  forumPosts,
  forumTopics,
  forums,
  users,
  type Database,
  type Forum,
  type ForumPin,
  type ForumPost,
  type ForumPostState,
  type ForumTopic,
  type User,
} from "@trilleo/db";
import {
  FORUM_LIMITS,
  FORUM_RENDER_VERSION,
  can,
  excerpt,
  extractMentions,
  normalizeBody,
  normalizeTitle,
  plainText,
  renderForumPost,
  slugify,
  type ForumViewer,
} from "@trilleo/forum";
import {
  and,
  asc,
  count,
  desc,
  eq,
  gt,
  inArray,
  isNull,
  lt,
  ne,
  or,
  sql,
  type SQL,
} from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { isAdmin } from "../auth/guard";
import { alertAdmin } from "../mail/alerts";
import { safely } from "../mail/notify";
import { characterCount, displayName, profileHref } from "../profile/profile";
import { ForumTree } from "./tree";

type Tx = Parameters<Parameters<Database["transaction"]>[0]>[0];
type Db = Database | Tx;

/** How the forum sees a signed-in person (null: a visitor). */
export function forumViewer(
  user:
    | Pick<User, "id" | "email" | "githubId" | "trustedAt" | "blockedAt">
    | null
    | undefined,
): ForumViewer | null {
  if (!user) return null;
  return {
    id: user.id,
    admin: isAdmin(user),
    trusted: user.trustedAt !== null,
    blocked: user.blockedAt !== null,
  };
}

export async function loadTree(db: Database): Promise<ForumTree> {
  return new ForumTree(await db.select().from(forums));
}

/** Someone as a post or a list shows them. */
export interface ForumAuthor {
  id: string;
  username: string;
  name: string;
  /** Their profile is public, so their name links to it. */
  profile: boolean;
  avatarHash: string | null;
  displayName: string | null;
  linkedName: string | null;
  joinedAt: Date;
}

const authorColumns = {
  id: users.id,
  username: users.username,
  displayName: users.displayName,
  name: users.name,
  profilePublic: users.profilePublic,
  avatarHash: users.avatarHash,
  createdAt: users.createdAt,
  blockedAt: users.blockedAt,
};

interface AuthorRow {
  id: string;
  username: string;
  displayName: string | null;
  name: string | null;
  profilePublic: boolean;
  avatarHash: string | null;
  createdAt: Date;
  blockedAt: Date | null;
}

function author(row: AuthorRow | null): ForumAuthor | null {
  if (!row) return null;
  return {
    id: row.id,
    username: row.username,
    name: displayName(row),
    profile: row.profilePublic,
    avatarHash: row.avatarHash,
    displayName: row.displayName,
    linkedName: row.name,
    joinedAt: row.createdAt,
  };
}

/**
 * What a viewer may see of posts (or, with `topic`, of topics): published ones,
 * their own pending ones, and everything for moderators. Never deleted ones, and
 * nothing by a blocked account unless they moderate.
 */
function visibleState(
  column: typeof forumPosts.state | typeof forumTopics.state,
  authorColumn: typeof forumPosts.authorId | typeof forumTopics.authorId,
  viewer: ForumViewer | null,
  mod: boolean,
): SQL | undefined {
  if (mod) return undefined;
  const published = eq(column, "published");
  if (!viewer) return published;
  return or(published, and(eq(column, "pending"), eq(authorColumn, viewer.id)));
}

// ---------------------------------------------------------------------------
// Reading

/** One row of a topic list. */
export interface TopicRow {
  topic: ForumTopic;
  forum: Pick<Forum, "id" | "slug" | "name">;
  author: ForumAuthor | null;
  lastPoster: ForumAuthor | null;
}

const lastPosts = alias(forumPosts, "last_posts");
const lastPosters = alias(users, "last_posters");

async function topicRows(
  db: Database,
  where: SQL | undefined,
  order: SQL[],
  limit: number,
  offset = 0,
): Promise<TopicRow[]> {
  const rows = await db
    .select({
      topic: forumTopics,
      forum: { id: forums.id, slug: forums.slug, name: forums.name },
      author: authorColumns,
      lastPoster: {
        id: lastPosters.id,
        username: lastPosters.username,
        displayName: lastPosters.displayName,
        name: lastPosters.name,
        profilePublic: lastPosters.profilePublic,
        avatarHash: lastPosters.avatarHash,
        createdAt: lastPosters.createdAt,
        blockedAt: lastPosters.blockedAt,
      },
    })
    .from(forumTopics)
    .innerJoin(forums, eq(forums.id, forumTopics.forumId))
    .leftJoin(users, eq(users.id, forumTopics.authorId))
    .leftJoin(lastPosts, eq(lastPosts.id, forumTopics.lastPostId))
    .leftJoin(lastPosters, eq(lastPosters.id, lastPosts.authorId))
    .where(where)
    .orderBy(...order)
    .limit(limit)
    .offset(offset);
  return rows.map((row) => ({
    topic: row.topic,
    forum: row.forum,
    author: author(row.author),
    lastPoster: author(row.lastPoster),
  }));
}

function topicsVisibleTo(viewer: ForumViewer | null, mod: boolean) {
  return and(
    isNull(forumTopics.deletedAt),
    visibleState(forumTopics.state, forumTopics.authorId, viewer, mod),
    mod ? undefined : or(isNull(forumTopics.authorId), isNull(users.blockedAt)),
  );
}

/** A forum's topics, pinned ones first, then by latest activity. */
export async function listTopics(
  db: Database,
  input: {
    forum: Forum;
    viewer: ForumViewer | null;
    mod: boolean;
    page: number;
    perPage?: number;
  },
): Promise<{ topics: TopicRow[]; total: number; pages: number }> {
  const perPage = input.perPage ?? FORUM_LIMITS.topicsPerPage;
  const where = and(
    eq(forumTopics.forumId, input.forum.id),
    topicsVisibleTo(input.viewer, input.mod),
  );
  const [totalRow] = await db
    .select({ total: count() })
    .from(forumTopics)
    .leftJoin(users, eq(users.id, forumTopics.authorId))
    .where(where);
  const total = totalRow?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / perPage));
  const page = Math.min(Math.max(1, input.page), pages);
  const topics = await topicRows(
    db,
    where,
    [
      sql`${forumTopics.pinned} = 'none'`,
      desc(forumTopics.lastPostAt),
      desc(forumTopics.id),
    ],
    perPage,
    (page - 1) * perPage,
  );
  return { topics, total, pages };
}

/** The newest topics across the forums the viewer may see. */
export async function recentTopics(
  db: Database,
  input: {
    tree: ForumTree;
    viewer: ForumViewer | null;
    limit: number;
    /** Only those pinned to the index ("global"). */
    announcements?: boolean;
  },
): Promise<TopicRow[]> {
  const ids = input.tree.visibleIds(input.viewer);
  if (ids.length === 0) return [];
  return topicRows(
    db,
    and(
      inArray(forumTopics.forumId, ids),
      topicsVisibleTo(input.viewer, false),
      input.announcements ? eq(forumTopics.pinned, "global") : undefined,
    ),
    [desc(forumTopics.lastPostAt), desc(forumTopics.id)],
    input.limit,
  );
}

/** Forums' newest posts, for the index's "Last post" column: by post id. */
export async function lastPostsById(
  db: Database,
  ids: readonly number[],
): Promise<Map<number, TopicRow>> {
  if (ids.length === 0) return new Map();
  const rows = await topicRows(
    db,
    inArray(forumTopics.lastPostId, [...ids]),
    [desc(forumTopics.lastPostAt)],
    ids.length,
  );
  return new Map(
    rows.flatMap((row) =>
      row.topic.lastPostId === null ? [] : [[row.topic.lastPostId, row]],
    ),
  );
}

export async function getTopic(
  db: Database,
  id: number,
): Promise<ForumTopic | undefined> {
  const [topic] = await db
    .select()
    .from(forumTopics)
    .where(and(eq(forumTopics.id, id), isNull(forumTopics.deletedAt)))
    .limit(1);
  return topic;
}

export async function getPost(
  db: Database,
  id: number,
): Promise<ForumPost | undefined> {
  const [post] = await db
    .select()
    .from(forumPosts)
    .where(and(eq(forumPosts.id, id), isNull(forumPosts.deletedAt)))
    .limit(1);
  return post;
}

/** A post on a topic page. */
export interface PostView {
  post: ForumPost;
  /** Its HTML, re-rendered if the renderer has moved on. */
  html: string;
  author: ForumAuthor | null;
  /** How many published posts its author has written in the forum. */
  authorPosts: number;
  /** It opened the topic. */
  first: boolean;
}

function postsVisibleTo(viewer: ForumViewer | null, mod: boolean) {
  return and(
    isNull(forumPosts.deletedAt),
    visibleState(forumPosts.state, forumPosts.authorId, viewer, mod),
    mod ? undefined : or(isNull(forumPosts.authorId), isNull(users.blockedAt)),
  );
}

/** A topic's posts, oldest first, one page of them. */
export async function listPosts(
  db: Database,
  input: {
    topic: ForumTopic;
    viewer: ForumViewer | null;
    mod: boolean;
    page: number;
  },
): Promise<{ posts: PostView[]; total: number; pages: number; page: number }> {
  const perPage = FORUM_LIMITS.postsPerPage;
  const where = and(
    eq(forumPosts.topicId, input.topic.id),
    postsVisibleTo(input.viewer, input.mod),
  );
  const [totalRow] = await db
    .select({ total: count() })
    .from(forumPosts)
    .leftJoin(users, eq(users.id, forumPosts.authorId))
    .where(where);
  const total = totalRow?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / perPage));
  const page = Math.min(Math.max(1, input.page), pages);
  const rows = await db
    .select({ post: forumPosts, author: authorColumns })
    .from(forumPosts)
    .leftJoin(users, eq(users.id, forumPosts.authorId))
    .where(where)
    .orderBy(asc(forumPosts.createdAt), asc(forumPosts.id))
    .limit(perPage)
    .offset((page - 1) * perPage);

  const authorIds = [
    ...new Set(rows.flatMap((row) => (row.author ? [row.author.id] : []))),
  ];
  const postCounts = new Map<string, number>();
  if (authorIds.length > 0) {
    const counted = await db
      .select({ authorId: forumPosts.authorId, posts: count() })
      .from(forumPosts)
      .where(
        and(
          inArray(forumPosts.authorId, authorIds),
          eq(forumPosts.state, "published"),
          isNull(forumPosts.deletedAt),
        ),
      )
      .groupBy(forumPosts.authorId);
    for (const row of counted)
      if (row.authorId) postCounts.set(row.authorId, row.posts);
  }

  const posts: PostView[] = [];
  for (const row of rows) {
    posts.push({
      post: row.post,
      html: await currentHtml(db, row.post),
      author: author(row.author),
      authorPosts: row.author ? (postCounts.get(row.author.id) ?? 0) : 0,
      first: row.post.id === input.topic.firstPostId,
    });
  }
  return { posts, total, pages, page };
}

/** Which page of its topic a post is on, as this viewer counts posts. */
export async function pageOfPost(
  db: Database,
  post: ForumPost,
  viewer: ForumViewer | null,
  mod: boolean,
): Promise<number> {
  const [row] = await db
    .select({ before: count() })
    .from(forumPosts)
    .leftJoin(users, eq(users.id, forumPosts.authorId))
    .where(
      and(
        eq(forumPosts.topicId, post.topicId),
        postsVisibleTo(viewer, mod),
        or(
          lt(forumPosts.createdAt, post.createdAt),
          and(
            eq(forumPosts.createdAt, post.createdAt),
            lt(forumPosts.id, post.id),
          ),
        ),
      ),
    );
  return Math.floor((row?.before ?? 0) / FORUM_LIMITS.postsPerPage) + 1;
}

/** Someone's username (for quotes), or null for none or a deleted account. */
export async function usernameOf(
  db: Database,
  userId: string | null,
): Promise<string | null> {
  if (!userId) return null;
  const [row] = await db
    .select({ username: users.username })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  return row?.username ?? null;
}

/** Counts a visit to a topic page. */
export async function countView(db: Database, topicId: number): Promise<void> {
  await db
    .update(forumTopics)
    .set({ viewCount: sql`${forumTopics.viewCount} + 1` })
    .where(eq(forumTopics.id, topicId));
}

/** The whole forum's numbers, for the index. */
export async function forumStats(db: Database, tree: ForumTree) {
  const [members] = await db
    .select({ total: count() })
    .from(users)
    .where(isNull(users.blockedAt));
  const topics = tree.roots.reduce((sum, node) => sum + node.totals.topics, 0);
  const posts = tree.roots.reduce((sum, node) => sum + node.totals.posts, 0);
  return { topics, posts, members: members?.total ?? 0 };
}

// ---------------------------------------------------------------------------
// Rendering

/** Accounts a post may link with @username: public profiles that aren't blocked. */
async function mentionable(db: Db, body: string): Promise<Set<string>> {
  const names = extractMentions(body);
  if (names.length === 0) return new Set();
  const rows = await db
    .select({ username: users.username })
    .from(users)
    .where(
      and(
        inArray(users.username, names),
        eq(users.profilePublic, true),
        isNull(users.blockedAt),
      ),
    );
  return new Set(rows.map((row) => row.username));
}

export async function renderBody(db: Db, body: string): Promise<string> {
  return renderForumPost(body, {
    mentions: await mentionable(db, body),
    profileHref,
  });
}

/** A post's HTML, rendered again (and stored) if the renderer has changed since. */
async function currentHtml(db: Database, post: ForumPost): Promise<string> {
  if (post.renderVersion === FORUM_RENDER_VERSION) return post.html;
  const html = await renderBody(db, post.body);
  await db
    .update(forumPosts)
    .set({ html, renderVersion: FORUM_RENDER_VERSION })
    .where(eq(forumPosts.id, post.id));
  return html;
}

// ---------------------------------------------------------------------------
// Writing

export type PostError =
  | "forbidden"
  | "empty-title"
  | "short-title"
  | "long-title"
  | "empty"
  | "too-long"
  | "rate-limited"
  | "too-many-pending";

export type PostResult<T> =
  { ok: true; value: T } | { ok: false; error: PostError };

function checkTitle(title: string): PostError | null {
  if (!title) return "empty-title";
  if (characterCount(title) < FORUM_LIMITS.title.min) return "short-title";
  if (characterCount(title) > FORUM_LIMITS.title.max) return "long-title";
  return null;
}

function checkBody(body: string): PostError | null {
  if (!body) return "empty";
  if (body.length > FORUM_LIMITS.body.max) return "too-long";
  return null;
}

/** Bursts, daily totals and posts waiting for approval (moderators are exempt). */
async function checkPace(
  db: Database,
  userId: string,
  now: Date,
  reviewed: boolean,
): Promise<PostError | null> {
  const since = (ms: number) => new Date(now.getTime() - ms);
  const [usage] = await db
    .select({
      burst:
        sql<number>`count(*) filter (where ${gt(forumPosts.createdAt, since(FORUM_LIMITS.burst.windowMs))})`.mapWith(
          Number,
        ),
      daily:
        sql<number>`count(*) filter (where ${gt(forumPosts.createdAt, since(FORUM_LIMITS.daily.windowMs))})`.mapWith(
          Number,
        ),
      pending:
        sql<number>`count(*) filter (where ${and(eq(forumPosts.state, "pending"), isNull(forumPosts.deletedAt))})`.mapWith(
          Number,
        ),
    })
    .from(forumPosts)
    .where(eq(forumPosts.authorId, userId));
  if (!usage) return null;
  if (
    usage.burst >= FORUM_LIMITS.burst.count ||
    usage.daily >= FORUM_LIMITS.daily.count
  )
    return "rate-limited";
  if (reviewed && usage.pending >= FORUM_LIMITS.pending)
    return "too-many-pending";
  return null;
}

/**
 * Recounts a topic (replies, first and last post) and then its forum (topics,
 * posts, last post) from the rows.
 */
export async function refreshTopic(db: Db, topicId: number): Promise<void> {
  const [stats] = await db
    .select({
      first: sql<number | null>`min(${forumPosts.id})`,
      published:
        sql<number>`count(*) filter (where ${forumPosts.state} = 'published')`.mapWith(
          Number,
        ),
    })
    .from(forumPosts)
    .where(and(eq(forumPosts.topicId, topicId), isNull(forumPosts.deletedAt)));
  const [last] = await db
    .select({ id: forumPosts.id, createdAt: forumPosts.createdAt })
    .from(forumPosts)
    .where(
      and(
        eq(forumPosts.topicId, topicId),
        isNull(forumPosts.deletedAt),
        eq(forumPosts.state, "published"),
      ),
    )
    .orderBy(desc(forumPosts.createdAt), desc(forumPosts.id))
    .limit(1);
  const [topic] = await db
    .update(forumTopics)
    .set({
      firstPostId: stats?.first ?? null,
      replyCount: Math.max(0, (stats?.published ?? 0) - 1),
      lastPostId: last?.id ?? null,
      ...(last ? { lastPostAt: last.createdAt } : {}),
    })
    .where(eq(forumTopics.id, topicId))
    .returning({ forumId: forumTopics.forumId });
  if (topic) await refreshForum(db, topic.forumId);
}

export async function refreshForum(db: Db, forumId: number): Promise<void> {
  const live = and(
    eq(forumTopics.forumId, forumId),
    eq(forumTopics.state, "published"),
    isNull(forumTopics.deletedAt),
  );
  const [totals] = await db
    .select({
      topics: count(),
      posts:
        sql<number>`coalesce(sum(${forumTopics.replyCount} + 1), 0)`.mapWith(
          Number,
        ),
    })
    .from(forumTopics)
    .where(live);
  const [last] = await db
    .select({ id: forumTopics.lastPostId, at: forumTopics.lastPostAt })
    .from(forumTopics)
    .where(live)
    .orderBy(desc(forumTopics.lastPostAt))
    .limit(1);
  await db
    .update(forums)
    .set({
      topicCount: totals?.topics ?? 0,
      postCount: totals?.posts ?? 0,
      lastPostId: last?.id ?? null,
      lastPostAt: last?.at ?? null,
    })
    .where(eq(forums.id, forumId));
}

async function alertWaiting(
  db: Database,
  who: User,
  what: string,
  now: Date,
): Promise<void> {
  await safely("admin alert", () =>
    alertAdmin(
      db,
      {
        kind: "forum",
        summary: `${what} from @${who.username} is waiting for approval`,
        path: "/admin/forum/?tab=waiting",
      },
      now,
    ),
  );
}

/** Starts a topic: its title and first post. */
export async function createTopic(
  db: Database,
  input: {
    tree: ForumTree;
    forum: Forum;
    author: User;
    title: string;
    body: string;
    now?: Date;
  },
): Promise<PostResult<{ topic: ForumTopic; post: ForumPost }>> {
  const now = input.now ?? new Date();
  const viewer = forumViewer(input.author);
  const place = input.tree.place(input.forum);
  if (!can(viewer, "topic.create", place))
    return { ok: false, error: "forbidden" };
  const title = normalizeTitle(input.title);
  const body = normalizeBody(input.body);
  const problem = checkTitle(title) ?? checkBody(body);
  if (problem) return { ok: false, error: problem };
  const mod = input.tree.moderates(input.forum, viewer);
  const reviewed = !can(viewer, "post.skip-review", place);
  if (!mod) {
    const pace = await checkPace(db, input.author.id, now, reviewed);
    if (pace) return { ok: false, error: pace };
  }
  const state: ForumPostState = reviewed ? "pending" : "published";
  const html = await renderBody(db, body);

  const value = await db.transaction(async (tx) => {
    const [topic] = await tx
      .insert(forumTopics)
      .values({
        forumId: input.forum.id,
        authorId: input.author.id,
        title,
        slug: slugify(title),
        state,
        lastPostAt: now,
        createdAt: now,
        updatedAt: now,
      })
      .returning();
    if (!topic) throw new Error("Saving the topic returned nothing");
    const [post] = await tx
      .insert(forumPosts)
      .values({
        topicId: topic.id,
        authorId: input.author.id,
        body,
        html,
        renderVersion: FORUM_RENDER_VERSION,
        state,
        createdAt: now,
      })
      .returning();
    if (!post) throw new Error("Saving the post returned nothing");
    await refreshTopic(tx, topic.id);
    return { topic: { ...topic, firstPostId: post.id }, post };
  });
  if (reviewed) await alertWaiting(db, input.author, "A new topic", now);
  return { ok: true, value };
}

/** Adds a reply to a topic. */
export async function createReply(
  db: Database,
  input: {
    tree: ForumTree;
    forum: Forum;
    topic: ForumTopic;
    author: User;
    body: string;
    now?: Date;
  },
): Promise<PostResult<ForumPost>> {
  const now = input.now ?? new Date();
  const viewer = forumViewer(input.author);
  const place = input.tree.place(input.forum);
  if (!can(viewer, "topic.reply", place, input.topic))
    return { ok: false, error: "forbidden" };
  const body = normalizeBody(input.body);
  const problem = checkBody(body);
  if (problem) return { ok: false, error: problem };
  const mod = input.tree.moderates(input.forum, viewer);
  // A reply to a topic still waiting (the author's own) waits with it.
  const reviewed =
    !can(viewer, "post.skip-review", place) ||
    (input.topic.state === "pending" && !mod);
  if (!mod) {
    const pace = await checkPace(db, input.author.id, now, reviewed);
    if (pace) return { ok: false, error: pace };
  }
  const html = await renderBody(db, body);
  const post = await db.transaction(async (tx) => {
    const [row] = await tx
      .insert(forumPosts)
      .values({
        topicId: input.topic.id,
        authorId: input.author.id,
        body,
        html,
        renderVersion: FORUM_RENDER_VERSION,
        state: reviewed ? "pending" : "published",
        createdAt: now,
      })
      .returning();
    if (!row) throw new Error("Saving the reply returned nothing");
    await tx
      .update(forumTopics)
      .set({ updatedAt: now })
      .where(eq(forumTopics.id, input.topic.id));
    await refreshTopic(tx, input.topic.id);
    return row;
  });
  if (reviewed && input.topic.state === "published")
    await alertWaiting(db, input.author, "A reply", now);
  return { ok: true, value: post };
}

/**
 * Changes a post (its author, or a moderator); on the first post, the topic's title
 * can change too.
 */
export async function editPost(
  db: Database,
  input: {
    tree: ForumTree;
    forum: Forum;
    topic: ForumTopic;
    post: ForumPost;
    editor: User;
    body: string;
    title?: string;
    now?: Date;
  },
): Promise<PostResult<ForumPost>> {
  const now = input.now ?? new Date();
  const viewer = forumViewer(input.editor);
  const place = input.tree.place(input.forum);
  const mod = input.tree.moderates(input.forum, viewer);
  if (!mod && !can(viewer, "post.edit-own", place, input.topic, input.post))
    return { ok: false, error: "forbidden" };
  const body = normalizeBody(input.body);
  const first = input.post.id === input.topic.firstPostId;
  const title =
    first && input.title !== undefined ? normalizeTitle(input.title) : null;
  const problem =
    (title !== null ? checkTitle(title) : null) ?? checkBody(body);
  if (problem) return { ok: false, error: problem };
  const html = await renderBody(db, body);
  const post = await db.transaction(async (tx) => {
    const [row] = await tx
      .update(forumPosts)
      .set({
        body,
        html,
        renderVersion: FORUM_RENDER_VERSION,
        editedAt: now,
        editedById: input.editor.id,
      })
      .where(eq(forumPosts.id, input.post.id))
      .returning();
    if (title !== null && title !== input.topic.title) {
      await tx
        .update(forumTopics)
        .set({ title, slug: slugify(title), updatedAt: now })
        .where(eq(forumTopics.id, input.topic.id));
    }
    return row;
  });
  if (!post) return { ok: false, error: "forbidden" };
  return { ok: true, value: post };
}

/**
 * Deletes a post (kept, but out of every view). The first post takes its topic
 * with it, which its author may only do while nobody else has replied.
 */
export async function deletePost(
  db: Database,
  input: {
    tree: ForumTree;
    forum: Forum;
    topic: ForumTopic;
    post: ForumPost;
    by: User;
    now?: Date;
  },
): Promise<PostResult<{ topicDeleted: boolean }>> {
  const now = input.now ?? new Date();
  const viewer = forumViewer(input.by);
  const place = input.tree.place(input.forum);
  const mod = input.tree.moderates(input.forum, viewer);
  if (!mod && !can(viewer, "post.delete-own", place, input.topic, input.post))
    return { ok: false, error: "forbidden" };
  const first = input.post.id === input.topic.firstPostId;
  if (first) {
    if (!mod) {
      const [others] = await db
        .select({ total: count() })
        .from(forumPosts)
        .where(
          and(
            eq(forumPosts.topicId, input.topic.id),
            isNull(forumPosts.deletedAt),
            ne(forumPosts.id, input.post.id),
            or(
              isNull(forumPosts.authorId),
              ne(forumPosts.authorId, input.by.id),
            ),
          ),
        );
      if ((others?.total ?? 0) > 0) return { ok: false, error: "forbidden" };
    }
    await deleteTopic(db, input.topic.id, now);
    return { ok: true, value: { topicDeleted: true } };
  }
  await db.transaction(async (tx) => {
    await tx
      .update(forumPosts)
      .set({ deletedAt: now })
      .where(eq(forumPosts.id, input.post.id));
    await refreshTopic(tx, input.topic.id);
  });
  return { ok: true, value: { topicDeleted: false } };
}

/** Deletes a whole topic (kept, but out of every view). */
export async function deleteTopic(
  db: Database,
  topicId: number,
  now = new Date(),
): Promise<void> {
  await db.transaction(async (tx) => {
    const [topic] = await tx
      .update(forumTopics)
      .set({ deletedAt: now, pinned: "none" })
      .where(eq(forumTopics.id, topicId))
      .returning({ forumId: forumTopics.forumId });
    if (topic) await refreshForum(tx, topic.forumId);
  });
}

export type ModerationAction =
  | "approve"
  | "hide"
  | "unhide"
  | "delete"
  | "lock"
  | "unlock"
  | `pin-${ForumPin}`;

export const MODERATION_ACTIONS: readonly ModerationAction[] = [
  "approve",
  "hide",
  "unhide",
  "delete",
  "lock",
  "unlock",
  "pin-none",
  "pin-forum",
  "pin-global",
];

export function isModerationAction(value: string): value is ModerationAction {
  return (MODERATION_ACTIONS as readonly string[]).includes(value);
}

/**
 * A moderator's action on a post (approve, hide, unhide, delete) or its topic
 * (lock, unlock, pin). On the first post, approving and hiding act on the topic
 * too. Approving someone's post also trusts them, as approving a comment does.
 * Returns whether anything changed.
 */
export async function moderatePost(
  db: Database,
  input: {
    topic: ForumTopic;
    post: ForumPost;
    action: ModerationAction;
    now?: Date;
  },
): Promise<boolean> {
  const now = input.now ?? new Date();
  const { topic, post, action } = input;
  const first = post.id === topic.firstPostId;
  const setState = async (from: ForumPostState[], to: ForumPostState) =>
    db.transaction(async (tx) => {
      const changed = await tx
        .update(forumPosts)
        .set({ state: to })
        .where(and(eq(forumPosts.id, post.id), inArray(forumPosts.state, from)))
        .returning();
      if (changed.length === 0) return false;
      if (first) {
        await tx
          .update(forumTopics)
          .set({ state: to })
          .where(eq(forumTopics.id, topic.id));
        // The author's replies that waited with their topic go live with it.
        if (to === "published") {
          await tx
            .update(forumPosts)
            .set({ state: "published" })
            .where(
              and(
                eq(forumPosts.topicId, topic.id),
                eq(forumPosts.state, "pending"),
                post.authorId === null
                  ? sql`false`
                  : eq(forumPosts.authorId, post.authorId),
              ),
            );
        }
      }
      if (to === "published" && post.authorId) {
        await tx
          .update(users)
          .set({ trustedAt: now })
          .where(and(eq(users.id, post.authorId), isNull(users.trustedAt)));
      }
      await refreshTopic(tx, topic.id);
      return true;
    });

  switch (action) {
    case "approve":
      return setState(["pending"], "published");
    case "hide":
      return setState(["pending", "published"], "hidden");
    case "unhide":
      return setState(["hidden"], "published");
    case "delete":
      if (first) {
        await deleteTopic(db, topic.id, now);
      } else {
        await db.transaction(async (tx) => {
          await tx
            .update(forumPosts)
            .set({ deletedAt: now })
            .where(eq(forumPosts.id, post.id));
          await refreshTopic(tx, topic.id);
        });
      }
      return true;
    case "lock":
    case "unlock": {
      const changed = await db
        .update(forumTopics)
        .set({ locked: action === "lock" })
        .where(eq(forumTopics.id, topic.id))
        .returning({ id: forumTopics.id });
      return changed.length > 0;
    }
    case "pin-none":
    case "pin-forum":
    case "pin-global": {
      const pinned = action.slice("pin-".length) as ForumPin;
      const changed = await db
        .update(forumTopics)
        .set({ pinned })
        .where(eq(forumTopics.id, topic.id))
        .returning({ id: forumTopics.id });
      return changed.length > 0;
    }
  }
}

/** What's waiting for approval, oldest first (the admin's queue). */
export async function waitingPosts(db: Database, limit = 100) {
  const rows = await db
    .select({
      post: forumPosts,
      topic: forumTopics,
      forum: { id: forums.id, slug: forums.slug, name: forums.name },
      author: authorColumns,
    })
    .from(forumPosts)
    .innerJoin(forumTopics, eq(forumTopics.id, forumPosts.topicId))
    .innerJoin(forums, eq(forums.id, forumTopics.forumId))
    .leftJoin(users, eq(users.id, forumPosts.authorId))
    .where(
      and(
        eq(forumPosts.state, "pending"),
        isNull(forumPosts.deletedAt),
        isNull(forumTopics.deletedAt),
      ),
    )
    .orderBy(asc(forumPosts.createdAt))
    .limit(limit);
  return rows.map((row) => ({
    post: row.post,
    topic: row.topic,
    forum: row.forum,
    author: author(row.author),
    first: row.post.id === row.topic.firstPostId,
  }));
}

export async function waitingCount(db: Database): Promise<number> {
  const [row] = await db
    .select({ total: count() })
    .from(forumPosts)
    .innerJoin(forumTopics, eq(forumTopics.id, forumPosts.topicId))
    .where(
      and(
        eq(forumPosts.state, "pending"),
        isNull(forumPosts.deletedAt),
        isNull(forumTopics.deletedAt),
      ),
    );
  return row?.total ?? 0;
}

// ---------------------------------------------------------------------------
// Search

export const SEARCH_RESULTS = 30;

export interface SearchHit {
  topic: ForumTopic;
  forum: Pick<Forum, "id" | "slug" | "name">;
  /** The best-matching post, and a bit of its text. */
  postId: number;
  snippet: string;
}

/**
 * Topics whose title or posts match a search, best first (Postgres full-text
 * search, in English), among what the viewer may see.
 */
export async function searchForum(
  db: Database,
  input: { q: string; tree: ForumTree; viewer: ForumViewer | null },
): Promise<SearchHit[]> {
  const q = input.q.trim().slice(0, 200);
  const ids = input.tree.visibleIds(input.viewer);
  if (!q || ids.length === 0) return [];
  const query = sql`websearch_to_tsquery('english', ${q})`;
  const bodyVector = sql`to_tsvector('english', ${forumPosts.body})`;
  const titleVector = sql`to_tsvector('english', ${forumTopics.title})`;
  const rank = sql<number>`ts_rank(setweight(${titleVector}, 'A') || setweight(${bodyVector}, 'C'), ${query})`;
  const rows = await db
    .select({
      topic: forumTopics,
      forum: { id: forums.id, slug: forums.slug, name: forums.name },
      postId: forumPosts.id,
      html: forumPosts.html,
      rank,
    })
    .from(forumPosts)
    .innerJoin(forumTopics, eq(forumTopics.id, forumPosts.topicId))
    .innerJoin(forums, eq(forums.id, forumTopics.forumId))
    .leftJoin(users, eq(users.id, forumPosts.authorId))
    .where(
      and(
        inArray(forumTopics.forumId, ids),
        isNull(forumTopics.deletedAt),
        eq(forumTopics.state, "published"),
        isNull(forumPosts.deletedAt),
        eq(forumPosts.state, "published"),
        or(isNull(forumPosts.authorId), isNull(users.blockedAt)),
        or(
          sql`${bodyVector} @@ ${query}`,
          and(
            sql`${titleVector} @@ ${query}`,
            eq(forumPosts.id, forumTopics.firstPostId),
          ),
        ),
      ),
    )
    .orderBy(desc(rank), desc(forumPosts.createdAt))
    .limit(SEARCH_RESULTS * 5);
  const hits = new Map<number, SearchHit>();
  for (const row of rows) {
    if (hits.has(row.topic.id)) continue;
    hits.set(row.topic.id, {
      topic: row.topic,
      forum: row.forum,
      postId: row.postId,
      snippet: excerpt(plainText(row.html), 200),
    });
    if (hits.size >= SEARCH_RESULTS) break;
  }
  return [...hits.values()];
}

// ---------------------------------------------------------------------------
// Accounts

/** Everything someone wrote in the forum, for their export. */
export async function forumExport(db: Database, userId: string) {
  const [topics, posts] = await Promise.all([
    db
      .select({
        id: forumTopics.id,
        title: forumTopics.title,
        forum: forums.slug,
        state: forumTopics.state,
        createdAt: forumTopics.createdAt,
        deleted: sql<boolean>`${forumTopics.deletedAt} is not null`,
      })
      .from(forumTopics)
      .innerJoin(forums, eq(forums.id, forumTopics.forumId))
      .where(eq(forumTopics.authorId, userId))
      .orderBy(asc(forumTopics.createdAt)),
    db
      .select({
        id: forumPosts.id,
        topicId: forumPosts.topicId,
        body: forumPosts.body,
        state: forumPosts.state,
        createdAt: forumPosts.createdAt,
        editedAt: forumPosts.editedAt,
        deleted: sql<boolean>`${forumPosts.deletedAt} is not null`,
      })
      .from(forumPosts)
      .where(eq(forumPosts.authorId, userId))
      .orderBy(asc(forumPosts.createdAt)),
  ]);
  return { topics, posts };
}
