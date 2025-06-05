/*
  Warnings:

  - You are about to drop the column `sourcelocale` on the `project_comments` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "project_comments" DROP COLUMN "sourcelocale",
ADD COLUMN     "source_locale" TEXT NOT NULL DEFAULT 'unknown';
