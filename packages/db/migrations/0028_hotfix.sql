CREATE TABLE "hotfix_bests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"board" text NOT NULL,
	"score" integer NOT NULL,
	"metres" integer NOT NULL,
	"tokens" integer NOT NULL,
	"frames" integer NOT NULL,
	"seed" bigint NOT NULL,
	"rules" integer NOT NULL,
	"inputs" jsonb NOT NULL,
	"achieved_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hotfix_players" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"runs" integer DEFAULT 0 NOT NULL,
	"tokens" bigint DEFAULT 0 NOT NULL,
	"furthest" integer DEFAULT 0 NOT NULL,
	"achievements" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"accessory" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hotfix_tickets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"mode" text NOT NULL,
	"day" date,
	"seed" bigint NOT NULL,
	"issued_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "hotfix_bests" ADD CONSTRAINT "hotfix_bests_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hotfix_players" ADD CONSTRAINT "hotfix_players_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hotfix_tickets" ADD CONSTRAINT "hotfix_tickets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "hotfix_bests_user_board_idx" ON "hotfix_bests" USING btree ("user_id","board");--> statement-breakpoint
CREATE INDEX "hotfix_bests_board_idx" ON "hotfix_bests" USING btree ("board","score");--> statement-breakpoint
CREATE INDEX "hotfix_tickets_user_idx" ON "hotfix_tickets" USING btree ("user_id","issued_at");