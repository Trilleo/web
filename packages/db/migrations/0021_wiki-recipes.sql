CREATE TABLE "wiki_recipes" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "wiki_recipes_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"wiki_id" integer NOT NULL,
	"page_id" integer NOT NULL,
	"position" integer NOT NULL,
	"output_key" text NOT NULL,
	"input_keys" text[] NOT NULL,
	"data" jsonb NOT NULL
);
--> statement-breakpoint
ALTER TABLE "wiki_recipes" ADD CONSTRAINT "wiki_recipes_wiki_id_wikis_id_fk" FOREIGN KEY ("wiki_id") REFERENCES "public"."wikis"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wiki_recipes" ADD CONSTRAINT "wiki_recipes_page_id_wiki_pages_id_fk" FOREIGN KEY ("page_id") REFERENCES "public"."wiki_pages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "wiki_recipes_output_idx" ON "wiki_recipes" USING btree ("wiki_id","output_key");--> statement-breakpoint
CREATE INDEX "wiki_recipes_inputs_idx" ON "wiki_recipes" USING gin ("input_keys");--> statement-breakpoint
CREATE INDEX "wiki_recipes_page_idx" ON "wiki_recipes" USING btree ("page_id");