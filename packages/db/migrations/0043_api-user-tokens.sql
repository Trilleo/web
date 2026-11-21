CREATE TABLE "api_device_codes" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "api_device_codes_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"device_hash" text NOT NULL,
	"user_code" text NOT NULL,
	"client_name" text NOT NULL,
	"scopes" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"last_polled_at" timestamp with time zone,
	"user_id" uuid,
	"approved_at" timestamp with time zone,
	"denied_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "api_user_tokens" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "api_user_tokens_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"prefix" text NOT NULL,
	"last4" text NOT NULL,
	"hash" text NOT NULL,
	"scopes" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"via" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone,
	"last_used_at" timestamp with time zone,
	"revoked_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "api_device_codes" ADD CONSTRAINT "api_device_codes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_user_tokens" ADD CONSTRAINT "api_user_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "api_device_codes_device_idx" ON "api_device_codes" USING btree ("device_hash");--> statement-breakpoint
CREATE UNIQUE INDEX "api_device_codes_user_code_idx" ON "api_device_codes" USING btree ("user_code");--> statement-breakpoint
CREATE UNIQUE INDEX "api_user_tokens_hash_idx" ON "api_user_tokens" USING btree ("hash");--> statement-breakpoint
CREATE INDEX "api_user_tokens_user_idx" ON "api_user_tokens" USING btree ("user_id");