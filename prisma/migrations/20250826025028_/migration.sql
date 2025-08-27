/*
  Warnings:

  - A unique constraint covering the columns `[content_id]` on the table `page_comments` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[content_id]` on the table `pages` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "public"."ContentKind" AS ENUM ('PAGE', 'PAGE_COMMENT');

-- AlterTable
ALTER TABLE "public"."notifications" ADD COLUMN     "segment_translation_id" INTEGER;

-- AlterTable
ALTER TABLE "public"."page_comments" ADD COLUMN     "content_id" INTEGER;

-- AlterTable
ALTER TABLE "public"."pages" ADD COLUMN     "content_id" INTEGER;

-- CreateTable
CREATE TABLE "public"."contents" (
    "id" SERIAL NOT NULL,
    "kind" "public"."ContentKind" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."segments" (
    "id" SERIAL NOT NULL,
    "content_id" INTEGER NOT NULL,
    "number" INTEGER NOT NULL,
    "text" TEXT NOT NULL,
    "text_and_occurrence_hash" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "segments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."segment_translations" (
    "id" SERIAL NOT NULL,
    "segment_id" INTEGER NOT NULL,
    "locale" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "point" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "user_id" TEXT NOT NULL,

    CONSTRAINT "segment_translations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."translation_votes" (
    "translation_id" INTEGER NOT NULL,
    "user_id" TEXT NOT NULL,
    "is_upvote" BOOLEAN NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL
);

-- CreateIndex
CREATE INDEX "contents_kind_idx" ON "public"."contents"("kind");

-- CreateIndex
CREATE INDEX "segments_content_id_idx" ON "public"."segments"("content_id");

-- CreateIndex
CREATE INDEX "segments_text_and_occurrence_hash_idx" ON "public"."segments"("text_and_occurrence_hash");

-- CreateIndex
CREATE UNIQUE INDEX "segments_content_id_number_key" ON "public"."segments"("content_id", "number");

-- CreateIndex
CREATE UNIQUE INDEX "segments_content_id_text_and_occurrence_hash_key" ON "public"."segments"("content_id", "text_and_occurrence_hash");

-- CreateIndex
CREATE INDEX "segment_translations_segment_id_locale_idx" ON "public"."segment_translations"("segment_id", "locale");

-- CreateIndex
CREATE INDEX "segment_translations_user_id_idx" ON "public"."segment_translations"("user_id");

-- CreateIndex
CREATE INDEX "translation_votes_translation_id_idx" ON "public"."translation_votes"("translation_id");

-- CreateIndex
CREATE INDEX "translation_votes_user_id_idx" ON "public"."translation_votes"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "translation_votes_translation_id_user_id_key" ON "public"."translation_votes"("translation_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "page_comments_content_id_key" ON "public"."page_comments"("content_id");

-- CreateIndex
CREATE UNIQUE INDEX "pages_content_id_key" ON "public"."pages"("content_id");

-- AddForeignKey
ALTER TABLE "public"."pages" ADD CONSTRAINT "pages_content_id_fkey" FOREIGN KEY ("content_id") REFERENCES "public"."contents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."page_comments" ADD CONSTRAINT "page_comments_content_id_fkey" FOREIGN KEY ("content_id") REFERENCES "public"."contents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."notifications" ADD CONSTRAINT "notifications_segment_translation_id_fkey" FOREIGN KEY ("segment_translation_id") REFERENCES "public"."segment_translations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."segments" ADD CONSTRAINT "segments_content_id_fkey" FOREIGN KEY ("content_id") REFERENCES "public"."contents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."segment_translations" ADD CONSTRAINT "segment_translations_segment_id_fkey" FOREIGN KEY ("segment_id") REFERENCES "public"."segments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."segment_translations" ADD CONSTRAINT "segment_translations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."translation_votes" ADD CONSTRAINT "translation_votes_translation_id_fkey" FOREIGN KEY ("translation_id") REFERENCES "public"."segment_translations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."translation_votes" ADD CONSTRAINT "translation_votes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
