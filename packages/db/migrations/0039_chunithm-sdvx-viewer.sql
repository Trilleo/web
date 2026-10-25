CREATE TABLE "chuni_sdvx_move" (
	"id" integer PRIMARY KEY NOT NULL,
	"moved_at" timestamp with time zone NOT NULL,
	"summary" jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chuni_sdvx_placements" (
	"ref" text PRIMARY KEY NOT NULL,
	"song_id" integer,
	"difficulty" "chuni_difficulty",
	"from_path" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chuni_sdvx_songs" (
	"key" text PRIMARY KEY NOT NULL,
	"list" text NOT NULL,
	"title" text NOT NULL,
	"artist" text DEFAULT '' NOT NULL,
	"genre" text DEFAULT '' NOT NULL,
	"bpm" text,
	"charts" jsonb NOT NULL,
	"removed" boolean DEFAULT false NOT NULL,
	"removed_on" date,
	"removed_in" text,
	"first_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"listed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "chuni_charts" ADD COLUMN "note_types" jsonb;--> statement-breakpoint
ALTER TABLE "chuni_charts" ADD COLUMN "sdvx_ref" text;--> statement-breakpoint
ALTER TABLE "chuni_sdvx_placements" ADD CONSTRAINT "chuni_sdvx_placements_song_id_chuni_songs_id_fk" FOREIGN KEY ("song_id") REFERENCES "public"."chuni_songs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "chuni_charts_sdvx_ref_idx" ON "chuni_charts" USING btree ("sdvx_ref");