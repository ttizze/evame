ALTER TABLE "deleted_pages" DROP CONSTRAINT "deleted_pages_pkey";
--> statement-breakpoint
ALTER TABLE "deleted_pages" DROP COLUMN "id";
--> statement-breakpoint
DROP INDEX IF EXISTS "deleted_pages_original_page_id_key";
--> statement-breakpoint
ALTER TABLE "deleted_pages" ADD PRIMARY KEY ("original_page_id");
