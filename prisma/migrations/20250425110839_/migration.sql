/*
  Warnings:

  - You are about to drop the column `content` on the `page_comments` table. All the data in the column will be lost.
  - You are about to drop the column `content` on the `pages` table. All the data in the column will be lost.
  - You are about to drop the column `description` on the `projects` table. All the data in the column will be lost.
  - Made the column `mdast_json` on table `page_comments` required. This step will fail if there are existing NULL values in that column.
  - Made the column `mdast_json` on table `pages` required. This step will fail if there are existing NULL values in that column.
  - Made the column `mdast_json` on table `projects` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "page_comments" DROP COLUMN "content",
ALTER COLUMN "mdast_json" SET NOT NULL;

-- AlterTable
ALTER TABLE "pages" DROP COLUMN "content",
ALTER COLUMN "mdast_json" SET NOT NULL;

-- AlterTable
ALTER TABLE "projects" DROP COLUMN "description",
ALTER COLUMN "mdast_json" SET NOT NULL;
