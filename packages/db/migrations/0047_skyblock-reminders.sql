CREATE TABLE "sb_reminder_sends" (
	"reminder_id" integer NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"user_id" uuid NOT NULL,
	"status" text NOT NULL,
	"at" timestamp with time zone NOT NULL,
	CONSTRAINT "sb_reminder_sends_reminder_id_starts_at_pk" PRIMARY KEY("reminder_id","starts_at")
);
--> statement-breakpoint
CREATE TABLE "sb_reminder_settings" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"time_zone" text DEFAULT 'UTC' NOT NULL,
	"daily_cap" integer NOT NULL,
	"quiet_start" integer,
	"quiet_end" integer,
	"paused_at" timestamp with time zone,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sb_reminders" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "sb_reminders_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"user_id" uuid NOT NULL,
	"event_slug" text NOT NULL,
	"lead_minutes" integer NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"last_sent_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "sb_reminder_sends" ADD CONSTRAINT "sb_reminder_sends_reminder_id_sb_reminders_id_fk" FOREIGN KEY ("reminder_id") REFERENCES "public"."sb_reminders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sb_reminder_sends" ADD CONSTRAINT "sb_reminder_sends_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sb_reminder_settings" ADD CONSTRAINT "sb_reminder_settings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sb_reminders" ADD CONSTRAINT "sb_reminders_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "sb_reminder_sends_user_at" ON "sb_reminder_sends" USING btree ("user_id","at");--> statement-breakpoint
CREATE UNIQUE INDEX "sb_reminders_user_event_lead" ON "sb_reminders" USING btree ("user_id","event_slug","lead_minutes");--> statement-breakpoint
CREATE INDEX "sb_reminders_event" ON "sb_reminders" USING btree ("event_slug");