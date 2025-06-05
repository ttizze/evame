-- AlterTable
ALTER TABLE "page_comments" ADD COLUMN     "mdast_json" JSONB;

-- AlterTable
ALTER TABLE "pages" ADD COLUMN     "mdast_json" JSONB;

-- AlterTable
ALTER TABLE "projects" ADD COLUMN     "mdast_json" JSONB;
