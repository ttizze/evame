/*
  Warnings:

  - The primary key for the `project_tag_relations` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `tagId` on the `project_tag_relations` table. All the data in the column will be lost.
  - Added the required column `projectTagId` to the `project_tag_relations` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "project_tag_relations" DROP CONSTRAINT "project_tag_relations_tagId_fkey";

-- AlterTable
ALTER TABLE "project_tag_relations" DROP CONSTRAINT "project_tag_relations_pkey",
DROP COLUMN "tagId",
ADD COLUMN     "projectTagId" TEXT NOT NULL,
ADD CONSTRAINT "project_tag_relations_pkey" PRIMARY KEY ("projectId", "projectTagId");

-- AddForeignKey
ALTER TABLE "project_tag_relations" ADD CONSTRAINT "project_tag_relations_projectTagId_fkey" FOREIGN KEY ("projectTagId") REFERENCES "project_tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;
