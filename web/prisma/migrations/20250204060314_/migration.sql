/*
  Warnings:

  - A unique constraint covering the columns `[user_id,page_id]` on the table `like_pages` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[page_comment_segment_translation_id,user_id]` on the table `page_comment_segment_translation_votes` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[page_segment_translation_id,user_id]` on the table `votes` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "follows" DROP CONSTRAINT "follows_followerId_fkey";

-- DropForeignKey
ALTER TABLE "follows" DROP CONSTRAINT "follows_followingId_fkey";

-- DropForeignKey
ALTER TABLE "gemini_api_keys" DROP CONSTRAINT "gemini_api_keys_userId_fkey";

-- DropForeignKey
ALTER TABLE "like_pages" DROP CONSTRAINT "like_pages_userId_fkey";

-- DropForeignKey
ALTER TABLE "page_comment_segment_translation_votes" DROP CONSTRAINT "page_comment_segment_translation_votes_userId_fkey";

-- DropForeignKey
ALTER TABLE "page_comment_segment_translations" DROP CONSTRAINT "page_comment_segment_translations_userId_fkey";

-- DropForeignKey
ALTER TABLE "page_comments" DROP CONSTRAINT "page_comments_userId_fkey";

-- DropForeignKey
ALTER TABLE "page_segment_translations" DROP CONSTRAINT "page_segment_translations_userId_fkey";

-- DropForeignKey
ALTER TABLE "pages" DROP CONSTRAINT "pages_userId_fkey";

-- DropForeignKey
ALTER TABLE "user_ai_translation_info" DROP CONSTRAINT "user_ai_translation_info_userId_fkey";

-- DropForeignKey
ALTER TABLE "user_credentials" DROP CONSTRAINT "user_credentials_userId_fkey";

-- DropForeignKey
ALTER TABLE "user_emails" DROP CONSTRAINT "user_emails_userId_fkey";

-- DropForeignKey
ALTER TABLE "votes" DROP CONSTRAINT "votes_userId_fkey";

-- DropIndex
DROP INDEX "users_cuid_key";

-- CreateIndex
CREATE INDEX "follows_follower_id_idx" ON "follows"("follower_id");

-- CreateIndex
CREATE INDEX "follows_following_id_idx" ON "follows"("following_id");

-- CreateIndex
CREATE INDEX "gemini_api_keys_user_id_idx" ON "gemini_api_keys"("user_id");

-- CreateIndex
CREATE INDEX "like_pages_user_id_idx" ON "like_pages"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "like_pages_user_id_page_id_key" ON "like_pages"("user_id", "page_id");

-- CreateIndex
CREATE INDEX "page_comment_segment_translation_votes_user_id_idx" ON "page_comment_segment_translation_votes"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "page_comment_segment_translation_votes_page_comment_segment_key" ON "page_comment_segment_translation_votes"("page_comment_segment_translation_id", "user_id");

-- CreateIndex
CREATE INDEX "page_comment_segment_translations_user_id_idx" ON "page_comment_segment_translations"("user_id");

-- CreateIndex
CREATE INDEX "page_comments_user_id_idx" ON "page_comments"("user_id");

-- CreateIndex
CREATE INDEX "page_segment_translations_user_id_idx" ON "page_segment_translations"("user_id");

-- CreateIndex
CREATE INDEX "pages_user_id_idx" ON "pages"("user_id");

-- CreateIndex
CREATE INDEX "user_ai_translation_info_user_id_idx" ON "user_ai_translation_info"("user_id");

-- CreateIndex
CREATE INDEX "user_credentials_user_id_idx" ON "user_credentials"("user_id");

-- CreateIndex
CREATE INDEX "user_emails_user_id_idx" ON "user_emails"("user_id");

-- CreateIndex
CREATE INDEX "votes_user_id_idx" ON "votes"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "votes_page_segment_translation_id_user_id_key" ON "votes"("page_segment_translation_id", "user_id");

-- AddForeignKey
ALTER TABLE "user_emails" ADD CONSTRAINT "user_emails_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_credentials" ADD CONSTRAINT "user_credentials_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gemini_api_keys" ADD CONSTRAINT "gemini_api_keys_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "follows" ADD CONSTRAINT "follows_follower_id_fkey" FOREIGN KEY ("follower_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "follows" ADD CONSTRAINT "follows_following_id_fkey" FOREIGN KEY ("following_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_ai_translation_info" ADD CONSTRAINT "user_ai_translation_info_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pages" ADD CONSTRAINT "pages_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "page_segment_translations" ADD CONSTRAINT "page_segment_translations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "like_pages" ADD CONSTRAINT "like_pages_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "votes" ADD CONSTRAINT "votes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "page_comments" ADD CONSTRAINT "page_comments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "page_comment_segment_translations" ADD CONSTRAINT "page_comment_segment_translations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "page_comment_segment_translation_votes" ADD CONSTRAINT "page_comment_segment_translation_votes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "gemini_api_keys_new_user_id_key" RENAME TO "gemini_api_keys_user_id_key";

-- RenameIndex
ALTER INDEX "user_credentials_new_user_id_key" RENAME TO "user_credentials_user_id_key";

-- RenameIndex
ALTER INDEX "user_emails_new_user_id_key" RENAME TO "user_emails_user_id_key";
