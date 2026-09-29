CREATE TYPE "public"."comment_status" AS ENUM('pending', 'published', 'hidden');--> statement-breakpoint
CREATE TABLE "comments" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "comments_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"post_slug" text NOT NULL,
	"author_id" uuid,
	"parent_id" integer,
	"body" text NOT NULL,
	"status" "comment_status" DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "trusted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "blocked_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_parent_id_comments_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."comments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "comments_post_idx" ON "comments" USING btree ("post_slug","created_at");--> statement-breakpoint
CREATE INDEX "comments_author_idx" ON "comments" USING btree ("author_id","created_at");--> statement-breakpoint
CREATE INDEX "comments_parent_idx" ON "comments" USING btree ("parent_id");--> statement-breakpoint
CREATE INDEX "comments_status_idx" ON "comments" USING btree ("status");