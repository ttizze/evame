/*
  Warnings:

  - You are about to drop the `project_comment_segment_translation_votes` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `project_comment_segment_translations` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `project_comment_segments` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `project_comments` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `project_images` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `project_likes` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `project_links` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `project_segment_translation_votes` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `project_segment_translations` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `project_segments` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `project_tag_relations` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `project_tags` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `projects` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "TranslationJob" DROP CONSTRAINT "TranslationJob_projectId_fkey";

-- DropForeignKey
ALTER TABLE "notifications" DROP CONSTRAINT "notifications_project_comment_id_fkey";

-- DropForeignKey
ALTER TABLE "notifications" DROP CONSTRAINT "notifications_project_comment_segment_translation_id_fkey";

-- DropForeignKey
ALTER TABLE "notifications" DROP CONSTRAINT "notifications_project_id_fkey";

-- DropForeignKey
ALTER TABLE "notifications" DROP CONSTRAINT "notifications_project_segment_translation_id_fkey";

-- DropForeignKey
ALTER TABLE "project_comment_segment_translation_votes" DROP CONSTRAINT "project_comment_segment_translation_votes_project_comment__fkey";

-- DropForeignKey
ALTER TABLE "project_comment_segment_translation_votes" DROP CONSTRAINT "project_comment_segment_translation_votes_user_id_fkey";

-- DropForeignKey
ALTER TABLE "project_comment_segment_translations" DROP CONSTRAINT "project_comment_segment_translations_project_comment_segme_fkey";

-- DropForeignKey
ALTER TABLE "project_comment_segment_translations" DROP CONSTRAINT "project_comment_segment_translations_user_id_fkey";

-- DropForeignKey
ALTER TABLE "project_comment_segments" DROP CONSTRAINT "project_comment_segments_project_comment_id_fkey";

-- DropForeignKey
ALTER TABLE "project_comments" DROP CONSTRAINT "project_comments_parent_id_fkey";

-- DropForeignKey
ALTER TABLE "project_comments" DROP CONSTRAINT "project_comments_project_id_fkey";

-- DropForeignKey
ALTER TABLE "project_comments" DROP CONSTRAINT "project_comments_user_id_fkey";

-- DropForeignKey
ALTER TABLE "project_images" DROP CONSTRAINT "project_images_project_id_fkey";

-- DropForeignKey
ALTER TABLE "project_likes" DROP CONSTRAINT "project_likes_project_id_fkey";

-- DropForeignKey
ALTER TABLE "project_likes" DROP CONSTRAINT "project_likes_user_id_fkey";

-- DropForeignKey
ALTER TABLE "project_links" DROP CONSTRAINT "project_links_project_id_fkey";

-- DropForeignKey
ALTER TABLE "project_segment_translation_votes" DROP CONSTRAINT "project_segment_translation_votes_project_segment_translat_fkey";

-- DropForeignKey
ALTER TABLE "project_segment_translation_votes" DROP CONSTRAINT "project_segment_translation_votes_user_id_fkey";

-- DropForeignKey
ALTER TABLE "project_segment_translations" DROP CONSTRAINT "project_segment_translations_project_segment_id_fkey";

-- DropForeignKey
ALTER TABLE "project_segment_translations" DROP CONSTRAINT "project_segment_translations_user_id_fkey";

-- DropForeignKey
ALTER TABLE "project_segments" DROP CONSTRAINT "project_segments_project_id_fkey";

-- DropForeignKey
ALTER TABLE "project_tag_relations" DROP CONSTRAINT "project_tag_relations_project_id_fkey";

-- DropForeignKey
ALTER TABLE "project_tag_relations" DROP CONSTRAINT "project_tag_relations_project_tag_id_fkey";

-- DropForeignKey
ALTER TABLE "projects" DROP CONSTRAINT "projects_icon_image_id_fkey";

-- DropForeignKey
ALTER TABLE "projects" DROP CONSTRAINT "projects_user_id_fkey";

-- DropTable
DROP TABLE "project_comment_segment_translation_votes";

-- DropTable
DROP TABLE "project_comment_segment_translations";

-- DropTable
DROP TABLE "project_comment_segments";

-- DropTable
DROP TABLE "project_comments";

-- DropTable
DROP TABLE "project_images";

-- DropTable
DROP TABLE "project_likes";

-- DropTable
DROP TABLE "project_links";

-- DropTable
DROP TABLE "project_segment_translation_votes";

-- DropTable
DROP TABLE "project_segment_translations";

-- DropTable
DROP TABLE "project_segments";

-- DropTable
DROP TABLE "project_tag_relations";

-- DropTable
DROP TABLE "project_tags";

-- DropTable
DROP TABLE "projects";

-- DropEnum
DROP TYPE "LifecycleStatus";

-- DropEnum
DROP TYPE "Progress";
