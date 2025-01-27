-- AlterTable
ALTER TABLE "page_segment_translations" RENAME CONSTRAINT "translate_texts_pkey" TO "page_segment_translations_pkey";

-- RenameIndex
ALTER INDEX "translate_texts_locale_idx" RENAME TO "page_segment_translations_locale_idx";

-- RenameIndex
ALTER INDEX "translate_texts_page_segment_id_idx" RENAME TO "page_segment_translations_page_segment_id_idx";

-- RenameIndex
ALTER INDEX "translate_texts_user_id_idx" RENAME TO "page_segment_translations_user_id_idx";
