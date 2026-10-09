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
  uniqueIndex,
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
 * An account. People are known by their email address (`email`, proved with a
 * code) and sign in with it, or with an account elsewhere linked to it
 * (user_identities). `username` is the site's own handle, used in URLs.
 */
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  /**
   * The linked GitHub account's numeric ID (also in user_identities), kept on the
   * row so ADMIN_GITHUB_IDS can be checked without a lookup. Null: none linked.
   */
  githubId: bigint("github_id", { mode: "number" }).unique(),
  /**
   * Deprecated: the username before the site had its own. Still written (a copy of
   * `username`) so the previous release keeps working after a rollback; never read.
   * Drop it in a later release.
   */
  githubLogin: text("github_login"),
  /**
   * The handle in /people/<username>/ and @mentions: lower-case letters, digits and
   * hyphens (apps/web/src/lib/auth/usernames.ts). Old ones redirect for a while
   * (username_history).
   */
  username: text("username").notNull().unique(),
  /** When they last chose a new username (for the cooldown). */
  usernameChangedAt: timestamp("username_changed_at", { withTimezone: true }),
  /** The name a linked account gave (GitHub's display name); displayName wins over it. */
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
  /**
   * Who they are: the address they sign in with and notifications go to. Always one
   * they proved (a code, or a linked account that vouched for it). Lower-cased; one
   * account per address. Null only for accounts from before email sign-in, which are
   * asked for one the next time they sign in.
   */
  email: text("email").unique(),
  emailVerifiedAt: timestamp("email_verified_at", { withTimezone: true }),
  /** Which notifications they want, by topic (@trilleo/mail); missing: on. */
  emailNotifications: jsonb("email_notifications")
    .$type<Record<string, boolean>>()
    .notNull()
    .default({}),
  /** The secret in their unsubscribe links. Replaced when the address changes. */
  emailToken: text("email_token").unique(),
});

/**
 * A way to sign in to an account other than email: an account elsewhere (for now
 * only GitHub), by the ID that provider never changes. One per provider per account.
 */
export const userIdentities = pgTable(
  "user_identities",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    provider: text("provider", { enum: ["github"] }).notNull(),
    providerUserId: text("provider_user_id").notNull(),
    /** Its username there (shown in account settings), refreshed when used. */
    login: text("login"),
    linkedAt: timestamp("linked_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("user_identities_provider_idx").on(
      table.provider,
      table.providerUserId,
    ),
    uniqueIndex("user_identities_user_provider_idx").on(
      table.userId,
      table.provider,
    ),
  ],
);

/**
 * Usernames someone gave up: /people/<old>/ and the like redirect to their new one,
 * and nobody else can take it, until USERNAME_HOLD_DAYS after `releasedAt`.
 */
export const usernameHistory = pgTable(
  "username_history",
  {
    username: text("username").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    releasedAt: timestamp("released_at", { withTimezone: true }).notNull(),
  },
  (table) => [index("username_history_user_idx").on(table.userId)],
);

/**
 * A passkey (WebAuthn credential) someone added to sign in with. `id` is the
 * credential ID (base64url); `publicKey` the COSE key the authenticator gave, kept
 * to check its signatures (apps/web/src/lib/auth/webauthn.ts).
 */
export const passkeys = pgTable(
  "passkeys",
  {
    id: text("id").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    /** The COSE_Key, base64url. */
    publicKey: text("public_key").notNull(),
    /** Its COSE algorithm: -7 ES256, -8 EdDSA, -257 RS256. */
    algorithm: integer("algorithm").notNull(),
    /** The authenticator's counter (0 for most synced passkeys). */
    signCount: bigint("sign_count", { mode: "number" }).notNull().default(0),
    transports: jsonb("transports").$type<string[]>().notNull().default([]),
    /** Shown on /account/security/; they can rename it. */
    name: text("name").notNull(),
    /** Synced between devices (the backup-state flag). */
    backedUp: boolean("backed_up").notNull().default(false),
    createdAt: createdAt(),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
  },
  (table) => [index("passkeys_user_idx").on(table.userId)],
);

/**
 * What happened to an account's security, for /account/security/ and the export:
 * sign-ins (and how), address changes, linked accounts, passkeys, sign-outs.
 * `device` is a rough browser name (never the IP). Purged after
 * SECURITY_LOG_DAYS (apps/web/src/lib/auth/activity.ts).
 */
