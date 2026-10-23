CREATE TABLE "api_webhook_deliveries" (
	"id" text PRIMARY KEY NOT NULL,
	"webhook_id" integer NOT NULL,
	"event_id" text NOT NULL,
	"event" text NOT NULL,
	"payload" jsonb NOT NULL,
	"status" text DEFAULT 'queued' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"next_attempt_at" timestamp with time zone,
	"last_attempt_at" timestamp with time zone,
	"response_status" integer,
	"error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"delivered_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "api_webhooks" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "api_webhooks_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"app_id" integer NOT NULL,
	"url" text NOT NULL,
	"secret" text NOT NULL,
	"events" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"failures" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"disabled_at" timestamp with time zone,
	"disabled_reason" text
);
--> statement-breakpoint
ALTER TABLE "api_webhook_deliveries" ADD CONSTRAINT "api_webhook_deliveries_webhook_id_api_webhooks_id_fk" FOREIGN KEY ("webhook_id") REFERENCES "public"."api_webhooks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_webhooks" ADD CONSTRAINT "api_webhooks_app_id_api_apps_id_fk" FOREIGN KEY ("app_id") REFERENCES "public"."api_apps"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "api_webhook_deliveries_event_idx" ON "api_webhook_deliveries" USING btree ("webhook_id","event_id");--> statement-breakpoint
CREATE INDEX "api_webhook_deliveries_due_idx" ON "api_webhook_deliveries" USING btree ("status","next_attempt_at");--> statement-breakpoint
CREATE INDEX "api_webhooks_app_idx" ON "api_webhooks" USING btree ("app_id");