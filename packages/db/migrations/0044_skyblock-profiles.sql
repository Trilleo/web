CREATE TABLE "sb_profiles" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "sb_profiles_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"key_prefix" text NOT NULL,
	"hypixel_profile_id" text,
	"minecraft_uuid" text,
	"game_mode" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"selected_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_synced_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "sb_profiles" ADD CONSTRAINT "sb_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "sb_profiles_prefix_idx" ON "sb_profiles" USING btree ("user_id","key_prefix");--> statement-breakpoint
CREATE UNIQUE INDEX "sb_profiles_hypixel_idx" ON "sb_profiles" USING btree ("user_id","hypixel_profile_id");