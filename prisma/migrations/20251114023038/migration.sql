/*
  Warnings:

  - You are about to drop the `segment_links` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "SegmentLocatorSystem" AS ENUM ('VRI_PARAGRAPH');

-- DropForeignKey
ALTER TABLE "segment_links" DROP CONSTRAINT "segment_links_from_segment_id_fkey";

-- DropForeignKey
ALTER TABLE "segment_links" DROP CONSTRAINT "segment_links_to_segment_id_fkey";

-- DropTable
DROP TABLE "segment_links";

-- CreateTable
CREATE TABLE "segment_locators" (
    "id" SERIAL NOT NULL,
    "content_id" INTEGER NOT NULL,
    "system" "SegmentLocatorSystem" NOT NULL,
    "value" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "segment_locators_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "segment_locator_links" (
    "segment_locator_id" INTEGER NOT NULL,
    "segment_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "segment_locator_links_pkey" PRIMARY KEY ("segment_locator_id","segment_id")
);

-- CreateIndex
CREATE INDEX "segment_locators_content_id_idx" ON "segment_locators"("content_id");

-- CreateIndex
CREATE UNIQUE INDEX "segment_locators_content_id_system_value_key" ON "segment_locators"("content_id", "system", "value");

-- CreateIndex
CREATE INDEX "segment_locator_links_segment_id_idx" ON "segment_locator_links"("segment_id");

-- AddForeignKey
ALTER TABLE "segment_locators" ADD CONSTRAINT "segment_locators_content_id_fkey" FOREIGN KEY ("content_id") REFERENCES "contents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "segment_locator_links" ADD CONSTRAINT "segment_locator_links_segment_locator_id_fkey" FOREIGN KEY ("segment_locator_id") REFERENCES "segment_locators"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "segment_locator_links" ADD CONSTRAINT "segment_locator_links_segment_id_fkey" FOREIGN KEY ("segment_id") REFERENCES "segments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
