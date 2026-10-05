CREATE TABLE "blocked_hashes" (
	"sha256" text PRIMARY KEY NOT NULL,
	"file_id" text,
	"reason" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "file_appeals" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "file_appeals_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"file_id" text NOT NULL,
	"user_id" uuid NOT NULL,
	"message" text NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"response" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"decided_at" timestamp with time zone,
	CONSTRAINT "file_appeals_file_id_unique" UNIQUE("file_id")
);
--> statement-breakpoint
CREATE TABLE "file_reports" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "file_reports_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"file_id" text NOT NULL,
	"reporter_id" uuid,
	"reason" text NOT NULL,
	"details" text DEFAULT '' NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"resolved_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "upload_strikes" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "upload_strikes_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"user_id" uuid NOT NULL,
	"file_id" text,
	"reason" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"cleared_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "files" ADD COLUMN "reviewed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "files" ADD COLUMN "details" jsonb;--> statement-breakpoint
ALTER TABLE "storage_events" ADD COLUMN "subject_id" uuid;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "upload_trust" text DEFAULT 'auto' NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "upload_trusted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "upload_banned_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "upload_ban_reason" text;--> statement-breakpoint
ALTER TABLE "blocked_hashes" ADD CONSTRAINT "blocked_hashes_file_id_files_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."files"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "file_appeals" ADD CONSTRAINT "file_appeals_file_id_files_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."files"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "file_appeals" ADD CONSTRAINT "file_appeals_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "file_reports" ADD CONSTRAINT "file_reports_file_id_files_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."files"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "file_reports" ADD CONSTRAINT "file_reports_reporter_id_users_id_fk" FOREIGN KEY ("reporter_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "upload_strikes" ADD CONSTRAINT "upload_strikes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "upload_strikes" ADD CONSTRAINT "upload_strikes_file_id_files_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."files"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "file_appeals_status_idx" ON "file_appeals" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "file_reports_file_idx" ON "file_reports" USING btree ("file_id","status");--> statement-breakpoint
CREATE INDEX "file_reports_reporter_idx" ON "file_reports" USING btree ("reporter_id","created_at");--> statement-breakpoint
CREATE INDEX "upload_strikes_user_idx" ON "upload_strikes" USING btree ("user_id","expires_at");--> statement-breakpoint
ALTER TABLE "storage_events" ADD CONSTRAINT "storage_events_subject_id_users_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;