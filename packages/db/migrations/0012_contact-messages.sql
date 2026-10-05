CREATE TABLE "contact_messages" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "contact_messages_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"user_id" uuid,
	"topic" text NOT NULL,
	"name" text NOT NULL,
	"email" text,
	"body" text NOT NULL,
	"status" text DEFAULT 'new' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "contact_messages" ADD CONSTRAINT "contact_messages_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "contact_messages_status_idx" ON "contact_messages" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "contact_messages_user_idx" ON "contact_messages" USING btree ("user_id","created_at");