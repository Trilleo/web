CREATE TABLE "sb_bazaar" (
	"id" integer PRIMARY KEY NOT NULL,
	"fetched_at" timestamp with time zone NOT NULL,
	"hypixel_at" timestamp with time zone NOT NULL,
	"prices" jsonb NOT NULL,
	"shards" integer NOT NULL,
	"failures" integer DEFAULT 0 NOT NULL,
	"last_error" text,
	"last_error_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "sb_price_history" (
	"shard_id" text NOT NULL,
	"hour" timestamp with time zone NOT NULL,
	"asks" jsonb NOT NULL,
	"bids" jsonb NOT NULL,
	"bought_week" integer NOT NULL,
	"sold_week" integer NOT NULL,
	CONSTRAINT "sb_price_history_shard_id_hour_pk" PRIMARY KEY("shard_id","hour")
);
--> statement-breakpoint
CREATE INDEX "sb_price_history_hour" ON "sb_price_history" USING btree ("hour");