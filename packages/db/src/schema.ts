/**
 * The database schema. After changing it, run `pnpm --filter @trilleo/db db:generate`
 * and commit the new migration. Migrations must stay backward-compatible with the
 * previous release (add, don't rename or drop in one step) so a rollback still works.
 */
import {
  bigint,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";

const createdAt = () =>
  timestamp("created_at", { withTimezone: true }).notNull().defaultNow();

/** Someone who has signed in with GitHub. Only their public profile is kept. */
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  // GitHub's numeric user ID never changes; the login (username) can.
  githubId: bigint("github_id", { mode: "number" }).notNull().unique(),
  githubLogin: text("github_login").notNull(),
  name: text("name"),
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

export type User = typeof users.$inferSelect;
export type Session = typeof sessions.$inferSelect;
export type Comment = typeof comments.$inferSelect;
export type CommentStatus = (typeof commentStatus.enumValues)[number];
