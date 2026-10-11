CREATE TYPE "public"."wiki_kind" AS ENUM('game', 'minecraft', 'code', 'general');--> statement-breakpoint
CREATE TYPE "public"."wiki_role" AS ENUM('owner', 'editor');--> statement-breakpoint
CREATE TYPE "public"."wiki_visibility" AS ENUM('public', 'unlisted', 'private');--> statement-breakpoint
CREATE TABLE "wiki_categories" (
	"page_id" integer NOT NULL,
	"wiki_id" integer NOT NULL,
	"category_key" text NOT NULL,
	"category_title" text NOT NULL,
	CONSTRAINT "wiki_categories_page_id_category_key_pk" PRIMARY KEY("page_id","category_key")
);
--> statement-breakpoint
CREATE TABLE "wiki_links" (
	"page_id" integer NOT NULL,
	"wiki_id" integer NOT NULL,
	"target_key" text NOT NULL,
	"target_title" text NOT NULL,
	CONSTRAINT "wiki_links_page_id_target_key_pk" PRIMARY KEY("page_id","target_key")
);
--> statement-breakpoint
CREATE TABLE "wiki_log" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "wiki_log_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"wiki_id" integer NOT NULL,
	"actor_id" uuid,
	"action" text NOT NULL,
	"title" text,
	"detail" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "wiki_members" (
	"wiki_id" integer NOT NULL,
	"user_id" uuid NOT NULL,
	"role" "wiki_role" NOT NULL,
	"added_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "wiki_members_wiki_id_user_id_pk" PRIMARY KEY("wiki_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "wiki_pages" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "wiki_pages_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"wiki_id" integer NOT NULL,
	"key" text NOT NULL,
	"title" text NOT NULL,
	"revision_id" integer,
	"redirect_to" text,
	"html" text DEFAULT '' NOT NULL,
	"toc" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"render_version" integer DEFAULT 0 NOT NULL,
	"plain" text DEFAULT '' NOT NULL,
	"protection" text DEFAULT 'none' NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "wiki_revisions" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "wiki_revisions_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"wiki_id" integer NOT NULL,
	"page_id" integer NOT NULL,
	"author_id" uuid,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"summary" text DEFAULT '' NOT NULL,
	"minor" boolean DEFAULT false NOT NULL,
	"bytes" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "wiki_sign_in_tickets" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"state_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "wikis" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "wikis_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"code" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"kind" "wiki_kind" DEFAULT 'general' NOT NULL,
	"visibility" "wiki_visibility" DEFAULT 'public' NOT NULL,
	"home_title" text DEFAULT 'Main Page' NOT NULL,
	"nav" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"source" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "wikis_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "wiki_categories" ADD CONSTRAINT "wiki_categories_page_id_wiki_pages_id_fk" FOREIGN KEY ("page_id") REFERENCES "public"."wiki_pages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wiki_categories" ADD CONSTRAINT "wiki_categories_wiki_id_wikis_id_fk" FOREIGN KEY ("wiki_id") REFERENCES "public"."wikis"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wiki_links" ADD CONSTRAINT "wiki_links_page_id_wiki_pages_id_fk" FOREIGN KEY ("page_id") REFERENCES "public"."wiki_pages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wiki_links" ADD CONSTRAINT "wiki_links_wiki_id_wikis_id_fk" FOREIGN KEY ("wiki_id") REFERENCES "public"."wikis"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wiki_log" ADD CONSTRAINT "wiki_log_wiki_id_wikis_id_fk" FOREIGN KEY ("wiki_id") REFERENCES "public"."wikis"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wiki_log" ADD CONSTRAINT "wiki_log_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wiki_members" ADD CONSTRAINT "wiki_members_wiki_id_wikis_id_fk" FOREIGN KEY ("wiki_id") REFERENCES "public"."wikis"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wiki_members" ADD CONSTRAINT "wiki_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wiki_pages" ADD CONSTRAINT "wiki_pages_wiki_id_wikis_id_fk" FOREIGN KEY ("wiki_id") REFERENCES "public"."wikis"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wiki_revisions" ADD CONSTRAINT "wiki_revisions_wiki_id_wikis_id_fk" FOREIGN KEY ("wiki_id") REFERENCES "public"."wikis"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wiki_revisions" ADD CONSTRAINT "wiki_revisions_page_id_wiki_pages_id_fk" FOREIGN KEY ("page_id") REFERENCES "public"."wiki_pages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wiki_revisions" ADD CONSTRAINT "wiki_revisions_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wiki_sign_in_tickets" ADD CONSTRAINT "wiki_sign_in_tickets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "wiki_categories_key_idx" ON "wiki_categories" USING btree ("wiki_id","category_key");--> statement-breakpoint
CREATE INDEX "wiki_links_target_idx" ON "wiki_links" USING btree ("wiki_id","target_key");--> statement-breakpoint
CREATE INDEX "wiki_log_wiki_idx" ON "wiki_log" USING btree ("wiki_id","created_at");--> statement-breakpoint
CREATE INDEX "wiki_members_user_idx" ON "wiki_members" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "wiki_pages_key_idx" ON "wiki_pages" USING btree ("wiki_id","key");--> statement-breakpoint
CREATE INDEX "wiki_pages_updated_idx" ON "wiki_pages" USING btree ("wiki_id","updated_at");--> statement-breakpoint
CREATE INDEX "wiki_revisions_page_idx" ON "wiki_revisions" USING btree ("page_id","id");--> statement-breakpoint
CREATE INDEX "wiki_revisions_wiki_idx" ON "wiki_revisions" USING btree ("wiki_id","created_at");--> statement-breakpoint
CREATE INDEX "wiki_revisions_author_idx" ON "wiki_revisions" USING btree ("author_id");--> statement-breakpoint
CREATE INDEX "wiki_sign_in_tickets_expires_idx" ON "wiki_sign_in_tickets" USING btree ("expires_at");