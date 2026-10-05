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
  date,
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
  /** File storage allowance in bytes, set by the admin. Null: their role's default. */
  storageQuotaBytes: bigint("storage_quota_bytes", { mode: "number" }),
  /**
   * Upload trust: auto (earned by approved uploads, see @trilleo/storage's policy.ts),
   * or trusted / untrusted as the admin set it.
   */
  uploadTrust: text("upload_trust", { enum: ["auto", "trusted", "untrusted"] })
    .notNull()
    .default("auto"),
  /** When automatic upload trust was earned; a strike clears it. */
  uploadTrustedAt: timestamp("upload_trusted_at", { withTimezone: true }),
  /** Can't upload files (too many strikes, or the admin said so). */
  uploadBannedAt: timestamp("upload_banned_at", { withTimezone: true }),
  /** "strikes" for an automatic ban, else the admin's reason. */
  uploadBanReason: text("upload_ban_reason"),
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

/** What processing found out about a file. */
export interface FileDetails {
  archive?: {
    entries: { name: string; size: number; directory: boolean }[];
    total: number;
    uncompressed: number;
    truncated: boolean;
  };
}

/** A stored file's place in its life; see @trilleo/storage's moderation.ts. */
export const fileStatus = pgEnum("file_status", [
  "uploading",
  "processing",
  "pending_review",
  "published",
  "rejected",
  "removed",
  "deleted",
]);

/** public: listed; unlisted: anyone with the link; private: owner and admin only. */
export const fileVisibility = pgEnum("file_visibility", [
  "public",
  "unlisted",
  "private",
]);

/**
 * Files in object storage (Huawei OBS in production). The row is the truth about a
 * file; the bucket only holds its bytes, at `key`. Files never change: a new version
 * is a new file. Rows stay after the bytes are purged (`purgedAt`), as a record.
 */
export const files = pgTable(
  "files",
  {
    /** 12 random lowercase letters and digits; also in its URLs. */
    id: text("id").primaryKey(),
    ownerId: uuid("owner_id").references(() => users.id, {
      onDelete: "set null",
    }),
    /** The feature it's for (the site's storage purpose registry), e.g. "site". */
    purpose: text("purpose").notNull(),
    /** As uploaded, cleaned (shown, and the name it downloads as). */
    name: text("name").notNull(),
    /** The object's key in the bucket: f/<id>/<url name>. */
    key: text("key").notNull().unique(),
    size: bigint("size", { mode: "number" }).notNull(),
    /** The type it's served with. */
    contentType: text("content_type").notNull(),
    /** image, audio, video, archive, document, font, executable, text or data. */
    kind: text("kind").notNull(),
    /** For people: "PNG image", "Minecraft world". */
    label: text("label").notNull(),
    /** Hex SHA-256 of the bytes, once processed. */
    sha256: text("sha256"),
    visibility: fileVisibility("visibility").notNull().default("public"),
    status: fileStatus("status").notNull().default("uploading"),
    /** Why it was rejected or removed; shown to its owner. */
    statusReason: text("status_reason"),
    /** The storage's multipart upload id, while uploading. */
    uploadId: text("upload_id"),
    /** Counted by the /d/<id> redirect (roughly once per visitor per day). */
    downloads: integer("downloads").notNull().default(0),
    createdAt: createdAt(),
    /** When the bytes were all in. */
    uploadedAt: timestamp("uploaded_at", { withTimezone: true }),
    /** When it first went public. */
    publishedAt: timestamp("published_at", { withTimezone: true }),
    statusChangedAt: timestamp("status_changed_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    /** When its bytes were deleted from storage for good. */
    purgedAt: timestamp("purged_at", { withTimezone: true }),
    /** When the admin last looked at it (approved, or spot-checked). */
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    /** What processing found out, e.g. an archive's contents (for reviewers). */
    details: jsonb("details").$type<FileDetails>(),
    /** The small WebP preview's key (t/<id>.webp), if the browser made one. */
    thumbnailKey: text("thumbnail_key"),
    /**
     * The malware scan: clean, infected (ClamAV found something), or unscanned (the
     * scanner couldn't run); null when scanning is off. `scanDetail` says what was
     * found or why it couldn't scan.
     */
    scanStatus: text("scan_status", {
      enum: ["clean", "infected", "unscanned"],
    }),
    scanDetail: text("scan_detail"),
    scannedAt: timestamp("scanned_at", { withTimezone: true }),
    /** Waiting for review only because it couldn't be scanned (a clean rescan publishes it). */
    heldForScan: boolean("held_for_scan").notNull().default(false),
  },
  (table) => [
    index("files_owner_idx").on(table.ownerId, table.createdAt),
    index("files_status_idx").on(table.status, table.statusChangedAt),
    index("files_purpose_idx").on(table.purpose, table.createdAt),
    index("files_sha256_idx").on(table.sha256),
  ],
);

/**
 * Everything that happens to stored files (and, later, to uploaders): who did what,
 * when and why. Append-only; kept for the record (and China's six-month log rule).
 */
export const storageEvents = pgTable(
  "storage_events",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    fileId: text("file_id").references(() => files.id, {
      onDelete: "cascade",
    }),
    /** The uploader an action was about (trust, strikes, bans). */
    subjectId: uuid("subject_id").references(() => users.id, {
      onDelete: "cascade",
    }),
    /** Who acted; null for the server itself (or a deleted account). */
    actorId: uuid("actor_id").references(() => users.id, {
      onDelete: "set null",
    }),
    /** "upload", "complete", "publish", "remove", "visibility", "purge", … */
    action: text("action").notNull(),
    fromStatus: fileStatus("from_status"),
    toStatus: fileStatus("to_status"),
    reason: text("reason"),
    createdAt: createdAt(),
  },
  (table) => [
    index("storage_events_file_idx").on(table.fileId, table.createdAt),
    index("storage_events_created_idx").on(table.createdAt),
  ],
);

