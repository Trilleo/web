/**
 * The database schema. After changing it, run `pnpm --filter @trilleo/db db:generate`
 * and commit the new migration. Migrations must stay backward-compatible with the
 * previous release (add, don't rename or drop in one step) so a rollback still works.
 */
import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  customType,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";

const createdAt = () =>
  timestamp("created_at", { withTimezone: true }).notNull().defaultNow();

/** A link on someone's profile. */
export interface ProfileLink {
  label: string;
  url: string;
}

/** How someone's comments are signed: their display name, or just @username. */
export const commentName = pgEnum("comment_name", ["display", "username"]);

/**
 * Someone who has signed in with GitHub: their public GitHub profile, plus the
 * profile they fill in themselves (/account/profile).
 */
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  // GitHub's numeric user ID never changes; the login (username) can.
  githubId: bigint("github_id", { mode: "number" }).notNull().unique(),
  githubLogin: text("github_login").notNull(),
  /** GitHub's display name, refreshed on every sign-in; displayName wins over it. */
  name: text("name"),
  /** Chosen on the site. Null: GitHub's name, then the login. */
  displayName: text("display_name"),
  bio: text("bio"),
  pronouns: text("pronouns"),
  location: text("location"),
  /** A short "currently" line, e.g. "Building a redstone computer". */
  status: text("status"),
  links: jsonb("links").$type<ProfileLink[]>().notNull().default([]),
  /** Show /people/<login>. When false, only they can see it. */
  profilePublic: boolean("profile_public").notNull().default(true),
  commentName: commentName("comment_name").notNull().default("display"),
  profileUpdatedAt: timestamp("profile_updated_at", { withTimezone: true }),
  createdAt: createdAt(),
  lastSignInAt: timestamp("last_sign_in_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  /** Set when the admin first approves one of their comments: later ones skip review. */
  trustedAt: timestamp("trusted_at", { withTimezone: true }),
  /** Set by the admin: can't sign in or comment, and their comments are hidden. */
  blockedAt: timestamp("blocked_at", { withTimezone: true }),
});

