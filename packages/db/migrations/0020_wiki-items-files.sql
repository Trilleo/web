CREATE TABLE "wiki_files" (
	"wiki_id" integer NOT NULL,
	"file_id" text NOT NULL,
	"added_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "wiki_files_wiki_id_file_id_pk" PRIMARY KEY("wiki_id","file_id")
);
--> statement-breakpoint
CREATE TABLE "wiki_items" (
	"wiki_id" integer NOT NULL,
	"key" text NOT NULL,
	"page_id" integer NOT NULL,
	"data" jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "wiki_items_wiki_id_key_pk" PRIMARY KEY("wiki_id","key"),
	CONSTRAINT "wiki_items_page_id_unique" UNIQUE("page_id")
);
--> statement-breakpoint
ALTER TABLE "wiki_files" ADD CONSTRAINT "wiki_files_wiki_id_wikis_id_fk" FOREIGN KEY ("wiki_id") REFERENCES "public"."wikis"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wiki_files" ADD CONSTRAINT "wiki_files_file_id_files_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."files"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wiki_files" ADD CONSTRAINT "wiki_files_added_by_users_id_fk" FOREIGN KEY ("added_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wiki_items" ADD CONSTRAINT "wiki_items_wiki_id_wikis_id_fk" FOREIGN KEY ("wiki_id") REFERENCES "public"."wikis"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wiki_items" ADD CONSTRAINT "wiki_items_page_id_wiki_pages_id_fk" FOREIGN KEY ("page_id") REFERENCES "public"."wiki_pages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "wiki_files_file_idx" ON "wiki_files" USING btree ("file_id");