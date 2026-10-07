CREATE TABLE "mc_previews" (
	"file_id" text PRIMARY KEY NOT NULL,
	"data" "bytea" NOT NULL,
	"width" integer NOT NULL,
	"height" integer NOT NULL,
	"length" integer NOT NULL,
	"blocks" integer NOT NULL,
	"materials" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "mc_previews" ADD CONSTRAINT "mc_previews_file_id_files_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."files"("id") ON DELETE cascade ON UPDATE no action;