export const securityEvents = pgTable(
  "security_events",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    kind: text("kind").notNull(),
    /** What else there is to say: the method, a provider, a masked address… */
    detail: text("detail"),
    device: text("device"),
    at: timestamp("at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("security_events_user_idx").on(table.userId, table.at)],
);

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

/**
 * A message sent from /contact/. Anyone can write, signed in or not; a signed-in
 * sender's account is linked (and the message goes with the account). `email` is
 * optional: where to reply. status: new, read, or archived by the admin. Deleted a
 * year after it arrives (CONTACT_RETENTION_DAYS in apps/web).
 */
export const contactMessages = pgTable(
  "contact_messages",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
    topic: text("topic").notNull(),
    name: text("name").notNull(),
    email: text("email"),
    body: text("body").notNull(),
    status: text("status", { enum: ["new", "read", "archived"] })
      .notNull()
      .default("new"),
    createdAt: createdAt(),
    /** When the admin last answered it by email (/admin/messages/). */
    repliedAt: timestamp("replied_at", { withTimezone: true }),
  },
  (table) => [
    index("contact_messages_status_idx").on(table.status, table.createdAt),
    index("contact_messages_user_idx").on(table.userId, table.createdAt),
  ],
);

/**
 * A one-time code sent to an address, to prove it's theirs. Only its SHA-256 is
 * kept; it expires, allows a few guesses, and works once. Purposes: "verify-email"
 * (a signed-in account adds or changes its address), "sign-in" (`userId` empty when
 * the address has no account yet), and "sign-up" (not a code: the hash of the
 * ticket that lets a proved, new address finish creating its account), and
 * "undo-email" (not a code: the hash of the link sent to an old address after a
 * change; `email` is that old address, kept until it expires).
 */
export const emailCodes = pgTable(
  "email_codes",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    purpose: text("purpose", {
      enum: ["verify-email", "sign-in", "sign-up", "undo-email"],
    }).notNull(),
    codeHash: text("code_hash").notNull(),
    attempts: integer("attempts").notNull().default(0),
    createdAt: createdAt(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    usedAt: timestamp("used_at", { withTimezone: true }),
  },
  (table) => [
    index("email_codes_user_idx").on(table.userId, table.createdAt),
    index("email_codes_email_idx").on(table.email, table.createdAt),
  ],
);

/** See MAIL_STATUSES in @trilleo/mail. */
export const mailStatus = pgEnum("mail_status", [
  "queued",
  "sending",
  "sent",
  "failed",
  "captured",
  "cancelled",
]);

/**
 * The outbox: every email the site sends, written here first and sent in the
 * background (retried with backoff). Also the log the admin reads at /admin/mail/.
 * Bodies are cleared after MAIL_RETENTION_DAYS (and right after sending, for codes);
 * the row itself goes after MAIL_LOG_DAYS. `ref` ties a message to what it's about
 * (e.g. "contact:12").
 */
export const mailMessages = pgTable(
  "mail_messages",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
    kind: text("kind").notNull(),
    toAddress: text("to_address").notNull(),
    replyTo: text("reply_to"),
    subject: text("subject").notNull(),
    textBody: text("text_body"),
    htmlBody: text("html_body"),
    headers: jsonb("headers")
      .$type<Record<string, string>>()
      .notNull()
      .default({}),
    ref: text("ref"),
    status: mailStatus("status").notNull().default("queued"),
    attempts: integer("attempts").notNull().default(0),
    nextAttemptAt: timestamp("next_attempt_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    lastError: text("last_error"),
    providerMessageId: text("provider_message_id"),
    createdAt: createdAt(),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    bodyPurgedAt: timestamp("body_purged_at", { withTimezone: true }),
  },
  (table) => [
    index("mail_messages_due_idx").on(table.status, table.nextAttemptAt),
    index("mail_messages_user_idx").on(table.userId, table.createdAt),
    index("mail_messages_created_idx").on(table.createdAt),
    index("mail_messages_ref_idx").on(table.ref),
  ],
);

/**
 * Something the admin should hear about (a message, a file waiting, a report).
 * Collected here and mailed in batches, at most one email per ADMIN_ALERT_GAP.
 */
export const adminAlerts = pgTable(
  "admin_alerts",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    kind: text("kind").notNull(),
    summary: text("summary").notNull(),
    /** Where to deal with it, site-relative. */
    path: text("path").notNull(),
    createdAt: createdAt(),
    mailedAt: timestamp("mailed_at", { withTimezone: true }),
  },
  (table) => [
    index("admin_alerts_mailed_idx").on(table.mailedAt, table.createdAt),
  ],
);

/** What a Minecraft project is (its listing at /minecraft/<type>/). */
export const mcProjectType = pgEnum("mc_project_type", [
  "mod",
  "plugin",
  "world",
  "build",
  "resource_pack",
  "data_pack",
]);

export const mcEdition = pgEnum("mc_edition", ["java", "bedrock", "both"]);

