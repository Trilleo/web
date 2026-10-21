CREATE TABLE "forum_attachments" (
	"file_id" text PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"post_id" integer,
	"sort" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "forum_blocks" (
	"user_id" uuid NOT NULL,
	"blocked_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "forum_blocks_user_id_blocked_id_pk" PRIMARY KEY("user_id","blocked_id")
);
--> statement-breakpoint
CREATE TABLE "forum_conversation_members" (
	"conversation_id" integer NOT NULL,
	"user_id" uuid NOT NULL,
	"joined_at" timestamp with time zone NOT NULL,
	"last_read_at" timestamp with time zone,
	"left_at" timestamp with time zone,
	"muted" boolean DEFAULT false NOT NULL,
	CONSTRAINT "forum_conversation_members_conversation_id_user_id_pk" PRIMARY KEY("conversation_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "forum_conversations" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "forum_conversations_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"subject" text NOT NULL,
	"started_by_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_message_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "forum_messages" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "forum_messages_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"conversation_id" integer NOT NULL,
	"author_id" uuid,
	"body" text NOT NULL,
	"html" text NOT NULL,
	"render_version" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "forum_poll_options" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "forum_poll_options_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"poll_id" integer NOT NULL,
	"label" text NOT NULL,
	"sort" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "forum_poll_votes" (
	"poll_id" integer NOT NULL,
	"option_id" integer NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "forum_poll_votes_option_id_user_id_pk" PRIMARY KEY("option_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "forum_polls" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "forum_polls_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"topic_id" integer NOT NULL,
	"question" text NOT NULL,
	"multiple" boolean DEFAULT false NOT NULL,
	"max_choices" integer,
	"results_before_vote" boolean DEFAULT false NOT NULL,
	"closes_at" timestamp with time zone,
	"closed_at" timestamp with time zone,
	"close_notified_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "forum_polls_topic_id_unique" UNIQUE("topic_id")
);
--> statement-breakpoint
ALTER TABLE "forum_notifications" ADD COLUMN "conversation_id" integer;--> statement-breakpoint
ALTER TABLE "forum_reports" ADD COLUMN "message_id" integer;--> statement-breakpoint
ALTER TABLE "forum_user_settings" ADD COLUMN "messages" text DEFAULT 'everyone' NOT NULL;--> statement-breakpoint
ALTER TABLE "forum_attachments" ADD CONSTRAINT "forum_attachments_file_id_files_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."files"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "forum_attachments" ADD CONSTRAINT "forum_attachments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "forum_attachments" ADD CONSTRAINT "forum_attachments_post_id_forum_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."forum_posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "forum_blocks" ADD CONSTRAINT "forum_blocks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "forum_blocks" ADD CONSTRAINT "forum_blocks_blocked_id_users_id_fk" FOREIGN KEY ("blocked_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "forum_conversation_members" ADD CONSTRAINT "forum_conversation_members_conversation_id_forum_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."forum_conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "forum_conversation_members" ADD CONSTRAINT "forum_conversation_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "forum_conversations" ADD CONSTRAINT "forum_conversations_started_by_id_users_id_fk" FOREIGN KEY ("started_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "forum_messages" ADD CONSTRAINT "forum_messages_conversation_id_forum_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."forum_conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "forum_messages" ADD CONSTRAINT "forum_messages_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "forum_poll_options" ADD CONSTRAINT "forum_poll_options_poll_id_forum_polls_id_fk" FOREIGN KEY ("poll_id") REFERENCES "public"."forum_polls"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "forum_poll_votes" ADD CONSTRAINT "forum_poll_votes_poll_id_forum_polls_id_fk" FOREIGN KEY ("poll_id") REFERENCES "public"."forum_polls"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "forum_poll_votes" ADD CONSTRAINT "forum_poll_votes_option_id_forum_poll_options_id_fk" FOREIGN KEY ("option_id") REFERENCES "public"."forum_poll_options"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "forum_poll_votes" ADD CONSTRAINT "forum_poll_votes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "forum_polls" ADD CONSTRAINT "forum_polls_topic_id_forum_topics_id_fk" FOREIGN KEY ("topic_id") REFERENCES "public"."forum_topics"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "forum_attachments_post_idx" ON "forum_attachments" USING btree ("post_id");--> statement-breakpoint
CREATE INDEX "forum_conversation_members_user_idx" ON "forum_conversation_members" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "forum_messages_conversation_idx" ON "forum_messages" USING btree ("conversation_id","created_at");--> statement-breakpoint
CREATE INDEX "forum_messages_author_idx" ON "forum_messages" USING btree ("author_id","created_at");--> statement-breakpoint
CREATE INDEX "forum_poll_options_poll_idx" ON "forum_poll_options" USING btree ("poll_id");--> statement-breakpoint
CREATE INDEX "forum_poll_votes_poll_idx" ON "forum_poll_votes" USING btree ("poll_id","user_id");--> statement-breakpoint
ALTER TABLE "forum_notifications" ADD CONSTRAINT "forum_notifications_conversation_id_forum_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."forum_conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "forum_reports" ADD CONSTRAINT "forum_reports_message_id_forum_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."forum_messages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
-- Polls and attachments are new permissions: the groups that could write get them.
UPDATE "forum_groups" SET "permissions" = "permissions" || '{"poll.create":true,"post.attach":true}'::jsonb
WHERE "slug" IN ('newcomer', 'member', 'moderator', 'admin');
