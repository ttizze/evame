/*
  Warnings:

  - You are about to drop the column `is_primary` on the `SegmentType` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."SegmentType" DROP COLUMN "is_primary";
