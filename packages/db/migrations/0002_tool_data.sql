CREATE TABLE "tool_data" (
	"user_id" uuid NOT NULL,
	"tool" text NOT NULL,
	"key" text NOT NULL,
	"value" jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tool_data_user_id_tool_key_pk" PRIMARY KEY("user_id","tool","key")
);
--> statement-breakpoint
ALTER TABLE "tool_data" ADD CONSTRAINT "tool_data_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;