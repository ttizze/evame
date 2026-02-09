CREATE TABLE "deleted_pages" (
	"id" serial PRIMARY KEY NOT NULL,
	"original_page_id" integer NOT NULL,
	"slug" text NOT NULL,
	"created_at" timestamp (3) NOT NULL,
	"source_locale" text NOT NULL,
	"updated_at" timestamp (3) NOT NULL,
	"status" text NOT NULL,
	"user_id" text NOT NULL,
	"mdast_json" jsonb NOT NULL,
	"order" integer NOT NULL,
	"parent_id" integer,
	"deleted_at" timestamp (3) DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "deleted_pages_original_page_id_key" ON "deleted_pages" USING btree ("original_page_id");--> statement-breakpoint
CREATE INDEX "deleted_pages_user_id_deleted_at_idx" ON "deleted_pages" USING btree ("user_id","deleted_at");
