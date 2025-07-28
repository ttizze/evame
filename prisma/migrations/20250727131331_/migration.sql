/*
  Warnings:

  - You are about to drop the column `translation_proof_status` on the `page_locale_translation_proofs` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "page_locale_translation_proofs_translation_proof_status_idx";

-- AlterTable
ALTER TABLE "page_locale_translation_proofs" DROP COLUMN "translation_proof_status",
ADD COLUMN     "segments_with_1_plus_votes" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "segments_with_2_plus_votes" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "total_segment_count" INTEGER NOT NULL DEFAULT 0;

-- DropEnum
DROP TYPE "TranslationProofStatus";

-- CreateIndex
CREATE INDEX "page_locale_translation_proofs_total_segment_count_idx" ON "page_locale_translation_proofs"("total_segment_count");

-- CreateIndex
CREATE INDEX "page_locale_translation_proofs_segments_with_1_plus_votes_idx" ON "page_locale_translation_proofs"("segments_with_1_plus_votes");

-- CreateIndex
CREATE INDEX "page_locale_translation_proofs_segments_with_2_plus_votes_idx" ON "page_locale_translation_proofs"("segments_with_2_plus_votes");
