CREATE TABLE "sb_election_votes" (
	"year" integer NOT NULL,
	"hour" timestamp with time zone NOT NULL,
	"votes" jsonb NOT NULL,
	CONSTRAINT "sb_election_votes_year_hour_pk" PRIMARY KEY("year","hour")
);
--> statement-breakpoint
CREATE TABLE "sb_elections" (
	"year" integer PRIMARY KEY NOT NULL,
	"candidates" jsonb NOT NULL,
	"mayor_key" text,
	"minister_key" text,
	"closed" boolean DEFAULT false NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sb_feeds" (
	"feed" text PRIMARY KEY NOT NULL,
	"fetched_at" timestamp with time zone,
	"data" jsonb,
	"failures" integer DEFAULT 0 NOT NULL,
	"last_error" text,
	"last_error_at" timestamp with time zone
);
