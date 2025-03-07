-- AlterTable
ALTER TABLE "page_comments" ADD COLUMN     "parent_id" INTEGER;

-- AddForeignKey
ALTER TABLE "page_comments" ADD CONSTRAINT "page_comments_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "page_comments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
