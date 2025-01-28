/*
  Warnings:

  - You are about to drop the column `sourceLanguage` on the `pages` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "pages" RENAME COLUMN "sourceLanguage" TO "source_locale";