/** A signed-in browser. `id` is the SHA-256 of the cookie's token, never the token. */
export const sessions = pgTable(
  "sessions",
  {
    id: text("id").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: createdAt(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    /** Updated at most every few minutes (see SESSION_TOUCH_MS), not on every request. */
    lastUsedAt: timestamp("last_used_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    /** The browser's User-Agent at sign-in, trimmed; for the sessions list. */
    userAgent: text("user_agent"),
  },
  (table) => [
    index("sessions_user_id_idx").on(table.userId),
    index("sessions_expires_at_idx").on(table.expiresAt),
  ],
);

/** pending: waiting for the admin; published: visible; hidden: removed by the admin. */
export const commentStatus = pgEnum("comment_status", [
  "pending",
  "published",
  "hidden",
]);

/**
 * A comment on a post. Replies point at a top-level comment (one level of threads).
 * A deleted comment that still has replies stays as a placeholder: `deletedAt` set,
 * body emptied, author cleared.
 */
export const comments = pgTable(
  "comments",
  {
    // A short number, for readable #comment-42 anchors.
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    /** The post's id in the "writing" collection (its URL slug). */
    postSlug: text("post_slug").notNull(),
    authorId: uuid("author_id").references(() => users.id, {
      onDelete: "set null",
    }),
    parentId: integer("parent_id").references((): AnyPgColumn => comments.id, {
      onDelete: "cascade",
    }),
    /** What the author typed (light Markdown), rendered when shown. */
    body: text("body").notNull(),
    status: commentStatus("status").notNull().default("pending"),
    createdAt: createdAt(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    index("comments_post_idx").on(table.postSlug, table.createdAt),
    index("comments_author_idx").on(table.authorId, table.createdAt),
    index("comments_parent_idx").on(table.parentId),
    index("comments_status_idx").on(table.status),
  ],
);

/** draft: only the admin sees it; published: public once `publishedAt` has passed. */
export const postStatus = pgEnum("post_status", ["draft", "published"]);

/** open: anyone signed in can comment; closed: shown, no new ones; off: none shown. */
export const commentMode = pgEnum("comment_mode", ["open", "closed", "off"]);

/** A heading in a post's table of contents. */
export interface PostHeading {
  depth: number;
  slug: string;
  text: string;
}

/**
 * A blog post, written in the admin editor. A published post with a future
 * `publishedAt` is scheduled: it appears on its own once that time passes. `html` and
 * `toc` are rendered from `body` when it's saved; a post whose `renderVersion` is
 * behind the renderer's is rendered again when next read.
 */
export const posts = pgTable(
  "posts",
  {
    // A short number for admin URLs (/admin/posts/7/).
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    /** Its URL: /writing/<slug>/. Old slugs live on in post_slugs as redirects. */
    slug: text("slug").notNull().unique(),
    title: text("title").notNull(),
    description: text("description").notNull().default(""),
    /** Search engines' and link previews' title, when it should differ from `title`. */
    seoTitle: text("seo_title"),
    /** The same for the description. */
    seoDescription: text("seo_description"),
    /** Markdown, as typed. */
    body: text("body").notNull().default(""),
    tags: text("tags")
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    status: postStatus("status").notNull().default("draft"),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    /** Shown to readers as "Updated": set when the admin marks an edit as one. */
    revisedAt: timestamp("revised_at", { withTimezone: true }),
    html: text("html").notNull().default(""),
    toc: jsonb("toc").$type<PostHeading[]>().notNull().default([]),
    renderVersion: integer("render_version").notNull().default(0),
    commentMode: commentMode("comment_mode").notNull().default("open"),
    /** The secret in a draft's share link (/writing/preview/<token>/), if one exists. */
    previewToken: text("preview_token").unique(),
    /** The one comment shown first, marked as pinned. */
    pinnedCommentId: integer("pinned_comment_id").references(
      (): AnyPgColumn => comments.id,
      { onDelete: "set null" },
    ),
    createdAt: createdAt(),
    /**
     * When search engines were last told (IndexNow) about this post's address, or
     * null: public posts saved since then are told on the next chance.
     */
    indexNowAt: timestamp("index_now_at", { withTimezone: true }),
    /** Last saved in the editor. */
    savedAt: timestamp("saved_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("posts_published_idx").on(table.status, table.publishedAt)],
);

/** Slugs a post used to have: their URLs redirect to its current one. */
export const postSlugs = pgTable(
  "post_slugs",
  {
    slug: text("slug").primaryKey(),
    postId: integer("post_id")
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    createdAt: createdAt(),
  },
  (table) => [index("post_slugs_post_idx").on(table.postId)],
);

const bytea = customType<{ data: Uint8Array; driverData: Uint8Array }>({
  dataType: () => "bytea",
});

/**
 * An image uploaded in the post editor, served at /media/<id>.<ext>. `id` is the
 * SHA-256 of the bytes (hex), so the same file uploaded twice is stored once and its
 * URL never changes meaning. Kept in the database so backups include it.
 */
export const media = pgTable(
  "media",
  {
    id: text("id").primaryKey(),
    contentType: text("content_type").notNull(),
    data: bytea("data").notNull(),
    size: integer("size").notNull(),
    /** The uploaded file's name, for the admin's reference. */
    name: text("name").notNull(),
    uploadedBy: uuid("uploaded_by").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: createdAt(),
  },
  (table) => [index("media_created_idx").on(table.createdAt)],
);

/**
 * What tools save for signed-in people: one JSON value per (user, tool, key), e.g. a
 * note per key in Notes. The site's tool API checks each tool's own schema and size
 * limits before anything lands here. Goes with the account.
 */
export const toolData = pgTable(
  "tool_data",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    /** The tool's slug, e.g. "notes". */
    tool: text("tool").notNull(),
    key: text("key").notNull(),
    value: jsonb("value").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.userId, table.tool, table.key] })],
);

export type User = typeof users.$inferSelect;
export type Session = typeof sessions.$inferSelect;
export type Comment = typeof comments.$inferSelect;
export type CommentName = (typeof commentName.enumValues)[number];
export type CommentStatus = (typeof commentStatus.enumValues)[number];
export type Post = typeof posts.$inferSelect;
export type PostStatus = (typeof postStatus.enumValues)[number];
export type CommentMode = (typeof commentMode.enumValues)[number];
export type Media = typeof media.$inferSelect;
export type ToolDataRow = typeof toolData.$inferSelect;
