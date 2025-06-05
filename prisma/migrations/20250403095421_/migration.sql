/*
  Warnings:

  - You are about to drop the column `projectId` on the `project_images` table. All the data in the column will be lost.
  - You are about to drop the column `projectId` on the `project_links` table. All the data in the column will be lost.
  - You are about to drop the column `type` on the `project_links` table. All the data in the column will be lost.
  - The primary key for the `project_tag_relations` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `projectId` on the `project_tag_relations` table. All the data in the column will be lost.
  - You are about to drop the column `projectTagId` on the `project_tag_relations` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `projects` table. All the data in the column will be lost.
  - Added the required column `project_id` to the `project_images` table without a default value. This is not possible if the table is not empty.
  - Added the required column `project_id` to the `project_links` table without a default value. This is not possible if the table is not empty.
  - Added the required column `project_id` to the `project_tag_relations` table without a default value. This is not possible if the table is not empty.
  - Added the required column `project_tag_id` to the `project_tag_relations` table without a default value. This is not possible if the table is not empty.
  - Added the required column `user_id` to the `projects` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "project_images" DROP CONSTRAINT "project_images_projectId_fkey";

-- DropForeignKey
ALTER TABLE "project_links" DROP CONSTRAINT "project_links_projectId_fkey";

-- DropForeignKey
ALTER TABLE "project_tag_relations" DROP CONSTRAINT "project_tag_relations_projectId_fkey";

-- DropForeignKey
ALTER TABLE "project_tag_relations" DROP CONSTRAINT "project_tag_relations_projectTagId_fkey";

-- DropForeignKey
ALTER TABLE "projects" DROP CONSTRAINT "projects_userId_fkey";

-- AlterTable
ALTER TABLE "project_images" DROP COLUMN "projectId",
ADD COLUMN     "project_id" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "project_links" DROP COLUMN "projectId",
DROP COLUMN "type",
ADD COLUMN     "description" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "project_id" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "project_tag_relations" DROP CONSTRAINT "project_tag_relations_pkey",
DROP COLUMN "projectId",
DROP COLUMN "projectTagId",
ADD COLUMN     "project_id" TEXT NOT NULL,
ADD COLUMN     "project_tag_id" TEXT NOT NULL,
ADD CONSTRAINT "project_tag_relations_pkey" PRIMARY KEY ("project_id", "project_tag_id");

-- AlterTable
ALTER TABLE "projects" DROP COLUMN "userId",
ADD COLUMN     "user_id" TEXT NOT NULL;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_links" ADD CONSTRAINT "project_links_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_images" ADD CONSTRAINT "project_images_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_tag_relations" ADD CONSTRAINT "project_tag_relations_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_tag_relations" ADD CONSTRAINT "project_tag_relations_project_tag_id_fkey" FOREIGN KEY ("project_tag_id") REFERENCES "project_tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;
