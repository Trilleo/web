CREATE TABLE "file_downloads" (
	"file_id" text NOT NULL,
	"day" date NOT NULL,
	"count" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "file_downloads_file_id_day_pk" PRIMARY KEY("file_id","day")
);
--> statement-breakpoint
ALTER TABLE "files" ADD COLUMN "thumbnail_key" text;--> statement-breakpoint
ALTER TABLE "files" ADD COLUMN "scan_status" text;--> statement-breakpoint
ALTER TABLE "files" ADD COLUMN "scan_detail" text;--> statement-breakpoint
ALTER TABLE "files" ADD COLUMN "scanned_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "files" ADD COLUMN "held_for_scan" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "file_downloads" ADD CONSTRAINT "file_downloads_file_id_files_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."files"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "file_downloads_day_idx" ON "file_downloads" USING btree ("day");