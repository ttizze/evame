/*
  Warnings:

  - The values [TRANSLATION_VOTE] on the enum `NotificationType` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the `notification_follows` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `notification_page_comments` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `notification_translation_votes` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `actor_id` to the `notifications` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "NotificationType_new" AS ENUM ('FOLLOW', 'PAGE_COMMENT', 'PAGE_LIKE', 'PAGE_SEGMENT_TRANSLATION_VOTE', 'PAGE_COMMENT_SEGMENT_TRANSLATION_VOTE');
ALTER TABLE "notifications" ALTER COLUMN "type" TYPE "NotificationType_new" USING ("type"::text::"NotificationType_new");
ALTER TYPE "NotificationType" RENAME TO "NotificationType_old";
ALTER TYPE "NotificationType_new" RENAME TO "NotificationType";
DROP TYPE "NotificationType_old";
COMMIT;

-- DropForeignKey
ALTER TABLE "notification_follows" DROP CONSTRAINT "notification_follows_follower_id_fkey";

-- DropForeignKey
ALTER TABLE "notification_follows" DROP CONSTRAINT "notification_follows_notification_id_fkey";

-- DropForeignKey
ALTER TABLE "notification_page_comments" DROP CONSTRAINT "notification_page_comments_notification_id_fkey";

-- DropForeignKey
ALTER TABLE "notification_page_comments" DROP CONSTRAINT "notification_page_comments_page_comment_id_fkey";

-- DropForeignKey
ALTER TABLE "notification_translation_votes" DROP CONSTRAINT "notification_translation_votes_notification_id_fkey";

-- DropForeignKey
ALTER TABLE "notification_translation_votes" DROP CONSTRAINT "notification_translation_votes_page_comment_segment_transl_fkey";

-- DropForeignKey
ALTER TABLE "notification_translation_votes" DROP CONSTRAINT "notification_translation_votes_page_segment_translation_id_fkey";

-- DropForeignKey
ALTER TABLE "notification_translation_votes" DROP CONSTRAINT "notification_translation_votes_voter_id_fkey";

-- AlterTable
ALTER TABLE "notifications" ADD COLUMN     "actor_id" TEXT NOT NULL,
ADD COLUMN     "page_comment_id" INTEGER,
ADD COLUMN     "page_comment_segment_translation_id" INTEGER,
ADD COLUMN     "page_id" INTEGER,
ADD COLUMN     "page_segment_translation_id" INTEGER;

-- DropTable
DROP TABLE "notification_follows";

-- DropTable
DROP TABLE "notification_page_comments";

-- DropTable
DROP TABLE "notification_translation_votes";

-- CreateIndex
CREATE INDEX "notifications_actor_id_idx" ON "notifications"("actor_id");

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_page_comment_id_fkey" FOREIGN KEY ("page_comment_id") REFERENCES "page_comments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_page_id_fkey" FOREIGN KEY ("page_id") REFERENCES "pages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_page_segment_translation_id_fkey" FOREIGN KEY ("page_segment_translation_id") REFERENCES "page_segment_translations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_page_comment_segment_translation_id_fkey" FOREIGN KEY ("page_comment_segment_translation_id") REFERENCES "page_comment_segment_translations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
