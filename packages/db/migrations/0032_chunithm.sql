CREATE TYPE "public"."chuni_difficulty" AS ENUM('basic', 'advanced', 'expert', 'master', 'ultima', 'worldsend');--> statement-breakpoint
CREATE TYPE "public"."chuni_link_source" AS ENUM('admin', 'otoge-db', 'title');--> statement-breakpoint
CREATE TABLE "chuni_charts" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "chuni_charts_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"song_id" integer NOT NULL,
	"difficulty" "chuni_difficulty" NOT NULL,
	"level" text NOT NULL,
	"worlds_end_stars" integer,
	"constant" integer,
	"notes" integer,
	"designer" text,
	"chain" integer,
	"sdvx_path" text,
	"linked_by" "chuni_link_source",
	"withdrawn_at" timestamp with time zone,
	"withdrawn_reason" text,
	"first_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chuni_constants" (
	"chart_id" integer NOT NULL,
	"version" text NOT NULL,
	"constant" integer NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chuni_constants_chart_id_version_pk" PRIMARY KEY("chart_id","version")
);
--> statement-breakpoint
CREATE TABLE "chuni_sdvx_entries" (
	"script" text PRIMARY KEY NOT NULL,
	"entry_id" text NOT NULL,
	"kind" text NOT NULL,
	"list_title" text,
	"version" text,
	"removed_on" date,
	"removed_in" text,
	"first_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"listed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"read_at" timestamp with time zone,
	"read_error" text,
	"details" jsonb
);
--> statement-breakpoint
CREATE TABLE "chuni_sdvx_overrides" (
	"path" text PRIMARY KEY NOT NULL,
	"song_id" integer,
	"difficulty" "chuni_difficulty",
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chuni_songs" (
	"id" integer PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"reading" text DEFAULT '' NOT NULL,
	"artist" text DEFAULT '' NOT NULL,
	"genre" text DEFAULT '' NOT NULL,
	"image" text DEFAULT '' NOT NULL,
	"bpm" text,
	"version" text,
	"added_on" date,
	"in_game" boolean DEFAULT true NOT NULL,
	"removed_on" date,
	"removed_in" text,
	"first_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chuni_syncs" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "chuni_syncs_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"started_at" timestamp with time zone NOT NULL,
	"finished_at" timestamp with time zone,
	"ok" boolean DEFAULT false NOT NULL,
	"summary" jsonb
);
--> statement-breakpoint
CREATE TABLE "chuni_versions" (
	"slug" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"sort_order" integer NOT NULL,
	"started_on" date,
	"final_constants_at" timestamp with time zone,
	"final_checked_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "chuni_charts" ADD CONSTRAINT "chuni_charts_song_id_chuni_songs_id_fk" FOREIGN KEY ("song_id") REFERENCES "public"."chuni_songs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chuni_constants" ADD CONSTRAINT "chuni_constants_chart_id_chuni_charts_id_fk" FOREIGN KEY ("chart_id") REFERENCES "public"."chuni_charts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chuni_constants" ADD CONSTRAINT "chuni_constants_version_chuni_versions_slug_fk" FOREIGN KEY ("version") REFERENCES "public"."chuni_versions"("slug") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chuni_sdvx_overrides" ADD CONSTRAINT "chuni_sdvx_overrides_song_id_chuni_songs_id_fk" FOREIGN KEY ("song_id") REFERENCES "public"."chuni_songs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "chuni_charts_song_difficulty_idx" ON "chuni_charts" USING btree ("song_id","difficulty");--> statement-breakpoint
CREATE UNIQUE INDEX "chuni_charts_sdvx_path_idx" ON "chuni_charts" USING btree ("sdvx_path");--> statement-breakpoint
CREATE INDEX "chuni_charts_constant_idx" ON "chuni_charts" USING btree ("constant");--> statement-breakpoint
CREATE INDEX "chuni_sdvx_entries_read_idx" ON "chuni_sdvx_entries" USING btree ("read_at");