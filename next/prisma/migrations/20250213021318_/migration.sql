/*
  Warnings:

  - You are about to drop the column `followerId` on the `notification_follows` table. All the data in the column will be lost.
  - You are about to drop the column `notificationId` on the `notification_follows` table. All the data in the column will be lost.
  - You are about to drop the column `commentId` on the `notification_page_comments` table. All the data in the column will be lost.
  - You are about to drop the column `notificationId` on the `notification_page_comments` table. All the data in the column will be lost.
  - You are about to drop the column `pageId` on the `notification_page_comments` table. All the data in the column will be lost.
  - You are about to drop the column `notificationId` on the `notification_translation_votes` table. All the data in the column will be lost.
  - You are about to drop the column `translationId` on the `notification_translation_votes` table. All the data in the column will be lost.
  - You are about to drop the column `voterId` on the `notification_translation_votes` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[notification_id]` on the table `notification_follows` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[notification_id]` on the table `notification_page_comments` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[notification_id]` on the table `notification_translation_votes` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `follower_id` to the `notification_follows` table without a default value. This is not possible if the table is not empty.
  - Added the required column `notification_id` to the `notification_follows` table without a default value. This is not possible if the table is not empty.
  - Added the required column `notification_id` to the `notification_page_comments` table without a default value. This is not possible if the table is not empty.
  - Added the required column `page_comment_id` to the `notification_page_comments` table without a default value. This is not possible if the table is not empty.
  - Added the required column `notification_id` to the `notification_translation_votes` table without a default value. This is not possible if the table is not empty.
  - Added the required column `voter_id` to the `notification_translation_votes` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "notification_follows" DROP CONSTRAINT "notification_follows_notificationId_fkey";

-- DropForeignKey
ALTER TABLE "notification_page_comments" DROP CONSTRAINT "notification_page_comments_notificationId_fkey";

-- DropForeignKey
ALTER TABLE "notification_translation_votes" DROP CONSTRAINT "notification_translation_votes_notificationId_fkey";

-- DropIndex
DROP INDEX "notification_follows_notificationId_key";

-- DropIndex
DROP INDEX "notification_page_comments_notificationId_key";

-- DropIndex
DROP INDEX "notification_translation_votes_notificationId_key";

-- AlterTable
ALTER TABLE "notification_follows" DROP COLUMN "followerId",
DROP COLUMN "notificationId",
ADD COLUMN     "follower_id" TEXT NOT NULL,
ADD COLUMN     "notification_id" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "notification_page_comments" DROP COLUMN "commentId",
DROP COLUMN "notificationId",
DROP COLUMN "pageId",
ADD COLUMN     "notification_id" INTEGER NOT NULL,
ADD COLUMN     "page_comment_id" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "notification_translation_votes" DROP COLUMN "notificationId",
DROP COLUMN "translationId",
DROP COLUMN "voterId",
ADD COLUMN     "notification_id" INTEGER NOT NULL,
ADD COLUMN     "page_comment_segment_translation_id" INTEGER,
ADD COLUMN     "page_segment_translation_id" INTEGER,
ADD COLUMN     "voter_id" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "notification_follows_notification_id_key" ON "notification_follows"("notification_id");

-- CreateIndex
CREATE INDEX "notification_follows_follower_id_idx" ON "notification_follows"("follower_id");

-- CreateIndex
CREATE UNIQUE INDEX "notification_page_comments_notification_id_key" ON "notification_page_comments"("notification_id");

-- CreateIndex
CREATE INDEX "notification_page_comments_page_comment_id_idx" ON "notification_page_comments"("page_comment_id");

-- CreateIndex
CREATE UNIQUE INDEX "notification_translation_votes_notification_id_key" ON "notification_translation_votes"("notification_id");

-- CreateIndex
CREATE INDEX "notification_translation_votes_voter_id_idx" ON "notification_translation_votes"("voter_id");

-- AddForeignKey
ALTER TABLE "notification_page_comments" ADD CONSTRAINT "notification_page_comments_notification_id_fkey" FOREIGN KEY ("notification_id") REFERENCES "notifications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_page_comments" ADD CONSTRAINT "notification_page_comments_page_comment_id_fkey" FOREIGN KEY ("page_comment_id") REFERENCES "page_comments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_follows" ADD CONSTRAINT "notification_follows_notification_id_fkey" FOREIGN KEY ("notification_id") REFERENCES "notifications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_follows" ADD CONSTRAINT "notification_follows_follower_id_fkey" FOREIGN KEY ("follower_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_translation_votes" ADD CONSTRAINT "notification_translation_votes_notification_id_fkey" FOREIGN KEY ("notification_id") REFERENCES "notifications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_translation_votes" ADD CONSTRAINT "notification_translation_votes_page_segment_translation_id_fkey" FOREIGN KEY ("page_segment_translation_id") REFERENCES "page_segment_translations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_translation_votes" ADD CONSTRAINT "notification_translation_votes_page_comment_segment_transl_fkey" FOREIGN KEY ("page_comment_segment_translation_id") REFERENCES "page_comment_segment_translations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_translation_votes" ADD CONSTRAINT "notification_translation_votes_voter_id_fkey" FOREIGN KEY ("voter_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
