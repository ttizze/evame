/*
  Warnings:

  - You are about to drop the `page_ai_translation_info` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `project_ai_translation_info` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `project_user_ai_translation_info` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `user_ai_translation_info` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "page_ai_translation_info" DROP CONSTRAINT "page_ai_translation_info_page_id_fkey";

-- DropForeignKey
ALTER TABLE "project_ai_translation_info" DROP CONSTRAINT "project_ai_translation_info_project_id_fkey";

-- DropForeignKey
ALTER TABLE "project_user_ai_translation_info" DROP CONSTRAINT "project_user_ai_translation_info_project_id_fkey";

-- DropForeignKey
ALTER TABLE "project_user_ai_translation_info" DROP CONSTRAINT "project_user_ai_translation_info_user_id_fkey";

-- DropForeignKey
ALTER TABLE "user_ai_translation_info" DROP CONSTRAINT "user_ai_translation_info_page_id_fkey";

-- DropForeignKey
ALTER TABLE "user_ai_translation_info" DROP CONSTRAINT "user_ai_translation_info_user_id_fkey";

-- DropTable
DROP TABLE "page_ai_translation_info";

-- DropTable
DROP TABLE "project_ai_translation_info";

-- DropTable
DROP TABLE "project_user_ai_translation_info";

-- DropTable
DROP TABLE "user_ai_translation_info";

-- CreateTable
CREATE TABLE "TranslationJob" (
    "id" SERIAL NOT NULL,
    "pageId" INTEGER,
    "projectId" TEXT,
    "userId" TEXT,
    "locale" TEXT NOT NULL,
    "aiModel" TEXT NOT NULL,
    "status" "TranslationStatus" NOT NULL DEFAULT 'PENDING',
    "progress" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TranslationJob_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TranslationJob_userId_idx" ON "TranslationJob"("userId");

-- AddForeignKey
ALTER TABLE "TranslationJob" ADD CONSTRAINT "TranslationJob_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "pages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TranslationJob" ADD CONSTRAINT "TranslationJob_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TranslationJob" ADD CONSTRAINT "TranslationJob_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
