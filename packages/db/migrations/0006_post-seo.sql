ALTER TABLE "posts" ADD COLUMN "seo_title" text;--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "seo_description" text;--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "index_now_at" timestamp with time zone;