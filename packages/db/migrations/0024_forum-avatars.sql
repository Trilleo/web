CREATE TYPE "public"."forum_kind" AS ENUM('category', 'forum');--> statement-breakpoint
CREATE TYPE "public"."forum_moderation" AS ENUM('none', 'newcomers', 'all');--> statement-breakpoint
CREATE TYPE "public"."forum_pin" AS ENUM('none', 'forum', 'global');--> statement-breakpoint
CREATE TYPE "public"."forum_post_state" AS ENUM('pending', 'published', 'hidden');--> statement-breakpoint
CREATE TABLE "avatars" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"hash" text NOT NULL,
	"content_type" text NOT NULL,
	"data" "bytea" NOT NULL,
	"size" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "forum_posts" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "forum_posts_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"topic_id" integer NOT NULL,
	"author_id" uuid,
	"body" text NOT NULL,
	"html" text DEFAULT '' NOT NULL,
	"render_version" integer DEFAULT 0 NOT NULL,
	"state" "forum_post_state" DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"edited_at" timestamp with time zone,
	"edited_by_id" uuid,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "forum_topics" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "forum_topics_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"forum_id" integer NOT NULL,
	"author_id" uuid,
	"title" text NOT NULL,
	"slug" text NOT NULL,
	"state" "forum_post_state" DEFAULT 'pending' NOT NULL,
	"pinned" "forum_pin" DEFAULT 'none' NOT NULL,
	"locked" boolean DEFAULT false NOT NULL,
	"first_post_id" integer,
	"reply_count" integer DEFAULT 0 NOT NULL,
	"view_count" integer DEFAULT 0 NOT NULL,
	"last_post_id" integer,
	"last_post_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "forums" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "forums_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"parent_id" integer,
	"kind" "forum_kind" DEFAULT 'forum' NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"sort" integer DEFAULT 0 NOT NULL,
	"layout" text DEFAULT 'classic' NOT NULL,
	"moderation" "forum_moderation" DEFAULT 'newcomers' NOT NULL,
	"locked" boolean DEFAULT false NOT NULL,
	"hidden" boolean DEFAULT false NOT NULL,
	"topic_count" integer DEFAULT 0 NOT NULL,
	"post_count" integer DEFAULT 0 NOT NULL,
	"last_post_id" integer,
	"last_post_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "forums_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "avatar_hash" text;--> statement-breakpoint
ALTER TABLE "avatars" ADD CONSTRAINT "avatars_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "forum_posts" ADD CONSTRAINT "forum_posts_topic_id_forum_topics_id_fk" FOREIGN KEY ("topic_id") REFERENCES "public"."forum_topics"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "forum_posts" ADD CONSTRAINT "forum_posts_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "forum_posts" ADD CONSTRAINT "forum_posts_edited_by_id_users_id_fk" FOREIGN KEY ("edited_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "forum_topics" ADD CONSTRAINT "forum_topics_forum_id_forums_id_fk" FOREIGN KEY ("forum_id") REFERENCES "public"."forums"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "forum_topics" ADD CONSTRAINT "forum_topics_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "forums" ADD CONSTRAINT "forums_parent_id_forums_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."forums"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "avatars_hash_idx" ON "avatars" USING btree ("hash");--> statement-breakpoint
CREATE INDEX "forum_posts_topic_idx" ON "forum_posts" USING btree ("topic_id","created_at");--> statement-breakpoint
CREATE INDEX "forum_posts_author_idx" ON "forum_posts" USING btree ("author_id","created_at");--> statement-breakpoint
CREATE INDEX "forum_posts_state_idx" ON "forum_posts" USING btree ("state");--> statement-breakpoint
CREATE INDEX "forum_posts_search_idx" ON "forum_posts" USING gin (to_tsvector('english', "body"));--> statement-breakpoint
CREATE INDEX "forum_topics_forum_idx" ON "forum_topics" USING btree ("forum_id","pinned","last_post_at");--> statement-breakpoint
CREATE INDEX "forum_topics_recent_idx" ON "forum_topics" USING btree ("last_post_at");--> statement-breakpoint
CREATE INDEX "forum_topics_author_idx" ON "forum_topics" USING btree ("author_id");--> statement-breakpoint
CREATE INDEX "forums_parent_idx" ON "forums" USING btree ("parent_id","sort");--> statement-breakpoint
-- The forum's first categories and forums. Runs once; the admin changes them from
-- /admin/forum/ afterwards.
INSERT INTO "forums" ("kind", "slug", "name", "description", "sort") VALUES
  ('category', 'community', 'Community', 'Talk about anything here.', 0),
  ('category', 'site', 'This site', 'The site, its tools and games.', 1)
ON CONFLICT ("slug") DO NOTHING;--> statement-breakpoint
INSERT INTO "forums" ("parent_id", "slug", "name", "description", "sort", "moderation", "locked")
SELECT "parent"."id", "child"."slug", "child"."name", "child"."description", "child"."sort", "child"."moderation"::"forum_moderation", "child"."locked"
FROM (VALUES
  ('community', 'announcements', 'Announcements', 'News about the site, from Trilleo.', 0, 'all', true),
  ('community', 'general', 'General', 'Anything that doesn’t fit somewhere else.', 1, 'newcomers', false),
  ('community', 'introductions', 'Introductions', 'New here? Say hello.', 2, 'newcomers', false),
  ('site', 'help', 'Help & feedback', 'Questions about the site, bug reports and ideas.', 0, 'newcomers', false)
) AS "child" ("parent", "slug", "name", "description", "sort", "moderation", "locked")
JOIN "forums" AS "parent" ON "parent"."slug" = "child"."parent"
ON CONFLICT ("slug") DO NOTHING;
