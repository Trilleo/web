CREATE TABLE "sb_sync_log" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "sb_sync_log_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"profile_id" integer NOT NULL,
	"at" timestamp with time zone DEFAULT now() NOT NULL,
	"captured_at" timestamp with time zone NOT NULL,
	"source" text NOT NULL,
	"mode" text NOT NULL,
	"sync_key" text,
	"changes" jsonb NOT NULL,
	"progress" jsonb NOT NULL,
	"answer" jsonb NOT NULL
);
--> statement-breakpoint
ALTER TABLE "sb_sync_log" ADD CONSTRAINT "sb_sync_log_profile_id_sb_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."sb_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "sb_sync_log_profile_idx" ON "sb_sync_log" USING btree ("profile_id","at");--> statement-breakpoint
CREATE UNIQUE INDEX "sb_sync_log_key_idx" ON "sb_sync_log" USING btree ("profile_id","sync_key");