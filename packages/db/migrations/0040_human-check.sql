CREATE TABLE "captcha_settings" (
	"id" integer PRIMARY KEY NOT NULL,
	"mode" text NOT NULL,
	"until" timestamp with time zone,
	"set_by" text NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "captcha_stats" (
	"day" date NOT NULL,
	"route" text NOT NULL,
	"challenged" integer DEFAULT 0 NOT NULL,
	"passed" integer DEFAULT 0 NOT NULL,
	"failed" integer DEFAULT 0 NOT NULL,
	"puzzles" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "captcha_stats_day_route_pk" PRIMARY KEY("day","route")
);
