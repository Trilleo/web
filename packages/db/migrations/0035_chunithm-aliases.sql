CREATE TYPE "public"."chuni_suggestion_status" AS ENUM('pending', 'approved', 'declined');--> statement-breakpoint
CREATE TABLE "chuni_alias_suggestions" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "chuni_alias_suggestions_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"song_id" integer NOT NULL,
	"user_id" uuid NOT NULL,
	"alias" text NOT NULL,
	"key" text NOT NULL,
	"status" "chuni_suggestion_status" DEFAULT 'pending' NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"decided_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "chuni_aliases" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "chuni_aliases_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"song_id" integer NOT NULL,
	"alias" text NOT NULL,
	"key" text NOT NULL,
	"source" text NOT NULL,
	"suggested_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "chuni_alias_suggestions" ADD CONSTRAINT "chuni_alias_suggestions_song_id_chuni_songs_id_fk" FOREIGN KEY ("song_id") REFERENCES "public"."chuni_songs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chuni_alias_suggestions" ADD CONSTRAINT "chuni_alias_suggestions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chuni_aliases" ADD CONSTRAINT "chuni_aliases_song_id_chuni_songs_id_fk" FOREIGN KEY ("song_id") REFERENCES "public"."chuni_songs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chuni_aliases" ADD CONSTRAINT "chuni_aliases_suggested_by_users_id_fk" FOREIGN KEY ("suggested_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "chuni_alias_suggestions_status_idx" ON "chuni_alias_suggestions" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "chuni_alias_suggestions_user_idx" ON "chuni_alias_suggestions" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "chuni_aliases_song_key_idx" ON "chuni_aliases" USING btree ("song_id","key");