/*
  Warnings:

  - You are about to drop the column `page_comment_segment_translation_id` on the `notifications` table. All the data in the column will be lost.
  - You are about to drop the column `page_segment_translation_id` on the `notifications` table. All the data in the column will be lost.
  - You are about to drop the `page_comment_segment_translation_votes` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `page_comment_segment_translations` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `page_comment_segments` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `page_segment_translations` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `page_segments` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `votes` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."notifications" DROP CONSTRAINT "notifications_page_comment_segment_translation_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."notifications" DROP CONSTRAINT "notifications_page_segment_translation_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."page_comment_segment_translation_votes" DROP CONSTRAINT "page_comment_segment_translation_votes_page_comment_segmen_fkey";

-- DropForeignKey
ALTER TABLE "public"."page_comment_segment_translation_votes" DROP CONSTRAINT "page_comment_segment_translation_votes_user_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."page_comment_segment_translations" DROP CONSTRAINT "page_comment_segment_translations_page_comment_segment_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."page_comment_segment_translations" DROP CONSTRAINT "page_comment_segment_translations_user_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."page_comment_segments" DROP CONSTRAINT "page_comment_segments_page_comment_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."page_segment_translations" DROP CONSTRAINT "page_segment_translations_page_segment_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."page_segment_translations" DROP CONSTRAINT "page_segment_translations_user_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."page_segments" DROP CONSTRAINT "page_segments_page_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."votes" DROP CONSTRAINT "votes_page_segment_translation_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."votes" DROP CONSTRAINT "votes_user_id_fkey";

-- AlterTable
ALTER TABLE "public"."notifications" DROP COLUMN "page_comment_segment_translation_id",
DROP COLUMN "page_segment_translation_id";

-- DropTable
DROP TABLE "public"."page_comment_segment_translation_votes";

-- DropTable
DROP TABLE "public"."page_comment_segment_translations";

-- DropTable
DROP TABLE "public"."page_comment_segments";

-- DropTable
DROP TABLE "public"."page_segment_translations";

-- DropTable
DROP TABLE "public"."page_segments";

-- DropTable
DROP TABLE "public"."votes";
