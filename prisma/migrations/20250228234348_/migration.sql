-- CreateIndex
CREATE INDEX "page_segment_translations_locale_is_archived_idx" ON "page_segment_translations"("locale", "is_archived");

-- CreateIndex
CREATE INDEX "page_segment_translations_page_segment_id_locale_is_archive_idx" ON "page_segment_translations"("page_segment_id", "locale", "is_archived");

-- CreateIndex
CREATE INDEX "page_segment_translations_point_created_at_idx" ON "page_segment_translations"("point", "created_at");
