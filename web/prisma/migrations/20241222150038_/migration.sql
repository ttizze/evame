/*
  Warnings:

  - You are about to drop the column `targetLanguage` on the `translate_texts` table. All the data in the column will be lost.
  - You are about to drop the `page_translation_info` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `locale` to the `translate_texts` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "page_translation_info" DROP CONSTRAINT "page_translation_info_page_id_fkey";

-- DropTable
DROP TABLE "page_translation_info";

-- CreateIndex
ALTER INDEX "translate_texts_targetLanguage_idx" 
  RENAME TO "translate_texts_locale_idx";

ALTER TABLE "translate_texts" 
  RENAME COLUMN "targetLanguage" TO "locale";