/*
  Warnings:

  - You are about to drop the column `ai_translation_progress` on the `page_ai_translation_info` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "page_ai_translation_info" DROP COLUMN "ai_translation_progress";
