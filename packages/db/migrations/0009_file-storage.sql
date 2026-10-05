CREATE TYPE "public"."file_status" AS ENUM('uploading', 'processing', 'pending_review', 'published', 'rejected', 'removed', 'deleted');--> statement-breakpoint
CREATE TYPE "public"."file_visibility" AS ENUM('public', 'unlisted', 'private');--> statement-breakpoint
CREATE TABLE "files" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_id" uuid,
	"purpose" text NOT NULL,
	"name" text NOT NULL,
	"key" text NOT NULL,
	"size" bigint NOT NULL,
	"content_type" text NOT NULL,
	"kind" text NOT NULL,
	"label" text NOT NULL,
	"sha256" text,
	"visibility" "file_visibility" DEFAULT 'public' NOT NULL,
	"status" "file_status" DEFAULT 'uploading' NOT NULL,
	"status_reason" text,
	"upload_id" text,
	"downloads" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"uploaded_at" timestamp with time zone,
	"published_at" timestamp with time zone,
	"status_changed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"purged_at" timestamp with time zone,
	CONSTRAINT "files_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "storage_events" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "storage_events_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"file_id" text,
	"actor_id" uuid,
	"action" text NOT NULL,
	"from_status" "file_status",
	"to_status" "file_status",
	"reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "storage_quota_bytes" bigint;--> statement-breakpoint
ALTER TABLE "files" ADD CONSTRAINT "files_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "storage_events" ADD CONSTRAINT "storage_events_file_id_files_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."files"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "storage_events" ADD CONSTRAINT "storage_events_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "files_owner_idx" ON "files" USING btree ("owner_id","created_at");--> statement-breakpoint
CREATE INDEX "files_status_idx" ON "files" USING btree ("status","status_changed_at");--> statement-breakpoint
CREATE INDEX "files_purpose_idx" ON "files" USING btree ("purpose","created_at");--> statement-breakpoint
CREATE INDEX "files_sha256_idx" ON "files" USING btree ("sha256");--> statement-breakpoint
CREATE INDEX "storage_events_file_idx" ON "storage_events" USING btree ("file_id","created_at");--> statement-breakpoint
CREATE INDEX "storage_events_created_idx" ON "storage_events" USING btree ("created_at");