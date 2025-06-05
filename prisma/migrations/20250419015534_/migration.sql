/*
  Warnings:

  - A unique constraint covering the columns `[icon_image_id]` on the table `projects` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "projects" ADD COLUMN     "icon_image_id" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "projects_icon_image_id_key" ON "projects"("icon_image_id");

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_icon_image_id_fkey" FOREIGN KEY ("icon_image_id") REFERENCES "project_images"("id") ON DELETE SET NULL ON UPDATE CASCADE;
