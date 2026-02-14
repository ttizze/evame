UPDATE "pages"
SET "published_at" = "created_at"
WHERE "status" = 'PUBLIC'
	AND "published_at" IS NULL;

