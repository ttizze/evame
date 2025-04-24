/*
  Warnings:

  - You are about to drop the column `editor_json` on the `page_comments` table. All the data in the column will be lost.
  - You are about to drop the column `editor_json` on the `pages` table. All the data in the column will be lost.
  - You are about to drop the column `editor_json` on the `projects` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "page_comments" DROP COLUMN "editor_json";

-- AlterTable
ALTER TABLE "pages" DROP COLUMN "editor_json";

-- AlterTable
ALTER TABLE "projects" DROP COLUMN "editor_json";
