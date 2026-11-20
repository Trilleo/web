CREATE TABLE "sb_datasets" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "sb_datasets_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"commit" text NOT NULL,
	"files" jsonb NOT NULL,
	"hash" text NOT NULL,
	"shards" integer NOT NULL,
	"pairs" integer NOT NULL,
	"data" jsonb NOT NULL,
	"read_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sb_icons" (
	"shard_id" text PRIMARY KEY NOT NULL,
	"key" text,
	"source_sha" text NOT NULL,
	"error" text,
	"checked_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sb_syncs" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "sb_syncs_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"started_at" timestamp with time zone NOT NULL,
	"finished_at" timestamp with time zone,
	"ok" boolean DEFAULT false NOT NULL,
	"summary" jsonb
);
