CREATE TABLE "skygrid_saves" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"state" jsonb NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"skill_xp" bigint DEFAULT 0 NOT NULL,
	"coins" bigint DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "skygrid_saves" ADD CONSTRAINT "skygrid_saves_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "skygrid_saves_skill_xp_idx" ON "skygrid_saves" USING btree ("skill_xp");