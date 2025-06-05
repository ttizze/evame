-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationType" ADD VALUE 'PROJECT_COMMENT';
ALTER TYPE "NotificationType" ADD VALUE 'PROJECT_LIKE';
ALTER TYPE "NotificationType" ADD VALUE 'PROJECT_SEGMENT_TRANSLATION_VOTE';
ALTER TYPE "NotificationType" ADD VALUE 'PROJECT_COMMENT_SEGMENT_TRANSLATION_VOTE';

-- AlterTable
ALTER TABLE "notifications" ADD COLUMN     "project_comment_id" INTEGER,
ADD COLUMN     "project_comment_segment_translation_id" INTEGER,
ADD COLUMN     "project_id" TEXT,
ADD COLUMN     "project_segment_translation_id" INTEGER;

-- CreateTable
CREATE TABLE "project_comments" (
    "id" SERIAL NOT NULL,
    "mdast_json" JSONB NOT NULL,
    "sourcelocale" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "parent_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "project_comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_comment_segments" (
    "id" SERIAL NOT NULL,
    "text" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "text_and_occurrence_hash" TEXT NOT NULL,
    "project_comment_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "project_comment_segments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_comment_segment_translations" (
    "id" SERIAL NOT NULL,
    "locale" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "point" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "project_comment_segment_id" INTEGER NOT NULL,

    CONSTRAINT "project_comment_segment_translations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_comment_segment_translation_votes" (
    "id" SERIAL NOT NULL,
    "user_id" TEXT NOT NULL,
    "project_comment_segment_translation_id" INTEGER NOT NULL,
    "is_upvote" BOOLEAN NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "project_comment_segment_translation_votes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "project_comments_user_id_idx" ON "project_comments"("user_id");

-- CreateIndex
CREATE INDEX "project_comments_project_id_idx" ON "project_comments"("project_id");

-- CreateIndex
CREATE INDEX "project_comments_created_at_idx" ON "project_comments"("created_at");

-- CreateIndex
CREATE INDEX "project_comment_segments_project_comment_id_idx" ON "project_comment_segments"("project_comment_id");

-- CreateIndex
CREATE INDEX "project_comment_segments_text_and_occurrence_hash_idx" ON "project_comment_segments"("text_and_occurrence_hash");

-- CreateIndex
CREATE UNIQUE INDEX "project_comment_segments_project_comment_id_number_key" ON "project_comment_segments"("project_comment_id", "number");

-- CreateIndex
CREATE UNIQUE INDEX "project_comment_segments_project_comment_id_text_and_occurr_key" ON "project_comment_segments"("project_comment_id", "text_and_occurrence_hash");

-- CreateIndex
CREATE INDEX "project_comment_segment_translations_project_comment_segmen_idx" ON "project_comment_segment_translations"("project_comment_segment_id");

-- CreateIndex
CREATE INDEX "project_comment_segment_translations_user_id_idx" ON "project_comment_segment_translations"("user_id");

-- CreateIndex
CREATE INDEX "project_comment_segment_translations_locale_idx" ON "project_comment_segment_translations"("locale");

-- CreateIndex
CREATE INDEX "project_comment_segment_translation_votes_project_comment_s_idx" ON "project_comment_segment_translation_votes"("project_comment_segment_translation_id");

-- CreateIndex
CREATE INDEX "project_comment_segment_translation_votes_user_id_idx" ON "project_comment_segment_translation_votes"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "project_comment_segment_translation_votes_project_comment_s_key" ON "project_comment_segment_translation_votes"("project_comment_segment_translation_id", "user_id");

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_project_comment_id_fkey" FOREIGN KEY ("project_comment_id") REFERENCES "project_comments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_project_comment_segment_translation_id_fkey" FOREIGN KEY ("project_comment_segment_translation_id") REFERENCES "project_comment_segment_translations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_project_segment_translation_id_fkey" FOREIGN KEY ("project_segment_translation_id") REFERENCES "project_segment_translations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_comments" ADD CONSTRAINT "project_comments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_comments" ADD CONSTRAINT "project_comments_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_comments" ADD CONSTRAINT "project_comments_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "project_comments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_comment_segments" ADD CONSTRAINT "project_comment_segments_project_comment_id_fkey" FOREIGN KEY ("project_comment_id") REFERENCES "project_comments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_comment_segment_translations" ADD CONSTRAINT "project_comment_segment_translations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_comment_segment_translations" ADD CONSTRAINT "project_comment_segment_translations_project_comment_segme_fkey" FOREIGN KEY ("project_comment_segment_id") REFERENCES "project_comment_segments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_comment_segment_translation_votes" ADD CONSTRAINT "project_comment_segment_translation_votes_project_comment__fkey" FOREIGN KEY ("project_comment_segment_translation_id") REFERENCES "project_comment_segment_translations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_comment_segment_translation_votes" ADD CONSTRAINT "project_comment_segment_translation_votes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
