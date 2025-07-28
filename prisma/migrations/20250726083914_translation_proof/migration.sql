-- CreateEnum
CREATE TYPE "TranslationProofStatus" AS ENUM ('MACHINE_DRAFT', 'HUMAN_TOUCHED', 'PROOFREAD', 'VALIDATED');

-- CreateTable
CREATE TABLE "page_locale_translation_proofs" (
    "id" SERIAL NOT NULL,
    "page_id" INTEGER NOT NULL,
    "locale" TEXT NOT NULL,
    "translation_proof_status" "TranslationProofStatus" NOT NULL DEFAULT 'MACHINE_DRAFT',

    CONSTRAINT "page_locale_translation_proofs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "page_locale_translation_proofs_translation_proof_status_idx" ON "page_locale_translation_proofs"("translation_proof_status");

-- CreateIndex
CREATE UNIQUE INDEX "page_locale_translation_proofs_page_id_locale_key" ON "page_locale_translation_proofs"("page_id", "locale");

-- AddForeignKey
ALTER TABLE "page_locale_translation_proofs" ADD CONSTRAINT "page_locale_translation_proofs_page_id_fkey" FOREIGN KEY ("page_id") REFERENCES "pages"("id") ON DELETE CASCADE ON UPDATE CASCADE;
