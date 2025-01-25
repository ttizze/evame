/*
  Warnings:

  - You are about to drop the `page_comment_source_texts` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "page_comment_source_texts" DROP CONSTRAINT "page_comment_source_texts_page_comment_id_fkey";

-- DropTable
DROP TABLE "page_comment_source_texts";

-- CreateTable
CREATE TABLE "page_comment_segments" (
    "id" SERIAL NOT NULL,
    "text" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "text_and_occurrence_hash" TEXT NOT NULL,
    "page_comment_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "page_comment_segments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "page_comment_segment_translates" (
    "id" SERIAL NOT NULL,
    "locale" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "user_id" INTEGER NOT NULL,
    "point" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "page_comment_segment_id" INTEGER NOT NULL,

    CONSTRAINT "page_comment_segment_translates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "page_comment_segments_page_comment_id_idx" ON "page_comment_segments"("page_comment_id");

-- CreateIndex
CREATE INDEX "page_comment_segments_text_and_occurrence_hash_idx" ON "page_comment_segments"("text_and_occurrence_hash");

-- CreateIndex
CREATE UNIQUE INDEX "page_comment_segments_page_comment_id_number_key" ON "page_comment_segments"("page_comment_id", "number");

-- CreateIndex
CREATE UNIQUE INDEX "page_comment_segments_page_comment_id_text_and_occurrence_h_key" ON "page_comment_segments"("page_comment_id", "text_and_occurrence_hash");

-- CreateIndex
CREATE INDEX "page_comment_segment_translates_page_comment_segment_id_idx" ON "page_comment_segment_translates"("page_comment_segment_id");

-- CreateIndex
CREATE INDEX "page_comment_segment_translates_user_id_idx" ON "page_comment_segment_translates"("user_id");

-- CreateIndex
CREATE INDEX "page_comment_segment_translates_locale_idx" ON "page_comment_segment_translates"("locale");

-- AddForeignKey
ALTER TABLE "page_comment_segments" ADD CONSTRAINT "page_comment_segments_page_comment_id_fkey" FOREIGN KEY ("page_comment_id") REFERENCES "page_comments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "page_comment_segment_translates" ADD CONSTRAINT "page_comment_segment_translates_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "page_comment_segment_translates" ADD CONSTRAINT "page_comment_segment_translates_page_comment_segment_id_fkey" FOREIGN KEY ("page_comment_segment_id") REFERENCES "page_comment_segments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
