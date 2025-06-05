/*
  Warnings:

  - The `projectId` column on the `TranslationJob` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `project_images` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `id` column on the `project_images` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `project_likes` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `id` column on the `project_likes` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `project_links` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `id` column on the `project_links` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `project_tag_relations` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `project_tags` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `id` column on the `project_tags` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `projects` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `id` column on the `projects` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `icon_image_id` column on the `projects` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - A unique constraint covering the columns `[slug]` on the table `projects` will be added. If there are existing duplicate values, this will fail.
  - Changed the type of `project_id` on the `project_comments` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `project_id` on the `project_images` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `project_id` on the `project_likes` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `project_id` on the `project_links` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `project_id` on the `project_segments` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `project_id` on the `project_tag_relations` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `project_tag_id` on the `project_tag_relations` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Added the required column `slug` to the `projects` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "TranslationJob" DROP CONSTRAINT "TranslationJob_projectId_fkey";

-- DropForeignKey
ALTER TABLE "project_comments" DROP CONSTRAINT "project_comments_project_id_fkey";

-- DropForeignKey
ALTER TABLE "project_images" DROP CONSTRAINT "project_images_project_id_fkey";

-- DropForeignKey
ALTER TABLE "project_likes" DROP CONSTRAINT "project_likes_project_id_fkey";

-- DropForeignKey
ALTER TABLE "project_links" DROP CONSTRAINT "project_links_project_id_fkey";

-- DropForeignKey
ALTER TABLE "project_segments" DROP CONSTRAINT "project_segments_project_id_fkey";

-- DropForeignKey
ALTER TABLE "project_tag_relations" DROP CONSTRAINT "project_tag_relations_project_id_fkey";

-- DropForeignKey
ALTER TABLE "project_tag_relations" DROP CONSTRAINT "project_tag_relations_project_tag_id_fkey";

-- DropForeignKey
ALTER TABLE "projects" DROP CONSTRAINT "projects_icon_image_id_fkey";

-- AlterTable
ALTER TABLE "TranslationJob" DROP COLUMN "projectId",
ADD COLUMN     "projectId" INTEGER;

-- AlterTable
ALTER TABLE "project_comments" DROP COLUMN "project_id",
ADD COLUMN     "project_id" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "project_images" DROP CONSTRAINT "project_images_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
DROP COLUMN "project_id",
ADD COLUMN     "project_id" INTEGER NOT NULL,
ADD CONSTRAINT "project_images_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "project_likes" DROP CONSTRAINT "project_likes_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
DROP COLUMN "project_id",
ADD COLUMN     "project_id" INTEGER NOT NULL,
ADD CONSTRAINT "project_likes_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "project_links" DROP CONSTRAINT "project_links_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
DROP COLUMN "project_id",
ADD COLUMN     "project_id" INTEGER NOT NULL,
ADD CONSTRAINT "project_links_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "project_segments" DROP COLUMN "project_id",
ADD COLUMN     "project_id" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "project_tag_relations" DROP CONSTRAINT "project_tag_relations_pkey",
DROP COLUMN "project_id",
ADD COLUMN     "project_id" INTEGER NOT NULL,
DROP COLUMN "project_tag_id",
ADD COLUMN     "project_tag_id" INTEGER NOT NULL,
ADD CONSTRAINT "project_tag_relations_pkey" PRIMARY KEY ("project_id", "project_tag_id");

-- AlterTable
ALTER TABLE "project_tags" DROP CONSTRAINT "project_tags_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
ADD CONSTRAINT "project_tags_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "projects" DROP CONSTRAINT "projects_pkey",
ADD COLUMN     "slug" TEXT NOT NULL,
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
DROP COLUMN "icon_image_id",
ADD COLUMN     "icon_image_id" INTEGER,
ADD CONSTRAINT "projects_pkey" PRIMARY KEY ("id");

-- CreateIndex
CREATE INDEX "project_comments_project_id_idx" ON "project_comments"("project_id");

-- CreateIndex
CREATE INDEX "project_segments_project_id_idx" ON "project_segments"("project_id");

-- CreateIndex
CREATE UNIQUE INDEX "project_segments_project_id_number_key" ON "project_segments"("project_id", "number");

-- CreateIndex
CREATE UNIQUE INDEX "project_segments_project_id_text_and_occurrence_hash_key" ON "project_segments"("project_id", "text_and_occurrence_hash");

-- CreateIndex
CREATE UNIQUE INDEX "projects_slug_key" ON "projects"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "projects_icon_image_id_key" ON "projects"("icon_image_id");

-- AddForeignKey
ALTER TABLE "TranslationJob" ADD CONSTRAINT "TranslationJob_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_icon_image_id_fkey" FOREIGN KEY ("icon_image_id") REFERENCES "project_images"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_links" ADD CONSTRAINT "project_links_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_images" ADD CONSTRAINT "project_images_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_tag_relations" ADD CONSTRAINT "project_tag_relations_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_tag_relations" ADD CONSTRAINT "project_tag_relations_project_tag_id_fkey" FOREIGN KEY ("project_tag_id") REFERENCES "project_tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_likes" ADD CONSTRAINT "project_likes_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_segments" ADD CONSTRAINT "project_segments_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_comments" ADD CONSTRAINT "project_comments_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