/**
 * What its creator chose: draft (only them), public (listed), unlisted (anyone with
 * the link) or archived (public, marked as no longer updated). Others see a project
 * only once a release's main file is published, and never while `hiddenAt` is set.
 */
export const mcProjectState = pgEnum("mc_project_state", [
  "draft",
  "public",
  "unlisted",
  "archived",
]);

/** A link on a project page (source code, issues, wiki, Discord, donations…). */
export interface McProjectLink {
  kind: string;
  url: string;
}

/**
 * A creation on the Minecraft platform (/minecraft/<type>/<slug>/). Its files live in
 * releases, its images in the gallery, both stored as `files` (purposes "minecraft"
 * and "minecraft-media"). Goes with the account.
 */
export const mcProjects = pgTable(
  "mc_projects",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    /** Its URL. Old slugs live on in mc_project_slugs as redirects. */
    slug: text("slug").notNull().unique(),
    ownerId: uuid("owner_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: mcProjectType("type").notNull(),
    edition: mcEdition("edition").notNull().default("java"),
    name: text("name").notNull(),
    /** One line for cards and search results. */
    summary: text("summary").notNull().default(""),
    /** Markdown, as typed; `descriptionHtml` is rendered from it when saved. */
    description: text("description").notNull().default(""),
    descriptionHtml: text("description_html").notNull().default(""),
    renderVersion: integer("render_version").notNull().default(0),
    tags: text("tags")
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    /** An id from the site's licence list, or "custom" (see `licenseText`). */
    license: text("license").notNull(),
    licenseText: text("license_text"),
    links: jsonb("links").$type<McProjectLink[]>().notNull().default([]),
    /** The gallery image shown on cards and share cards. */
    coverFileId: text("cover_file_id").references(() => files.id, {
      onDelete: "set null",
    }),
    state: mcProjectState("state").notNull().default("draft"),
    /** Taken down by the admin (or by reports, until the admin looks). */
    hiddenAt: timestamp("hidden_at", { withTimezone: true }),
    hiddenReason: text("hidden_reason"),
    /** Picked by the admin for the landing page. */
    featuredAt: timestamp("featured_at", { withTimezone: true }),
    createdAt: createdAt(),
    /** Details, gallery or releases last changed. */
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    /** When a release first went live (sorts "newest"). */
    firstReleasedAt: timestamp("first_released_at", { withTimezone: true }),
    /** When a release last went live (sorts "updated"). */
    lastReleasedAt: timestamp("last_released_at", { withTimezone: true }),
  },
  (table) => [
    index("mc_projects_owner_idx").on(table.ownerId, table.createdAt),
    index("mc_projects_listing_idx").on(
      table.type,
      table.state,
      table.lastReleasedAt,
    ),
  ],
);

/** Slugs a project used to have: their URLs redirect to its current one. */
export const mcProjectSlugs = pgTable(
  "mc_project_slugs",
  {
    slug: text("slug").primaryKey(),
    projectId: integer("project_id")
      .notNull()
      .references(() => mcProjects.id, { onDelete: "cascade" }),
    createdAt: createdAt(),
  },
  (table) => [index("mc_project_slugs_project_idx").on(table.projectId)],
);

/** A project's images, in order. Shown once the file is published. */
export const mcGallery = pgTable(
  "mc_gallery",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    projectId: integer("project_id")
      .notNull()
      .references(() => mcProjects.id, { onDelete: "cascade" }),
    fileId: text("file_id")
      .notNull()
      .unique()
      .references(() => files.id, { onDelete: "cascade" }),
    caption: text("caption").notNull().default(""),
    position: integer("position").notNull().default(0),
    createdAt: createdAt(),
  },
  (table) => [
    index("mc_gallery_project_idx").on(table.projectId, table.position),
  ],
);

/** release: stable; beta and alpha are offered only when asked for. */
export const mcChannel = pgEnum("mc_channel", ["release", "beta", "alpha"]);

/**
 * A version of a project. Others see it once its main file is published (after
 * review, or straight away for trusted creators).
 */
export const mcReleases = pgTable(
  "mc_releases",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    projectId: integer("project_id")
      .notNull()
      .references(() => mcProjects.id, { onDelete: "cascade" }),
    /** "1.4.2", "v3", "2024-06": unique within the project, part of its URL. */
    version: text("version").notNull(),
    /** An optional name ("The Nether update"). */
    title: text("title").notNull().default(""),
    channel: mcChannel("channel").notNull().default("release"),
    changelog: text("changelog").notNull().default(""),
    changelogHtml: text("changelog_html").notNull().default(""),
    renderVersion: integer("render_version").notNull().default(0),
    /** Minecraft versions it works with ("1.21.4"…). */
    gameVersions: text("game_versions")
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    /** Mod loaders or server platforms ("fabric", "paper"…); empty for other types. */
    loaders: text("loaders")
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    createdAt: createdAt(),
    /** When its main file first went live. */
    releasedAt: timestamp("released_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("mc_releases_version_idx").on(table.projectId, table.version),
    index("mc_releases_project_idx").on(table.projectId, table.createdAt),
  ],
);

