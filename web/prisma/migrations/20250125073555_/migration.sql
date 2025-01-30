/*
  Warnings:

  - Added the required column `sourceLanguage` to the `page_comments` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "page_comments" ADD COLUMN     "sourceLanguage" TEXT NOT NULL;
