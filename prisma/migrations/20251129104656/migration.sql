/*
  Warnings:

  - You are about to drop the `segment_locator_links` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `segment_locators` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "segment_locator_links" DROP CONSTRAINT "segment_locator_links_segment_id_fkey";

-- DropForeignKey
ALTER TABLE "segment_locator_links" DROP CONSTRAINT "segment_locator_links_segment_locator_id_fkey";

-- DropForeignKey
ALTER TABLE "segment_locators" DROP CONSTRAINT "segment_locators_content_id_fkey";

-- DropTable
DROP TABLE "segment_locator_links";

-- DropTable
DROP TABLE "segment_locators";

-- DropEnum
DROP TYPE "SegmentLocatorSystem";
