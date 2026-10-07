CREATE TYPE "public"."mc_channel" AS ENUM('release', 'beta', 'alpha');--> statement-breakpoint
CREATE TYPE "public"."mc_dependency_kind" AS ENUM('required', 'optional', 'incompatible', 'embedded');--> statement-breakpoint
CREATE TYPE "public"."mc_edition" AS ENUM('java', 'bedrock', 'both');--> statement-breakpoint
CREATE TYPE "public"."mc_project_state" AS ENUM('draft', 'public', 'unlisted', 'archived');--> statement-breakpoint
CREATE TYPE "public"."mc_project_type" AS ENUM('mod', 'plugin', 'world', 'build', 'resource_pack', 'data_pack');--> statement-breakpoint
CREATE TABLE "mc_dependencies" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "mc_dependencies_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"release_id" integer NOT NULL,
	"project_id" integer,
	"name" text NOT NULL,
	"url" text,
	"kind" "mc_dependency_kind" DEFAULT 'required' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mc_gallery" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "mc_gallery_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"project_id" integer NOT NULL,
	"file_id" text NOT NULL,
	"caption" text DEFAULT '' NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "mc_gallery_file_id_unique" UNIQUE("file_id")
);
--> statement-breakpoint
CREATE TABLE "mc_project_reports" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "mc_project_reports_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"project_id" integer NOT NULL,
	"reporter_id" uuid,
	"reason" text NOT NULL,
	"details" text DEFAULT '' NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"resolved_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "mc_project_slugs" (
	"slug" text PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mc_projects" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "mc_projects_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"slug" text NOT NULL,
	"owner_id" uuid NOT NULL,
	"type" "mc_project_type" NOT NULL,
	"edition" "mc_edition" DEFAULT 'java' NOT NULL,
	"name" text NOT NULL,
	"summary" text DEFAULT '' NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"description_html" text DEFAULT '' NOT NULL,
	"render_version" integer DEFAULT 0 NOT NULL,
	"tags" text[] DEFAULT '{}'::text[] NOT NULL,
	"license" text NOT NULL,
	"license_text" text,
	"links" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"cover_file_id" text,
	"state" "mc_project_state" DEFAULT 'draft' NOT NULL,
	"hidden_at" timestamp with time zone,
	"hidden_reason" text,
	"featured_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"first_released_at" timestamp with time zone,
	"last_released_at" timestamp with time zone,
	CONSTRAINT "mc_projects_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "mc_release_files" (
	"release_id" integer NOT NULL,
	"file_id" text NOT NULL,
	"primary" boolean DEFAULT false NOT NULL,
	CONSTRAINT "mc_release_files_release_id_file_id_pk" PRIMARY KEY("release_id","file_id"),
	CONSTRAINT "mc_release_files_file_id_unique" UNIQUE("file_id")
);
--> statement-breakpoint
CREATE TABLE "mc_releases" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "mc_releases_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"project_id" integer NOT NULL,
	"version" text NOT NULL,
	"title" text DEFAULT '' NOT NULL,
	"channel" "mc_channel" DEFAULT 'release' NOT NULL,
	"changelog" text DEFAULT '' NOT NULL,
	"changelog_html" text DEFAULT '' NOT NULL,
	"render_version" integer DEFAULT 0 NOT NULL,
	"game_versions" text[] DEFAULT '{}'::text[] NOT NULL,
	"loaders" text[] DEFAULT '{}'::text[] NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"released_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "mc_dependencies" ADD CONSTRAINT "mc_dependencies_release_id_mc_releases_id_fk" FOREIGN KEY ("release_id") REFERENCES "public"."mc_releases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mc_dependencies" ADD CONSTRAINT "mc_dependencies_project_id_mc_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."mc_projects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mc_gallery" ADD CONSTRAINT "mc_gallery_project_id_mc_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."mc_projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mc_gallery" ADD CONSTRAINT "mc_gallery_file_id_files_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."files"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mc_project_reports" ADD CONSTRAINT "mc_project_reports_project_id_mc_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."mc_projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mc_project_reports" ADD CONSTRAINT "mc_project_reports_reporter_id_users_id_fk" FOREIGN KEY ("reporter_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mc_project_slugs" ADD CONSTRAINT "mc_project_slugs_project_id_mc_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."mc_projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mc_projects" ADD CONSTRAINT "mc_projects_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mc_projects" ADD CONSTRAINT "mc_projects_cover_file_id_files_id_fk" FOREIGN KEY ("cover_file_id") REFERENCES "public"."files"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mc_release_files" ADD CONSTRAINT "mc_release_files_release_id_mc_releases_id_fk" FOREIGN KEY ("release_id") REFERENCES "public"."mc_releases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mc_release_files" ADD CONSTRAINT "mc_release_files_file_id_files_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."files"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mc_releases" ADD CONSTRAINT "mc_releases_project_id_mc_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."mc_projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "mc_dependencies_release_idx" ON "mc_dependencies" USING btree ("release_id");--> statement-breakpoint
CREATE INDEX "mc_gallery_project_idx" ON "mc_gallery" USING btree ("project_id","position");--> statement-breakpoint
CREATE INDEX "mc_project_reports_project_idx" ON "mc_project_reports" USING btree ("project_id","status");--> statement-breakpoint
CREATE INDEX "mc_project_reports_reporter_idx" ON "mc_project_reports" USING btree ("reporter_id","created_at");--> statement-breakpoint
CREATE INDEX "mc_project_slugs_project_idx" ON "mc_project_slugs" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "mc_projects_owner_idx" ON "mc_projects" USING btree ("owner_id","created_at");--> statement-breakpoint
CREATE INDEX "mc_projects_listing_idx" ON "mc_projects" USING btree ("type","state","last_released_at");--> statement-breakpoint
CREATE UNIQUE INDEX "mc_releases_version_idx" ON "mc_releases" USING btree ("project_id","version");--> statement-breakpoint
CREATE INDEX "mc_releases_project_idx" ON "mc_releases" USING btree ("project_id","created_at");