/**
 * A strike against an uploader: a file refused or taken down for cause. Strikes
 * count for 90 days (`expiresAt`); STRIKE_LIMIT active ones ban uploading. An
 * accepted appeal clears its strike.
 */
export const uploadStrikes = pgTable(
  "upload_strikes",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    fileId: text("file_id").references(() => files.id, {
      onDelete: "set null",
    }),
    reason: text("reason").notNull(),
    createdAt: createdAt(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    clearedAt: timestamp("cleared_at", { withTimezone: true }),
  },
  (table) => [
    index("upload_strikes_user_idx").on(table.userId, table.expiresAt),
  ],
);

/**
 * Someone's report about a public file. One open report per person per file.
 * open: waiting; dismissed: the admin found nothing wrong; actioned: the file
 * was taken down.
 */
export const fileReports = pgTable(
  "file_reports",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    fileId: text("file_id")
      .notNull()
      .references(() => files.id, { onDelete: "cascade" }),
    reporterId: uuid("reporter_id").references(() => users.id, {
      onDelete: "set null",
    }),
    reason: text("reason").notNull(),
    details: text("details").notNull().default(""),
    status: text("status", { enum: ["open", "dismissed", "actioned"] })
      .notNull()
      .default("open"),
    createdAt: createdAt(),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  },
  (table) => [
    index("file_reports_file_idx").on(table.fileId, table.status),
    index("file_reports_reporter_idx").on(table.reporterId, table.createdAt),
  ],
);

/**
 * An uploader asking the admin to reconsider a refused or removed file. One per
 * file. Accepting restores the file and clears its strike.
 */
export const fileAppeals = pgTable(
  "file_appeals",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    fileId: text("file_id")
      .notNull()
      .unique()
      .references(() => files.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    message: text("message").notNull(),
    status: text("status", { enum: ["open", "accepted", "denied"] })
      .notNull()
      .default("open"),
    /** The admin's answer, shown to the uploader. */
    response: text("response"),
    createdAt: createdAt(),
    decidedAt: timestamp("decided_at", { withTimezone: true }),
  },
  (table) => [
    index("file_appeals_status_idx").on(table.status, table.createdAt),
  ],
);

