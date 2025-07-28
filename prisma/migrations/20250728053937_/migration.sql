/*
  Warnings:

  - You are about to drop the column `segments_with_1_plus_votes` on the `page_locale_translation_proofs` table. All the data in the column will be lost.
  - You are about to drop the column `segments_with_2_plus_votes` on the `page_locale_translation_proofs` table. All the data in the column will be lost.
  - You are about to drop the column `total_segment_count` on the `page_locale_translation_proofs` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "TranslationProofStatus" AS ENUM ('MACHINE_DRAFT', 'HUMAN_TOUCHED', 'PROOFREAD', 'VALIDATED');

-- DropIndex
DROP INDEX "page_locale_translation_proofs_segments_with_1_plus_votes_idx";

-- DropIndex
DROP INDEX "page_locale_translation_proofs_segments_with_2_plus_votes_idx";

-- DropIndex
DROP INDEX "page_locale_translation_proofs_total_segment_count_idx";

-- AlterTable
ALTER TABLE "page_locale_translation_proofs" DROP COLUMN "segments_with_1_plus_votes",
DROP COLUMN "segments_with_2_plus_votes",
DROP COLUMN "total_segment_count",
ADD COLUMN     "translation_proof_status" "TranslationProofStatus" NOT NULL DEFAULT 'MACHINE_DRAFT';

-- CreateIndex
CREATE INDEX "page_locale_translation_proofs_translation_proof_status_idx" ON "page_locale_translation_proofs"("translation_proof_status");
