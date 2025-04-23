/*
  Warnings:

  - You are about to drop the column `contentJson` on the `page_comments` table. All the data in the column will be lost.
  - You are about to drop the column `source_locale` on the `page_comments` table. All the data in the column will be lost.
  - You are about to drop the column `contentJson` on the `pages` table. All the data in the column will be lost.
  - You are about to drop the column `descriptionJson` on the `projects` table. All the data in the column will be lost.
  - Added the required column `locale` to the `page_comments` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "page_comments" DROP COLUMN "contentJson";
ALTER TABLE "page_comments" RENAME COLUMN "source_locale" TO "locale";

-- AlterTable
ALTER TABLE "pages" DROP COLUMN "contentJson";

-- AlterTable
ALTER TABLE "projects" DROP COLUMN "descriptionJson";
