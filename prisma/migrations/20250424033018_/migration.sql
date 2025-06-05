-- AlterTable
ALTER TABLE "page_comments" ADD COLUMN     "editor_json" JSONB;

-- AlterTable
ALTER TABLE "pages" ADD COLUMN     "editor_json" JSONB;

-- AlterTable
ALTER TABLE "projects" ADD COLUMN     "editor_json" JSONB;
