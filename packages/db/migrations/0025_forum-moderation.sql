CREATE TYPE "public"."forum_report_status" AS ENUM('open', 'actioned', 'dismissed');--> statement-breakpoint
CREATE TABLE "forum_bans" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "forum_bans_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"user_id" uuid NOT NULL,
	"reason" text NOT NULL,
	"until" timestamp with time zone,
	"by_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"lifted_at" timestamp with time zone,
	"lifted_by_id" uuid
);
--> statement-breakpoint
CREATE TABLE "forum_group_members" (
	"group_id" integer NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "forum_group_members_group_id_user_id_pk" PRIMARY KEY("group_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "forum_groups" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "forum_groups_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"title" text,
	"built_in" boolean DEFAULT false NOT NULL,
	"permissions" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"edit_window_minutes" integer,
	"sort" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "forum_groups_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "forum_log" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "forum_log_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"actor_id" uuid,
	"action" text NOT NULL,
	"forum_id" integer,
	"topic_id" integer,
	"post_id" integer,
	"target_user_id" uuid,
	"detail" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "forum_moderators" (
	"forum_id" integer NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "forum_moderators_forum_id_user_id_pk" PRIMARY KEY("forum_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "forum_permissions" (
	"forum_id" integer NOT NULL,
	"group_id" integer NOT NULL,
	"permission" text NOT NULL,
	"allowed" boolean NOT NULL,
	CONSTRAINT "forum_permissions_forum_id_group_id_permission_pk" PRIMARY KEY("forum_id","group_id","permission")
);
--> statement-breakpoint
CREATE TABLE "forum_post_revisions" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "forum_post_revisions_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"post_id" integer NOT NULL,
	"body" text NOT NULL,
	"title" text,
	"editor_id" uuid,
	"saved_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "forum_reports" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "forum_reports_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"kind" text NOT NULL,
	"post_id" integer,
	"user_id" uuid,
	"reporter_id" uuid,
	"reason" text NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	"status" "forum_report_status" DEFAULT 'open' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"resolved_at" timestamp with time zone,
	"resolved_by_id" uuid
);
--> statement-breakpoint
ALTER TABLE "forum_topics" ADD COLUMN "merged_into" integer;--> statement-breakpoint
ALTER TABLE "forum_bans" ADD CONSTRAINT "forum_bans_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "forum_bans" ADD CONSTRAINT "forum_bans_by_id_users_id_fk" FOREIGN KEY ("by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "forum_bans" ADD CONSTRAINT "forum_bans_lifted_by_id_users_id_fk" FOREIGN KEY ("lifted_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "forum_group_members" ADD CONSTRAINT "forum_group_members_group_id_forum_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."forum_groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "forum_group_members" ADD CONSTRAINT "forum_group_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "forum_log" ADD CONSTRAINT "forum_log_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "forum_log" ADD CONSTRAINT "forum_log_forum_id_forums_id_fk" FOREIGN KEY ("forum_id") REFERENCES "public"."forums"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "forum_log" ADD CONSTRAINT "forum_log_topic_id_forum_topics_id_fk" FOREIGN KEY ("topic_id") REFERENCES "public"."forum_topics"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "forum_log" ADD CONSTRAINT "forum_log_post_id_forum_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."forum_posts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "forum_log" ADD CONSTRAINT "forum_log_target_user_id_users_id_fk" FOREIGN KEY ("target_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "forum_moderators" ADD CONSTRAINT "forum_moderators_forum_id_forums_id_fk" FOREIGN KEY ("forum_id") REFERENCES "public"."forums"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "forum_moderators" ADD CONSTRAINT "forum_moderators_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "forum_permissions" ADD CONSTRAINT "forum_permissions_forum_id_forums_id_fk" FOREIGN KEY ("forum_id") REFERENCES "public"."forums"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "forum_permissions" ADD CONSTRAINT "forum_permissions_group_id_forum_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."forum_groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "forum_post_revisions" ADD CONSTRAINT "forum_post_revisions_post_id_forum_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."forum_posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "forum_post_revisions" ADD CONSTRAINT "forum_post_revisions_editor_id_users_id_fk" FOREIGN KEY ("editor_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "forum_reports" ADD CONSTRAINT "forum_reports_post_id_forum_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."forum_posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "forum_reports" ADD CONSTRAINT "forum_reports_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "forum_reports" ADD CONSTRAINT "forum_reports_reporter_id_users_id_fk" FOREIGN KEY ("reporter_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "forum_reports" ADD CONSTRAINT "forum_reports_resolved_by_id_users_id_fk" FOREIGN KEY ("resolved_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "forum_bans_user_idx" ON "forum_bans" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "forum_group_members_user_idx" ON "forum_group_members" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "forum_log_created_idx" ON "forum_log" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "forum_moderators_user_idx" ON "forum_moderators" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "forum_post_revisions_post_idx" ON "forum_post_revisions" USING btree ("post_id");--> statement-breakpoint
CREATE INDEX "forum_reports_status_idx" ON "forum_reports" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "forum_reports_post_idx" ON "forum_reports" USING btree ("post_id");--> statement-breakpoint
CREATE INDEX "forum_reports_reporter_idx" ON "forum_reports" USING btree ("reporter_id");--> statement-breakpoint
-- The built-in groups (@trilleo/forum's BUILT_IN_GROUPS), with their default
-- permissions and edit windows. Runs once; the admin changes them afterwards.
INSERT INTO "forum_groups" ("slug", "name", "description", "title", "built_in", "permissions", "edit_window_minutes", "sort") VALUES
  ('guest', 'Guests', 'People who aren’t signed in.', NULL, true, '{"forum.view":true}'::jsonb, NULL, 0),
  ('newcomer', 'Newcomers', 'Signed in, but none of their posts or comments approved yet. Where newcomers wait for approval, theirs do.', NULL, true, '{"forum.view":true,"topic.create":true,"topic.reply":true,"post.edit-own":true,"post.delete-own":true,"post.report":true}'::jsonb, 60, 1),
  ('member', 'Members', 'Signed in and trusted: one of their posts or comments was approved.', NULL, true, '{"forum.view":true,"topic.create":true,"topic.reply":true,"post.edit-own":true,"post.delete-own":true,"post.report":true,"post.skip-review":true}'::jsonb, 1440, 2),
  ('moderator', 'Moderators', 'People the admin adds. They moderate every forum.', 'Moderator', true, '{"forum.view":true,"topic.create":true,"topic.reply":true,"post.edit-own":true,"post.delete-own":true,"post.skip-review":true,"post.report":true,"moderate":true}'::jsonb, NULL, 3),
  ('admin', 'Admins', 'The site’s admins. They can do everything, everywhere.', 'Admin', true, '{"forum.view":true,"topic.create":true,"topic.reply":true,"post.edit-own":true,"post.delete-own":true,"post.skip-review":true,"post.report":true,"moderate":true}'::jsonb, NULL, 4)
ON CONFLICT ("slug") DO NOTHING;
