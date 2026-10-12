CREATE TYPE "public"."wiki_proposal_status" AS ENUM('pending', 'approved', 'declined', 'withdrawn');--> statement-breakpoint
CREATE TABLE "wiki_digests" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"sent_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "wiki_proposals" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "wiki_proposals_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"wiki_id" integer NOT NULL,
	"title" text NOT NULL,
	"base_revision_id" integer,
	"author_id" uuid NOT NULL,
	"body" text NOT NULL,
	"summary" text DEFAULT '' NOT NULL,
	"status" "wiki_proposal_status" DEFAULT 'pending' NOT NULL,
	"reviewer_id" uuid,
	"note" text DEFAULT '' NOT NULL,
	"revision_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"decided_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "wiki_watches" (
	"user_id" uuid NOT NULL,
	"wiki_id" integer NOT NULL,
	"page_key" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "wiki_watches_user_id_wiki_id_page_key_pk" PRIMARY KEY("user_id","wiki_id","page_key")
);
--> statement-breakpoint
ALTER TABLE "wiki_digests" ADD CONSTRAINT "wiki_digests_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wiki_proposals" ADD CONSTRAINT "wiki_proposals_wiki_id_wikis_id_fk" FOREIGN KEY ("wiki_id") REFERENCES "public"."wikis"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wiki_proposals" ADD CONSTRAINT "wiki_proposals_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wiki_proposals" ADD CONSTRAINT "wiki_proposals_reviewer_id_users_id_fk" FOREIGN KEY ("reviewer_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wiki_watches" ADD CONSTRAINT "wiki_watches_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wiki_watches" ADD CONSTRAINT "wiki_watches_wiki_id_wikis_id_fk" FOREIGN KEY ("wiki_id") REFERENCES "public"."wikis"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "wiki_proposals_wiki_idx" ON "wiki_proposals" USING btree ("wiki_id","status","created_at");--> statement-breakpoint
CREATE INDEX "wiki_proposals_author_idx" ON "wiki_proposals" USING btree ("author_id","created_at");--> statement-breakpoint
CREATE INDEX "wiki_watches_page_idx" ON "wiki_watches" USING btree ("wiki_id","page_key");