/** A release's files: one main file (what Download gets), plus extras. */
export const mcReleaseFiles = pgTable(
  "mc_release_files",
  {
    releaseId: integer("release_id")
      .notNull()
      .references(() => mcReleases.id, { onDelete: "cascade" }),
    fileId: text("file_id")
      .notNull()
      .unique()
      .references(() => files.id, { onDelete: "cascade" }),
    primary: boolean("primary").notNull().default(false),
  },
  (table) => [primaryKey({ columns: [table.releaseId, table.fileId] })],
);

export const mcDependencyKind = pgEnum("mc_dependency_kind", [
  "required",
  "optional",
  "incompatible",
  "embedded",
]);

/** What a release needs (or clashes with): a project here, or one elsewhere. */
export const mcDependencies = pgTable(
  "mc_dependencies",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    releaseId: integer("release_id")
      .notNull()
      .references(() => mcReleases.id, { onDelete: "cascade" }),
    /** A project on this site… */
    projectId: integer("project_id").references(
      (): AnyPgColumn => mcProjects.id,
      { onDelete: "set null" },
    ),
    /** …or one elsewhere (also kept as the name if the project here goes). */
    name: text("name").notNull(),
    url: text("url"),
    kind: mcDependencyKind("kind").notNull().default("required"),
  },
  (table) => [index("mc_dependencies_release_idx").on(table.releaseId)],
);

/**
 * Someone's report about a project's page (its text or images; files have their own
 * reports). One open report per person per project. Enough of them hide the project
 * until the admin looks.
 */
export const mcProjectReports = pgTable(
  "mc_project_reports",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    projectId: integer("project_id")
      .notNull()
      .references(() => mcProjects.id, { onDelete: "cascade" }),
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
    index("mc_project_reports_project_idx").on(table.projectId, table.status),
    index("mc_project_reports_reporter_idx").on(
      table.reporterId,
      table.createdAt,
    ),
  ],
);

/** One kind of block in a build, for its materials list. */
export interface McMaterial {
  block: string;
  count: number;
}

/**
 * A build file's 3D preview (@trilleo/mc-files' compact form, gzipped), made by the
 * creator's browser when it was uploaded and checked by the server. Kept in the
 * database (small, and backed up with it); served at /minecraft/preview/<file>.bin
 * while its file is. Goes with the file.
 */
export const mcPreviews = pgTable("mc_previews", {
  fileId: text("file_id")
    .primaryKey()
    .references(() => files.id, { onDelete: "cascade" }),
  data: bytea("data").notNull(),
  width: integer("width").notNull(),
  height: integer("height").notNull(),
  length: integer("length").notNull(),
  /** Blocks that aren't air. */
  blocks: integer("blocks").notNull(),
  materials: jsonb("materials").$type<McMaterial[]>().notNull(),
  createdAt: createdAt(),
});

export type User = typeof users.$inferSelect;
export type Session = typeof sessions.$inferSelect;
export type UserIdentity = typeof userIdentities.$inferSelect;
export type Passkey = typeof passkeys.$inferSelect;
export type SecurityEvent = typeof securityEvents.$inferSelect;
export type IdentityProvider = UserIdentity["provider"];
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
export type ContactMessage = typeof contactMessages.$inferSelect;
export type McProject = typeof mcProjects.$inferSelect;
export type McProjectType = (typeof mcProjectType.enumValues)[number];
export type McEdition = (typeof mcEdition.enumValues)[number];
export type McProjectState = (typeof mcProjectState.enumValues)[number];
export type McGalleryImage = typeof mcGallery.$inferSelect;
export type McRelease = typeof mcReleases.$inferSelect;
export type McChannel = (typeof mcChannel.enumValues)[number];
export type McReleaseFile = typeof mcReleaseFiles.$inferSelect;
export type McDependency = typeof mcDependencies.$inferSelect;
export type McDependencyKind = (typeof mcDependencyKind.enumValues)[number];
export type McProjectReport = typeof mcProjectReports.$inferSelect;
export type McPreview = typeof mcPreviews.$inferSelect;
export type EmailCode = typeof emailCodes.$inferSelect;
export type MailMessage = typeof mailMessages.$inferSelect;
export type MailMessageStatus = (typeof mailStatus.enumValues)[number];
export type AdminAlert = typeof adminAlerts.$inferSelect;
