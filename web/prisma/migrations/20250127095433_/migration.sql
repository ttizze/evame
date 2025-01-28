-- RenameIndex
ALTER INDEX "source_texts_number_idx" RENAME TO "page_segments_number_idx";

-- RenameIndex
ALTER INDEX "source_texts_page_id_idx" RENAME TO "page_segments_page_id_idx";

-- RenameIndex
ALTER INDEX "source_texts_page_id_number_key" RENAME TO "page_segments_page_id_number_key";

-- RenameIndex
ALTER INDEX "source_texts_page_id_text_and_occurrence_hash_key" RENAME TO "page_segments_page_id_text_and_occurrence_hash_key";

-- RenameIndex
ALTER INDEX "source_texts_text_and_occurrence_hash_idx" RENAME TO "page_segments_text_and_occurrence_hash_idx";
