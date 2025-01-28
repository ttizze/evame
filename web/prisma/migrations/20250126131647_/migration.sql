/*
  Warnings:

  - The `ai_translation_status` column on the `user_ai_translation_info` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "TranslationStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'FAILED');

-- AlterTable
ALTER TABLE "user_ai_translation_info" DROP COLUMN "ai_translation_status",
ADD COLUMN     "ai_translation_status" "TranslationStatus" NOT NULL DEFAULT 'PENDING';
