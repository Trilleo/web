CREATE TYPE "public"."chuni_import_status" AS ENUM('queued', 'running', 'done', 'failed');--> statement-breakpoint
CREATE TABLE "chuni_imports" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "chuni_imports_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"file_id" text,
	"name" text NOT NULL,
	"bytes" bigint NOT NULL,
	"status" "chuni_import_status" DEFAULT 'queued' NOT NULL,
	"requested_at" timestamp with time zone NOT NULL,
	"started_at" timestamp with time zone,
	"finished_at" timestamp with time zone,
	"summary" jsonb
);
--> statement-breakpoint
ALTER TABLE "chuni_imports" ADD CONSTRAINT "chuni_imports_file_id_files_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."files"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "chuni_imports_file_idx" ON "chuni_imports" USING btree ("file_id");--> statement-breakpoint
CREATE INDEX "chuni_imports_requested_idx" ON "chuni_imports" USING btree ("requested_at");