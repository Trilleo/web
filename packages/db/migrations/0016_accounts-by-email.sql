-- Accounts by email. Existing accounts keep working: each GitHub account becomes a
-- linked identity, and the GitHub login becomes the site's username (lower-cased;
-- two accounts with the same login after a rename get a suffix). They're asked for
-- an email address the next time they sign in.
CREATE TABLE "user_identities" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "user_identities_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"user_id" uuid NOT NULL,
	"provider" text NOT NULL,
	"provider_user_id" text NOT NULL,
	"login" text,
	"linked_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_used_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "username_history" (
	"username" text PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"released_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "github_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "github_login" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "username" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "username_changed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "user_identities" ADD CONSTRAINT "user_identities_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "username_history" ADD CONSTRAINT "username_history_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "user_identities_provider_idx" ON "user_identities" USING btree ("provider","provider_user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "user_identities_user_provider_idx" ON "user_identities" USING btree ("user_id","provider");--> statement-breakpoint
CREATE INDEX "username_history_user_idx" ON "username_history" USING btree ("user_id");--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_username_unique" UNIQUE("username");--> statement-breakpoint
UPDATE "users" AS u SET "username" = CASE WHEN r.n = 1 THEN r.base
  ELSE r.base || '-' || substr(replace(u.id::text, '-', ''), 1, 6) END
FROM (
  SELECT "id", lower("github_login") AS base,
    row_number() OVER (PARTITION BY lower("github_login") ORDER BY "last_sign_in_at" DESC) AS n
  FROM "users"
) AS r
WHERE u.id = r.id;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "username" SET NOT NULL;--> statement-breakpoint
INSERT INTO "user_identities" ("user_id", "provider", "provider_user_id", "login", "linked_at", "last_used_at")
SELECT "id", 'github', "github_id"::text, "github_login", "created_at", "last_sign_in_at"
FROM "users" WHERE "github_id" IS NOT NULL;--> statement-breakpoint
-- The previous release inserts users without a username; until it's gone, fill one
-- in from its login. Drop this with the github_login column.
CREATE FUNCTION "users_fill_username"() RETURNS trigger LANGUAGE plpgsql AS $fill$
BEGIN
  IF NEW."username" IS NULL THEN
    NEW."username" := lower(NEW."github_login");
  END IF;
  RETURN NEW;
END
$fill$;--> statement-breakpoint
CREATE TRIGGER "users_fill_username" BEFORE INSERT ON "users"
FOR EACH ROW EXECUTE FUNCTION "users_fill_username"();
