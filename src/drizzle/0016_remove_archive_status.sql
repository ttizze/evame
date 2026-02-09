INSERT INTO "deleted_pages" (
	"original_page_id",
	"slug",
	"created_at",
	"source_locale",
	"updated_at",
	"status",
	"user_id",
	"mdast_json",
	"order",
	"parent_id"
)
SELECT
	"pages"."id",
	"pages"."slug",
	"pages"."created_at",
	"pages"."source_locale",
	"pages"."updated_at",
	"pages"."status"::text,
	"pages"."user_id",
	"pages"."mdast_json",
	"pages"."order",
	"pages"."parent_id"
FROM "pages"
WHERE "pages"."status" = 'ARCHIVE'
ON CONFLICT ("original_page_id") DO NOTHING;
--> statement-breakpoint
DELETE FROM "pages" WHERE "status" = 'ARCHIVE';
--> statement-breakpoint
CREATE TYPE "page_status_new" AS ENUM('DRAFT', 'PUBLIC');
--> statement-breakpoint
ALTER TABLE "pages" ALTER COLUMN "status" DROP DEFAULT;
--> statement-breakpoint
ALTER TABLE "pages"
ALTER COLUMN "status" TYPE "page_status_new"
USING ("status"::text::"page_status_new");
--> statement-breakpoint
ALTER TABLE "pages" ALTER COLUMN "status" SET DEFAULT 'DRAFT';
--> statement-breakpoint
DROP TYPE "page_status";
--> statement-breakpoint
ALTER TYPE "page_status_new" RENAME TO "page_status";
