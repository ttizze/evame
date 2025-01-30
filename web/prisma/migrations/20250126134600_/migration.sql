/*
  Warnings:

  - You are about to drop the `page_comment_segment_translates` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "page_comment_segment_translates" DROP CONSTRAINT "page_comment_segment_translates_page_comment_segment_id_fkey";

-- DropForeignKey
ALTER TABLE "page_comment_segment_translates" DROP CONSTRAINT "page_comment_segment_translates_user_id_fkey";

-- DropTable
DROP TABLE "page_comment_segment_translates";

-- CreateTable
CREATE TABLE "page_comment_segment_translations" (
    "id" SERIAL NOT NULL,
    "locale" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "user_id" INTEGER NOT NULL,
    "point" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "page_comment_segment_id" INTEGER NOT NULL,

    CONSTRAINT "page_comment_segment_translations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "page_comment_segment_translations_page_comment_segment_id_idx" ON "page_comment_segment_translations"("page_comment_segment_id");

-- CreateIndex
CREATE INDEX "page_comment_segment_translations_user_id_idx" ON "page_comment_segment_translations"("user_id");

-- CreateIndex
CREATE INDEX "page_comment_segment_translations_locale_idx" ON "page_comment_segment_translations"("locale");

-- AddForeignKey
ALTER TABLE "page_comment_segment_translations" ADD CONSTRAINT "page_comment_segment_translations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "page_comment_segment_translations" ADD CONSTRAINT "page_comment_segment_translations_page_comment_segment_id_fkey" FOREIGN KEY ("page_comment_segment_id") REFERENCES "page_comment_segments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
