/*
  Warnings:

  - You are about to drop the column `target_language` on the `user_ai_translation_info` table. All the data in the column will be lost.
  - Added the required column `locale` to the `user_ai_translation_info` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
ALTER INDEX "user_ai_translation_info_page_id_target_language_idx" 
  RENAME TO "user_ai_translation_info_page_id_locale_idx";

ALTER TABLE "user_ai_translation_info" 
  RENAME COLUMN "target_language" TO "locale";