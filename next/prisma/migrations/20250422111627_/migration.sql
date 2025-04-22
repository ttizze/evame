-- AlterTable
ALTER TABLE "page_comments" ADD COLUMN     "contentJson" JSONB NOT NULL DEFAULT '{}';

-- AlterTable
ALTER TABLE "projects" ADD COLUMN     "descriptionJson" JSONB NOT NULL DEFAULT '{}';
