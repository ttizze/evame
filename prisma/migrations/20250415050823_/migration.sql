-- AlterTable
ALTER TABLE "projects" ADD COLUMN     "source_locale" TEXT NOT NULL DEFAULT 'unknown';

-- CreateTable
CREATE TABLE "project_segments" (
    "id" SERIAL NOT NULL,
    "text" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "text_and_occurrence_hash" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "project_segments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_segment_translations" (
    "id" SERIAL NOT NULL,
    "locale" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "project_segment_id" INTEGER NOT NULL,
    "user_id" TEXT NOT NULL,
    "point" INTEGER NOT NULL DEFAULT 0,
    "is_archived" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_segment_translations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_segment_translation_votes" (
    "id" SERIAL NOT NULL,
    "user_id" TEXT NOT NULL,
    "project_segment_translation_id" INTEGER NOT NULL,
    "is_upvote" BOOLEAN NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "project_segment_translation_votes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_user_ai_translation_info" (
    "id" SERIAL NOT NULL,
    "user_id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "locale" TEXT NOT NULL,
    "ai_model" TEXT NOT NULL,
    "ai_translation_status" "TranslationStatus" NOT NULL DEFAULT 'PENDING',
    "ai_translation_progress" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_user_ai_translation_info_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_ai_translation_info" (
    "id" SERIAL NOT NULL,
    "project_id" TEXT NOT NULL,
    "locale" TEXT NOT NULL,
    "ai_translation_status" "TranslationStatus" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "project_ai_translation_info_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "project_segments_project_id_idx" ON "project_segments"("project_id");

-- CreateIndex
CREATE INDEX "project_segments_number_idx" ON "project_segments"("number");

-- CreateIndex
CREATE INDEX "project_segments_text_and_occurrence_hash_idx" ON "project_segments"("text_and_occurrence_hash");

-- CreateIndex
CREATE UNIQUE INDEX "project_segments_project_id_number_key" ON "project_segments"("project_id", "number");

-- CreateIndex
CREATE UNIQUE INDEX "project_segments_project_id_text_and_occurrence_hash_key" ON "project_segments"("project_id", "text_and_occurrence_hash");

-- CreateIndex
CREATE INDEX "project_segment_translations_project_segment_id_idx" ON "project_segment_translations"("project_segment_id");

-- CreateIndex
CREATE INDEX "project_segment_translations_user_id_idx" ON "project_segment_translations"("user_id");

-- CreateIndex
CREATE INDEX "project_segment_translations_locale_idx" ON "project_segment_translations"("locale");

-- CreateIndex
CREATE INDEX "project_segment_translations_locale_is_archived_idx" ON "project_segment_translations"("locale", "is_archived");

-- CreateIndex
CREATE INDEX "project_segment_translations_project_segment_id_locale_is_a_idx" ON "project_segment_translations"("project_segment_id", "locale", "is_archived");

-- CreateIndex
CREATE INDEX "project_segment_translations_point_created_at_idx" ON "project_segment_translations"("point", "created_at");

-- CreateIndex
CREATE INDEX "project_segment_translation_votes_project_segment_translati_idx" ON "project_segment_translation_votes"("project_segment_translation_id");

-- CreateIndex
CREATE INDEX "project_segment_translation_votes_user_id_idx" ON "project_segment_translation_votes"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "project_segment_translation_votes_project_segment_translati_key" ON "project_segment_translation_votes"("project_segment_translation_id", "user_id");

-- CreateIndex
CREATE INDEX "project_user_ai_translation_info_user_id_idx" ON "project_user_ai_translation_info"("user_id");

-- CreateIndex
CREATE INDEX "project_user_ai_translation_info_project_id_idx" ON "project_user_ai_translation_info"("project_id");

-- CreateIndex
CREATE INDEX "project_user_ai_translation_info_project_id_locale_idx" ON "project_user_ai_translation_info"("project_id", "locale");

-- CreateIndex
CREATE INDEX "project_ai_translation_info_project_id_idx" ON "project_ai_translation_info"("project_id");

-- CreateIndex
CREATE INDEX "project_ai_translation_info_project_id_locale_created_at_idx" ON "project_ai_translation_info"("project_id", "locale", "created_at");

-- AddForeignKey
ALTER TABLE "project_segments" ADD CONSTRAINT "project_segments_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_segment_translations" ADD CONSTRAINT "project_segment_translations_project_segment_id_fkey" FOREIGN KEY ("project_segment_id") REFERENCES "project_segments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_segment_translations" ADD CONSTRAINT "project_segment_translations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_segment_translation_votes" ADD CONSTRAINT "project_segment_translation_votes_project_segment_translat_fkey" FOREIGN KEY ("project_segment_translation_id") REFERENCES "project_segment_translations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_segment_translation_votes" ADD CONSTRAINT "project_segment_translation_votes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_user_ai_translation_info" ADD CONSTRAINT "project_user_ai_translation_info_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_user_ai_translation_info" ADD CONSTRAINT "project_user_ai_translation_info_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_ai_translation_info" ADD CONSTRAINT "project_ai_translation_info_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
