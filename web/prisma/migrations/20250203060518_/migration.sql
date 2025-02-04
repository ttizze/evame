/*
  Warnings:

  - A unique constraint covering the columns `[new_user_id]` on the table `gemini_api_keys` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[new_user_id]` on the table `user_credentials` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[new_user_id]` on the table `user_emails` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[cuid]` on the table `users` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "follows" ADD COLUMN     "new_follower_id" TEXT,
ADD COLUMN     "new_following_id" TEXT;

-- AlterTable
ALTER TABLE "gemini_api_keys" ADD COLUMN     "new_user_id" TEXT;

-- AlterTable
ALTER TABLE "like_pages" ADD COLUMN     "new_user_id" TEXT;

-- AlterTable
ALTER TABLE "page_comment_segment_translation_votes" ADD COLUMN     "new_user_id" TEXT;

-- AlterTable
ALTER TABLE "page_comment_segment_translations" ADD COLUMN     "new_user_id" TEXT;

-- AlterTable
ALTER TABLE "page_comments" ADD COLUMN     "new_user_id" TEXT;

-- AlterTable
ALTER TABLE "page_segment_translations" ADD COLUMN     "new_user_id" TEXT;

-- AlterTable
ALTER TABLE "pages" ADD COLUMN     "new_user_id" TEXT;

-- AlterTable
ALTER TABLE "user_ai_translation_info" ADD COLUMN     "new_user_id" TEXT;

-- AlterTable
ALTER TABLE "user_credentials" ADD COLUMN     "new_user_id" TEXT;

-- AlterTable
ALTER TABLE "user_emails" ADD COLUMN     "new_user_id" TEXT;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "cuid" TEXT;

-- AlterTable
ALTER TABLE "votes" ADD COLUMN     "new_user_id" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "gemini_api_keys_new_user_id_key" ON "gemini_api_keys"("new_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_credentials_new_user_id_key" ON "user_credentials"("new_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_emails_new_user_id_key" ON "user_emails"("new_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_cuid_key" ON "users"("cuid");
