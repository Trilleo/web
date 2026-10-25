CREATE TABLE "chuni_layers" (
	"url" text PRIMARY KEY NOT NULL,
	"chart_id" integer,
	"key" text NOT NULL,
	"tag" text NOT NULL,
	"bytes" integer NOT NULL,
	"saved_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "chuni_layers" ADD CONSTRAINT "chuni_layers_chart_id_chuni_charts_id_fk" FOREIGN KEY ("chart_id") REFERENCES "public"."chuni_charts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "chuni_layers_chart_idx" ON "chuni_layers" USING btree ("chart_id");--> statement-breakpoint
CREATE INDEX "chuni_layers_saved_idx" ON "chuni_layers" USING btree ("saved_at");