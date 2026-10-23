CREATE TABLE "cryptic_attempts" (
	"player_id" integer NOT NULL,
	"puzzle_id" integer NOT NULL,
	"tries" integer DEFAULT 0 NOT NULL,
	"first_guess_at" timestamp with time zone NOT NULL,
	"solved_at" timestamp with time zone,
	CONSTRAINT "cryptic_attempts_player_id_puzzle_id_pk" PRIMARY KEY("player_id","puzzle_id")
);
--> statement-breakpoint
CREATE TABLE "cryptic_players" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "cryptic_players_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"app_id" integer NOT NULL,
	"external_id" text NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cryptic_puzzles" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "cryptic_puzzles_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"day" date,
	"clue" text NOT NULL,
	"enumeration" text NOT NULL,
	"answer" text NOT NULL,
	"explanation" text DEFAULT '' NOT NULL,
	"setter" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "cryptic_attempts" ADD CONSTRAINT "cryptic_attempts_player_id_cryptic_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."cryptic_players"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cryptic_attempts" ADD CONSTRAINT "cryptic_attempts_puzzle_id_cryptic_puzzles_id_fk" FOREIGN KEY ("puzzle_id") REFERENCES "public"."cryptic_puzzles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cryptic_players" ADD CONSTRAINT "cryptic_players_app_id_api_apps_id_fk" FOREIGN KEY ("app_id") REFERENCES "public"."api_apps"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "cryptic_attempts_puzzle_idx" ON "cryptic_attempts" USING btree ("puzzle_id");--> statement-breakpoint
CREATE UNIQUE INDEX "cryptic_players_app_external_idx" ON "cryptic_players" USING btree ("app_id","external_id");--> statement-breakpoint
CREATE UNIQUE INDEX "cryptic_puzzles_day_idx" ON "cryptic_puzzles" USING btree ("day");