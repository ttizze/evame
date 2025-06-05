-- CreateTable
CREATE TABLE "page_ai_translation_info" (
    "id" SERIAL NOT NULL,
    "page_id" INTEGER NOT NULL,
    "locale" TEXT NOT NULL,
    "ai_translation_status" "TranslationStatus" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "page_ai_translation_info_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "page_ai_translation_info_page_id_idx" ON "page_ai_translation_info"("page_id");

-- AddForeignKey
ALTER TABLE "page_ai_translation_info" ADD CONSTRAINT "page_ai_translation_info_page_id_fkey" FOREIGN KEY ("page_id") REFERENCES "pages"("id") ON DELETE CASCADE ON UPDATE CASCADE;
