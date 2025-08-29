-- AlterTable
ALTER TABLE "public"."page_comments" ALTER COLUMN "path" SET DEFAULT ARRAY[]::INTEGER[];

-- CreateIndex
CREATE INDEX "page_comments_parent_id_is_deleted_created_at_idx" ON "public"."page_comments"("parent_id", "is_deleted", "created_at");
