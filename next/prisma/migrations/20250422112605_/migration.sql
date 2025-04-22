/*
  Warnings:

  - You are about to drop the column `locale` on the `page_comments` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "page_comments" RENAME COLUMN "locale" TO "source_locale";
