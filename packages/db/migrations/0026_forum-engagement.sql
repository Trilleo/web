CREATE TABLE "forum_drafts" (
	"user_id" uuid NOT NULL,
	"key" text NOT NULL,
	"title" text DEFAULT '' NOT NULL,
	"body" text DEFAULT '' NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "forum_drafts_user_id_key_pk" PRIMARY KEY("user_id","key")
);
--> statement-breakpoint
CREATE TABLE "forum_notifications" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "forum_notifications_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"user_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"actor_id" uuid,
	"topic_id" integer,
	"post_id" integer,
	"detail" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"read_at" timestamp with time zone,
	"emailed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "forum_prefixes" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "forum_prefixes_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"forum_id" integer NOT NULL,
	"label" text NOT NULL,
	"style" text DEFAULT 'outline' NOT NULL,
	"sort" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "forum_ranks" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "forum_ranks_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"name" text NOT NULL,
	"min_points" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "forum_reactions" (
	"post_id" integer NOT NULL,
	"user_id" uuid NOT NULL,
	"reaction" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "forum_reactions_post_id_user_id_pk" PRIMARY KEY("post_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "forum_reads" (
	"user_id" uuid NOT NULL,
	"topic_id" integer NOT NULL,
	"last_post_id" integer NOT NULL,
	"read_at" timestamp with time zone NOT NULL,
	CONSTRAINT "forum_reads_user_id_topic_id_pk" PRIMARY KEY("user_id","topic_id")
);
--> statement-breakpoint
CREATE TABLE "forum_tags" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "forum_tags_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "forum_tags_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "forum_topic_tags" (
	"topic_id" integer NOT NULL,
	"tag_id" integer NOT NULL,
	CONSTRAINT "forum_topic_tags_topic_id_tag_id_pk" PRIMARY KEY("topic_id","tag_id")
);
--> statement-breakpoint
CREATE TABLE "forum_user_badges" (
	"user_id" uuid NOT NULL,
	"badge" text NOT NULL,
	"earned_at" timestamp with time zone NOT NULL,
	CONSTRAINT "forum_user_badges_user_id_badge_pk" PRIMARY KEY("user_id","badge")
);
--> statement-breakpoint
CREATE TABLE "forum_user_settings" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"email" text DEFAULT 'instant' NOT NULL,
	"watch_replies" boolean DEFAULT true NOT NULL,
	"signature" text DEFAULT '' NOT NULL,
	"read_all_at" timestamp with time zone,
	"digest_sent_at" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "forum_user_stats" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"posts" integer DEFAULT 0 NOT NULL,
	"topics" integer DEFAULT 0 NOT NULL,
	"reactions_received" integer DEFAULT 0 NOT NULL,
	"accepted_answers" integer DEFAULT 0 NOT NULL,
	"points" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "forum_votes" (
	"post_id" integer NOT NULL,
	"user_id" uuid NOT NULL,
	"value" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "forum_votes_post_id_user_id_pk" PRIMARY KEY("post_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "forum_watches" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "forum_watches_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"user_id" uuid NOT NULL,
	"topic_id" integer,
	"forum_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "forum_posts" ADD COLUMN "parent_id" integer;--> statement-breakpoint
ALTER TABLE "forum_posts" ADD COLUMN "score" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "forum_topics" ADD COLUMN "prefix_id" integer;--> statement-breakpoint
ALTER TABLE "forum_topics" ADD COLUMN "solved_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "forum_topics" ADD COLUMN "accepted_post_id" integer;--> statement-breakpoint
ALTER TABLE "forum_drafts" ADD CONSTRAINT "forum_drafts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "forum_notifications" ADD CONSTRAINT "forum_notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "forum_notifications" ADD CONSTRAINT "forum_notifications_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "forum_notifications" ADD CONSTRAINT "forum_notifications_topic_id_forum_topics_id_fk" FOREIGN KEY ("topic_id") REFERENCES "public"."forum_topics"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "forum_notifications" ADD CONSTRAINT "forum_notifications_post_id_forum_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."forum_posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "forum_prefixes" ADD CONSTRAINT "forum_prefixes_forum_id_forums_id_fk" FOREIGN KEY ("forum_id") REFERENCES "public"."forums"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "forum_reactions" ADD CONSTRAINT "forum_reactions_post_id_forum_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."forum_posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "forum_reactions" ADD CONSTRAINT "forum_reactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "forum_reads" ADD CONSTRAINT "forum_reads_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "forum_reads" ADD CONSTRAINT "forum_reads_topic_id_forum_topics_id_fk" FOREIGN KEY ("topic_id") REFERENCES "public"."forum_topics"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "forum_topic_tags" ADD CONSTRAINT "forum_topic_tags_topic_id_forum_topics_id_fk" FOREIGN KEY ("topic_id") REFERENCES "public"."forum_topics"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "forum_topic_tags" ADD CONSTRAINT "forum_topic_tags_tag_id_forum_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."forum_tags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "forum_user_badges" ADD CONSTRAINT "forum_user_badges_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "forum_user_settings" ADD CONSTRAINT "forum_user_settings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "forum_user_stats" ADD CONSTRAINT "forum_user_stats_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "forum_votes" ADD CONSTRAINT "forum_votes_post_id_forum_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."forum_posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "forum_votes" ADD CONSTRAINT "forum_votes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "forum_watches" ADD CONSTRAINT "forum_watches_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "forum_watches" ADD CONSTRAINT "forum_watches_topic_id_forum_topics_id_fk" FOREIGN KEY ("topic_id") REFERENCES "public"."forum_topics"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "forum_watches" ADD CONSTRAINT "forum_watches_forum_id_forums_id_fk" FOREIGN KEY ("forum_id") REFERENCES "public"."forums"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "forum_notifications_user_idx" ON "forum_notifications" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "forum_prefixes_forum_idx" ON "forum_prefixes" USING btree ("forum_id");--> statement-breakpoint
CREATE INDEX "forum_reactions_user_idx" ON "forum_reactions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "forum_topic_tags_tag_idx" ON "forum_topic_tags" USING btree ("tag_id");--> statement-breakpoint
CREATE UNIQUE INDEX "forum_watches_topic_idx" ON "forum_watches" USING btree ("user_id","topic_id");--> statement-breakpoint
CREATE UNIQUE INDEX "forum_watches_forum_idx" ON "forum_watches" USING btree ("user_id","forum_id");--> statement-breakpoint
CREATE INDEX "forum_watches_topic_lookup_idx" ON "forum_watches" USING btree ("topic_id");--> statement-breakpoint
CREATE INDEX "forum_watches_forum_lookup_idx" ON "forum_watches" USING btree ("forum_id");--> statement-breakpoint
ALTER TABLE "forum_posts" ADD CONSTRAINT "forum_posts_parent_id_forum_posts_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."forum_posts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "forum_topics" ADD CONSTRAINT "forum_topics_prefix_id_forum_prefixes_id_fk" FOREIGN KEY ("prefix_id") REFERENCES "public"."forum_prefixes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
-- The starting ranks (@trilleo/forum's DEFAULT_RANKS); the admin edits them.
INSERT INTO "forum_ranks" ("name", "min_points") VALUES
  ('Newcomer', 0),
  ('Regular', 25),
  ('Contributor', 100),
  ('Expert', 400),
  ('Legend', 1000);--> statement-breakpoint
-- Reacting and voting are new permissions: the groups that could write get them.
UPDATE "forum_groups" SET "permissions" = "permissions" || '{"post.react":true,"post.vote":true}'::jsonb
WHERE "slug" IN ('newcomer', 'member', 'moderator', 'admin');