/** Bytes that were taken down for cause: uploading them again is refused. */
export const blockedHashes = pgTable("blocked_hashes", {
  sha256: text("sha256").primaryKey(),
  /** The file that got them blocked. */
  fileId: text("file_id").references(() => files.id, { onDelete: "set null" }),
  reason: text("reason").notNull(),
  createdAt: createdAt(),
});

/** Downloads per file per UTC day (counted by /d/<id>, once per visitor per day). */
export const fileDownloads = pgTable(
  "file_downloads",
  {
    fileId: text("file_id")
      .notNull()
      .references(() => files.id, { onDelete: "cascade" }),
    day: date("day", { mode: "string" }).notNull(),
    count: integer("count").notNull().default(0),
  },
  (table) => [
    primaryKey({ columns: [table.fileId, table.day] }),
    index("file_downloads_day_idx").on(table.day),
  ],
);

/**
 * Skygrid (apps/skygrid): one island per account. `state` is the engine's GameState,
 * changed only by replaying the player's actions on the server (the version goes up
 * with each sync, so two tabs can't overwrite each other). The totals beside it are
 * copies for leaderboards. Goes with the account.
 */
export const skygridSaves = pgTable(
  "skygrid_saves",
  {
    userId: uuid("user_id")
      .primaryKey()
      .references(() => users.id, { onDelete: "cascade" }),
    state: jsonb("state").notNull(),
    version: integer("version").notNull().default(1),
    skillXp: bigint("skill_xp", { mode: "number" }).notNull().default(0),
    coins: bigint("coins", { mode: "number" }).notNull().default(0),
    createdAt: createdAt(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("skygrid_saves_skill_xp_idx").on(table.skillXp)],
);

/**
 * Skygrid's Bazaar: players' buy orders and sell offers. What an order holds (coins
 * for a buy, items for a sell) was taken from the player's save when it was made.
 * Others fill it (`filled`); the owner collects the proceeds later (`claimed`), so
 * a trade never writes anyone else's save. `status`: open (in the book), filled
 * (waiting to be claimed), done, or cancelled. Goes with the account.
 */
export const skygridOrders = pgTable(
  "skygrid_orders",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    item: text("item").notNull(),
    side: text("side", { enum: ["buy", "sell"] }).notNull(),
    /** Coins per item. */
    price: integer("price").notNull(),
    quantity: integer("quantity").notNull(),
    filled: integer("filled").notNull().default(0),
    claimed: integer("claimed").notNull().default(0),
    status: text("status", { enum: ["open", "filled", "done", "cancelled"] })
      .notNull()
      .default("open"),
    createdAt: createdAt(),
  },
  (table) => [
    index("skygrid_orders_book_idx").on(
      table.item,
      table.side,
      table.status,
      table.price,
    ),
    index("skygrid_orders_user_idx").on(table.userId, table.status),
  ],
);

/** Every Bazaar trade, for price history. Anonymous: no one's name is kept. */
export const skygridTrades = pgTable(
  "skygrid_trades",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    item: text("item").notNull(),
    price: integer("price").notNull(),
    quantity: integer("quantity").notNull(),
    at: timestamp("at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("skygrid_trades_item_idx").on(table.item, table.at)],
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
export type StoredFile = typeof files.$inferSelect;
export type StorageEvent = typeof storageEvents.$inferSelect;
export type UploadStrike = typeof uploadStrikes.$inferSelect;
export type FileReport = typeof fileReports.$inferSelect;
export type FileAppeal = typeof fileAppeals.$inferSelect;
export type SkygridSave = typeof skygridSaves.$inferSelect;
export type SkygridOrder = typeof skygridOrders.$inferSelect;
