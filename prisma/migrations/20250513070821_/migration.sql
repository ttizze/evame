/*
  Warnings:

  - The values [PROJECT_COMMENT,PROJECT_LIKE,PROJECT_SEGMENT_TRANSLATION_VOTE,PROJECT_COMMENT_SEGMENT_TRANSLATION_VOTE] on the enum `NotificationType` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `projectId` on the `TranslationJob` table. All the data in the column will be lost.
  - You are about to drop the column `project_comment_id` on the `notifications` table. All the data in the column will be lost.
  - You are about to drop the column `project_comment_segment_translation_id` on the `notifications` table. All the data in the column will be lost.
  - You are about to drop the column `project_id` on the `notifications` table. All the data in the column will be lost.
  - You are about to drop the column `project_segment_translation_id` on the `notifications` table. All the data in the column will be lost.
  - Made the column `pageId` on table `TranslationJob` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "NotificationType_new" AS ENUM ('FOLLOW', 'PAGE_COMMENT', 'PAGE_LIKE', 'PAGE_SEGMENT_TRANSLATION_VOTE', 'PAGE_COMMENT_SEGMENT_TRANSLATION_VOTE');
ALTER TABLE "notifications" ALTER COLUMN "type" TYPE "NotificationType_new" USING ("type"::text::"NotificationType_new");
ALTER TYPE "NotificationType" RENAME TO "NotificationType_old";
ALTER TYPE "NotificationType_new" RENAME TO "NotificationType";
DROP TYPE "NotificationType_old";
COMMIT;

-- AlterTable
ALTER TABLE "TranslationJob" DROP COLUMN "projectId",
ALTER COLUMN "pageId" SET NOT NULL;

-- AlterTable
ALTER TABLE "notifications" DROP COLUMN "project_comment_id",
DROP COLUMN "project_comment_segment_translation_id",
DROP COLUMN "project_id",
DROP COLUMN "project_segment_translation_id";
