-- Rename tables to match schema @@map directives (snake_case)
ALTER TABLE "SegmentLink" RENAME TO "segment_links";
ALTER TABLE "PageBreak" RENAME TO "page_breaks";
ALTER TABLE "PageView" RENAME TO "page_views";
ALTER TABLE "TranslationJob" RENAME TO "translation_jobs";
ALTER TABLE "ImportRun" RENAME TO "import_runs";
ALTER TABLE "ImportFile" RENAME TO "import_files";


