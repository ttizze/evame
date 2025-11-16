-- AlterTable
ALTER TABLE "ImportFile" RENAME CONSTRAINT "ImportFile_pkey" TO "import_files_pkey";

-- AlterTable
ALTER TABLE "ImportRun" RENAME CONSTRAINT "ImportRun_pkey" TO "import_runs_pkey";

-- AlterTable
ALTER TABLE "PageBreak" RENAME CONSTRAINT "PageBreak_pkey" TO "page_breaks_pkey";

-- AlterTable
ALTER TABLE "PageView" RENAME CONSTRAINT "PageView_pkey" TO "page_views_pkey";

-- AlterTable
ALTER TABLE "SegmentLink" RENAME CONSTRAINT "SegmentLink_pkey" TO "segment_links_pkey";

-- AlterTable
ALTER TABLE "TranslationJob" RENAME CONSTRAINT "TranslationJob_pkey" TO "translation_jobs_pkey";

-- RenameForeignKey
ALTER TABLE "ImportFile" RENAME CONSTRAINT "ImportFile_import_run_id_fkey" TO "import_files_import_run_id_fkey";

-- RenameForeignKey
ALTER TABLE "PageBreak" RENAME CONSTRAINT "PageBreak_segment_id_fkey" TO "page_breaks_segment_id_fkey";

-- RenameForeignKey
ALTER TABLE "PageView" RENAME CONSTRAINT "PageView_pageId_fkey" TO "page_views_pageId_fkey";

-- RenameForeignKey
ALTER TABLE "SegmentLink" RENAME CONSTRAINT "SegmentLink_from_segment_id_fkey" TO "segment_links_from_segment_id_fkey";

-- RenameForeignKey
ALTER TABLE "SegmentLink" RENAME CONSTRAINT "SegmentLink_to_segment_id_fkey" TO "segment_links_to_segment_id_fkey";

-- RenameForeignKey
ALTER TABLE "TranslationJob" RENAME CONSTRAINT "TranslationJob_pageId_fkey" TO "translation_jobs_pageId_fkey";

-- RenameForeignKey
ALTER TABLE "TranslationJob" RENAME CONSTRAINT "TranslationJob_userId_fkey" TO "translation_jobs_userId_fkey";

-- RenameIndex
ALTER INDEX "PageBreak_edition_page_code_idx" RENAME TO "page_breaks_edition_page_code_idx";

-- RenameIndex
ALTER INDEX "PageBreak_segment_id_edition_idx" RENAME TO "page_breaks_segment_id_edition_idx";

-- RenameIndex
ALTER INDEX "PageBreak_segment_id_edition_page_code_key" RENAME TO "page_breaks_segment_id_edition_page_code_key";

-- RenameIndex
ALTER INDEX "SegmentLink_from_segment_id_idx" RENAME TO "segment_links_from_segment_id_idx";

-- RenameIndex
ALTER INDEX "SegmentLink_from_segment_id_to_segment_id_key" RENAME TO "segment_links_from_segment_id_to_segment_id_key";

-- RenameIndex
ALTER INDEX "SegmentLink_to_segment_id_idx" RENAME TO "segment_links_to_segment_id_idx";

-- RenameIndex
ALTER INDEX "TranslationJob_userId_idx" RENAME TO "translation_jobs_userId_idx";
