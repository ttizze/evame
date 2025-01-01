/*
  Warnings:

  - A unique constraint covering the columns `[guest_id,page_id]` on the table `like_pages` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "like_pages" ADD COLUMN     "guest_id" TEXT,
ALTER COLUMN "user_id" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "like_pages_guest_id_page_id_key" ON "like_pages"("guest_id", "page_id");
