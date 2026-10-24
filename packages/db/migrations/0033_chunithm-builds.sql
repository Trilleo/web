CREATE TYPE "public"."chuni_build_status" AS ENUM('queued', 'building', 'ready', 'failed');--> statement-breakpoint
CREATE TABLE "chuni_builds" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "chuni_builds_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"chart_id" integer NOT NULL,
	"variant" text NOT NULL,
	"status" "chuni_build_status" DEFAULT 'queued' NOT NULL,
	"version" integer DEFAULT 0 NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"error" text,
	"next_attempt_at" timestamp with time zone,
	"source" jsonb,
	"manifest" jsonb,
	"bytes" integer,
	"hidden" boolean DEFAULT false NOT NULL,
	"requested_at" timestamp with time zone DEFAULT now() NOT NULL,
	"started_at" timestamp with time zone,
	"built_at" timestamp with time zone,
	"checked_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "chuni_builds" ADD CONSTRAINT "chuni_builds_chart_id_chuni_charts_id_fk" FOREIGN KEY ("chart_id") REFERENCES "public"."chuni_charts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "chuni_builds_chart_variant_idx" ON "chuni_builds" USING btree ("chart_id","variant");--> statement-breakpoint
CREATE INDEX "chuni_builds_status_idx" ON "chuni_builds" USING btree ("status","requested_at");