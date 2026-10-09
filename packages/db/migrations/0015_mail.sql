CREATE TYPE "public"."mail_status" AS ENUM('queued', 'sending', 'sent', 'failed', 'captured', 'cancelled');--> statement-breakpoint
CREATE TABLE "admin_alerts" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "admin_alerts_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"kind" text NOT NULL,
	"summary" text NOT NULL,
	"path" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"mailed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "email_codes" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "email_codes_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"user_id" uuid,
	"email" text NOT NULL,
	"purpose" text NOT NULL,
	"code_hash" text NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "mail_messages" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "mail_messages_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"user_id" uuid,
	"kind" text NOT NULL,
	"to_address" text NOT NULL,
	"reply_to" text,
	"subject" text NOT NULL,
	"text_body" text,
	"html_body" text,
	"headers" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"ref" text,
	"status" "mail_status" DEFAULT 'queued' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"next_attempt_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_error" text,
	"provider_message_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"sent_at" timestamp with time zone,
	"body_purged_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "contact_messages" ADD COLUMN "replied_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "email" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "email_verified_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "email_notifications" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "email_token" text;--> statement-breakpoint
ALTER TABLE "email_codes" ADD CONSTRAINT "email_codes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mail_messages" ADD CONSTRAINT "mail_messages_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "admin_alerts_mailed_idx" ON "admin_alerts" USING btree ("mailed_at","created_at");--> statement-breakpoint
CREATE INDEX "email_codes_user_idx" ON "email_codes" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "email_codes_email_idx" ON "email_codes" USING btree ("email","created_at");--> statement-breakpoint
CREATE INDEX "mail_messages_due_idx" ON "mail_messages" USING btree ("status","next_attempt_at");--> statement-breakpoint
CREATE INDEX "mail_messages_user_idx" ON "mail_messages" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "mail_messages_created_idx" ON "mail_messages" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "mail_messages_ref_idx" ON "mail_messages" USING btree ("ref");--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_email_unique" UNIQUE("email");--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_email_token_unique" UNIQUE("email_token");