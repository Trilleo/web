CREATE TABLE "skygrid_orders" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "skygrid_orders_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"user_id" uuid NOT NULL,
	"item" text NOT NULL,
	"side" text NOT NULL,
	"price" integer NOT NULL,
	"quantity" integer NOT NULL,
	"filled" integer DEFAULT 0 NOT NULL,
	"claimed" integer DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "skygrid_trades" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "skygrid_trades_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"item" text NOT NULL,
	"price" integer NOT NULL,
	"quantity" integer NOT NULL,
	"at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "skygrid_orders" ADD CONSTRAINT "skygrid_orders_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "skygrid_orders_book_idx" ON "skygrid_orders" USING btree ("item","side","status","price");--> statement-breakpoint
CREATE INDEX "skygrid_orders_user_idx" ON "skygrid_orders" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX "skygrid_trades_item_idx" ON "skygrid_trades" USING btree ("item","at");