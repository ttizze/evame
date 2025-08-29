/*
  Warnings:

  - You are about to drop the column `depth` on the `page_comments` table. All the data in the column will be lost.
  - You are about to drop the column `path` on the `page_comments` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "public"."page_comments_page_id_depth_created_at_idx";

-- DropIndex
DROP INDEX "public"."page_comments_path_idx";

-- AlterTable
ALTER TABLE "public"."page_comments" DROP COLUMN "depth",
DROP COLUMN "path";
